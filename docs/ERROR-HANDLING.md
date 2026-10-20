# Error Handling & Tabrakan Data

Dokumen ini menjelaskan bagaimana aplikasi menangani error, khususnya **tabrakan data (data conflict)**, lengkap dengan bukti log dan screenshot untuk demo.

---

## 1. Prinsip

1. **Satu format respons** untuk semua error (JSON, konsisten).
2. **Kode error stabil** (`code`) yang bisa dicek program, bukan sekadar teks pesan.
3. **Klasifikasi jelas**: 400 (input salah) · 404 (tidak ada) · 409 (tabrakan data) · 413 (payload besar) · 503 (DB mati) · 500 (tak terduga).
4. **`requestId`** di setiap respons error dan di header `X-Request-Id`, untuk mengorelasikan respons dengan baris log.
5. **Log terstruktur** (JSON per baris) ke console **dan** file `server/logs/app.log`.
6. **Tabrakan data ditolak, bukan ditimpa diam-diam** (optimistic locking).

## 2. Format Respons Error

```json
{
  "error": "Data yang dikirim tidak valid.",
  "code": "VALIDATION_ERROR",
  "requestId": "548d7a94-dffa-4192-933c-80c13317799c",
  "details": { "pgCode": "23505" },
  "errors": [{ "field": "productID", "message": "productID wajib diisi." }]
}
```

- `errors[]` hanya ada untuk error validasi per field (dipakai form UI).
- `details` berisi konteks tambahan (kode PostgreSQL, versi, data terbaru, dsb).

## 3. Katalog Kode Error

| `code` | HTTP | Penyebab | Dipicu oleh |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Field wajib kosong / format salah | `POST`/`PUT` dengan payload tidak lolos validasi |
| `MALFORMED_JSON` | 400 | Body bukan JSON valid | Body rusak (`{"a":,}`) |
| `INVALID_ID` | 400 | `id` bukan angka bulat positif | `GET /transactions/abc` |
| `INVALID_STATUS` | 400 | `status` tidak ada di tabel `statuses` | `status: 9` |
| `INVALID_INPUT` | 400 | Nilai tidak cocok tipe kolom (dari PostgreSQL) | `22P02`, `22007`, `22003` |
| `NOT_FOUND` | 404 | Data dengan id tersebut tidak ada | `GET`/`PUT`/`DELETE` id tidak ada |
| `ENDPOINT_NOT_FOUND` | 404 | Path tidak terdaftar | `/api/transactions/1/extra` |
| **`DUPLICATE_KEY`** | **409** | **Tabrakan data: primary key / unique sudah dipakai** | `POST` dengan `id` yang sudah ada (`23505`) |
| **`VERSION_CONFLICT`** | **409** | **Tabrakan data: record sudah diubah pihak lain** | `PUT` memakai `version` lama |
| `FOREIGN_KEY_VIOLATION` | 409 | Referensi ke tabel lain tidak valid | `23503` |
| `SERIALIZATION_FAILURE` | 409 | Tabrakan transaksi di database | `40001` |
| `DEADLOCK_DETECTED` | 409 | Deadlock | `40P01` |
| `PAYLOAD_TOO_LARGE` | 413 | Body request kebesaran | — |
| `SERVICE_UNAVAILABLE` | 503 | Database tidak dapat dihubungi / koneksi terputus | PostgreSQL mati |
| `QUERY_TIMEOUT` | 503 | Query melebihi batas waktu | `57014` |
| `INTERNAL_ERROR` | 500 | Kesalahan tak terduga | Bug / error tak terklasifikasi |

Daftar ini bisa diambil langsung dari API: `GET /api/error-catalog`.

## 4. Tabrakan Data (dua jenis)

### 4.1 `DUPLICATE_KEY` — data yang sama dibuat dua kali

`POST /api/transactions` menerima `id` opsional (berguna untuk import). Jika `id` sudah dipakai:

```json
{
  "error": "Transaksi dengan id 1372 sudah ada (tabrakan data).",
  "code": "DUPLICATE_KEY",
  "requestId": "1d03a95c-2b4b-479c-91ae-18082c6789c6",
  "details": { "conflictOn": "transactions.id", "conflictingId": 1372 }
}
```

PostgreSQL juga tetap jadi jaring pengaman: pelanggaran `unique`/`primary key` (`23505`) dipetakan otomatis ke `409 DUPLICATE_KEY`.

### 4.2 `VERSION_CONFLICT` — dua orang mengedit baris yang sama

Setiap baris `transactions` punya kolom `version` (mulai dari `1`, naik setiap `PUT`).

1. Term A & B membuka halaman Edit → keduanya memegang `version = 8`.
2. Term A menyimpan lebih dulu → server menjadi `version = 9`.
3. Term B menyimpan → server menolak:

```json
{
  "error": "Data sudah diubah oleh proses/pengguna lain sejak terakhir dibaca (tabrakan data). Muat ulang data lalu ulangi perubahan.",
  "code": "VERSION_CONFLICT",
  "requestId": "5fc422b3-fd07-4e34-873c-0beee5f86902",
  "details": {
    "expectedVersion": 9,
    "currentVersion": 10,
    "updatedAt": "2026-10-20 15:39:15.348528+00",
    "current": { "id": 1372, "version": 10, "...": "..." }
  }
}
```

`details.current` berisi data terbaru di server, sehingga klien bisa menawarkan "muat ulang lalu ulangi".

**Reproduksi manual (2 terminal):**

```bash
# Terminal A - baca versi
curl http://localhost:3001/api/transactions/1372

# Terminal B - ubah data lebih dulu (versi naik)
curl -X PUT http://localhost:3001/api/transactions/1372 \
  -H "Content-Type: application/json" \
  -d '{"productID":"10001","productName":"Test 1","amount":1000,"customerName":"abc","status":0,"transactionDate":"2022-07-10 11:14:52","version":8}'

# Terminal A - simpan dengan versi lama -> 409 VERSION_CONFLICT
curl -X PUT http://localhost:3001/api/transactions/1372 \
  -H "Content-Type: application/json" \
  -d '{"productID":"10001","productName":"Test 1","amount":1000,"customerName":"abc","status":0,"transactionDate":"2022-07-10 11:14:52","version":8}'
```

**Perilaku UI:** halaman Edit menampilkan banner oranye berisi versi yang dipegang vs versi server, plus tombol **Muat Ulang Data Terbaru**. Perubahan tidak pernah menimpa perubahan orang lain.

## 5. Alur Penanganan di Server

```
request
  └─ middleware requestId + timer  → req.id, header X-Request-Id
  └─ express.json()                → gagal? MALFORMED_JSON / PAYLOAD_TOO_LARGE
  └─ routes                        → throw AppError(...)
  └─ 404 handler                   → ENDPOINT_NOT_FOUND
  └─ error handler
       AppError?          → pakai apa adanya
       body-parser error? → mapHttpBodyError()
       error PostgreSQL?  → mapDatabaseError()   (23505, 57P01, ECONNREFUSED, ...)
       lainnya            → INTERNAL_ERROR 500
     └─ logger.error('error handled', {...})
```

Penanganan agar server **tidak mati** saat database bermasalah:

- `pool.on('error', ...)` — event `error` pada koneksi idle (mis. `57P01 terminating connection due to administrator command`) hanya dicatat, tidak melempar proses.
- `connectionTimeoutMillis: 5000` — gagal cepat ketika database tidak bisa dihubungi.
- Error yang tidak punya `code` tetapi pesannya berpola koneksi terputus (`Connection terminated unexpectedly`, `socket hang up`, dst.) tetap dipetakan ke **503 `SERVICE_UNAVAILABLE`**.

## 6. Logging

- Lokasi: `server/logs/app.log` (JSON per baris; juga tampil di console). Folder ini di-`gitignore`.
- Tiga jenis baris:

| Pesan | Level | Arti |
| --- | --- | --- |
| `request ok` | info | Request sukses (2xx/3xx) |
| `request rejected` | warn | Ditolak (4xx) |
| `error handled` | error | Error + konteks lengkap |
| `idle database client error` | error | Koneksi idle ke DB terputus |

Contoh isi log:

```json
{"time":"2026-10-20T15:39:15.340Z","level":"warn","message":"request rejected","requestId":"8766921f-ac23-4259-95c0-fa28a7a0b243","method":"POST","path":"/api/transactions","status":409,"durationMs":4}
{"time":"2026-10-20T15:39:15.353Z","level":"warn","message":"request rejected","requestId":"5fc422b3-fd07-4e34-873c-0beee5f86902","method":"PUT","path":"/api/transactions/1372","status":409,"durationMs":2}
{"time":"2026-10-20T15:39:15.302Z","level":"error","message":"Data sudah diubah oleh proses/pengguna lain sejak terakhir dibaca (tabrakan data). Muat ulang data lalu ulangi perubahan.","requestId":"5fc422b3-fd07-4e34-873c-0beee5f86902","method":"PUT","path":"/api/transactions/1372","code":"VERSION_CONFLICT","status":409}
```

Lihat juga hasil lengkap demo di [`docs/error-demo-output.txt`](error-demo-output.txt).

## 7. Tampilan di UI

| Screenshot | Skenario |
| --- | --- |
| ![Validasi](../docs/screenshots/errors/01-validation-error.png) | `VALIDATION_ERROR` - pesan merah per field di halaman Tambah |
| ![Tabrakan data](../docs/screenshots/errors/02-version-conflict.png) | `VERSION_CONFLICT` - banner + tombol "Muat Ulang Data Terbaru" |
| ![Tidak ditemukan](../docs/screenshots/errors/03-not-found.png) | `NOT_FOUND` - banner kuning + tautan kembali |
| ![Database mati](../docs/screenshots/errors/04-database-down.png) | `SERVICE_UNAVAILABLE` - DB dimatikan saat aplikasi berjalan |

Semua banner menampilkan `code` dan `requestId` sehingga bisa dilacak ke baris log.

## 8. Demo Live (urutan yang disarankan)

```bash
# 0. Pastikan PostgreSQL + API + UI jalan
npm run db:up
npm run dev            # terminal 1

# 1. Tampilkan katalog error + reproduksi semua skenario (terminal 2)
npm run demo:errors

# 2. Tampilkan isi log yang dihasilkan
Get-Content server/logs/app.log -Tail 15

# 3. (opsional) Tangkap ulang screenshot UI error
npm run capture:errors
```

`npm run demo:errors` memicu berurutan: `VALIDATION_ERROR`, `MALFORMED_JSON`, `INVALID_STATUS`,
`NOT_FOUND`, `INVALID_ID`, `DUPLICATE_KEY`, `VERSION_CONFLICT`, `ENDPOINT_NOT_FOUND`,
lalu mencetak 10 baris log terakhir. Hasilnya juga disimpan ke `docs/error-demo-output.txt`.

Untuk mendemokan `SERVICE_UNAVAILABLE` saat presentasi:

```bash
docker compose stop db      # semua request jadi 503, API tetap hidup
docker compose start db     # otomatis pulih tanpa restart API
```

## 9. Bug yang Ditemukan & Diperbaiki Selama Pengujian

| # | Temuan | Dampak | Perbaikan |
| --- | --- | --- | --- |
| 1 | Event `error` pada koneksi idle `pg` tidak ditangani (`57P01 terminating connection due to administrator command`) | **Proses API mati** saat PostgreSQL distop; proxy mengembalikan 502 | `pool.on('error')` di `server/src/db.js` |
| 2 | Error `Connection terminated unexpectedly` tidak punya properti `code` | Dikembalikan sebagai `500 INTERNAL_ERROR`, bukan `503` | Pola pesan koneksi dipetakan ke `SERVICE_UNAVAILABLE` di `errors.js` |
| 3 | `MALFORMED_JSON` tidak menyertakan `requestId` | Sulit dilacak di log | Middleware `requestId` dipindah ke sebelum `express.json()` |
| 4 | Data CRUD dari API lain bisa menimpa perubahan pengguna | Kehilangan data (lost update) | Kolom `version` + `409 VERSION_CONFLICT` |
