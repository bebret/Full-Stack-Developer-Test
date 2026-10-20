export class AppError extends Error {
  constructor({ status = 500, code = 'INTERNAL_ERROR', message, details, errors } = {}) {
    super(message ?? 'Terjadi kesalahan pada server.');
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.errors = errors;
  }
}

export const validationError = (errors) =>
  new AppError({
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Data yang dikirim tidak valid.',
    errors,
  });

export const invalidStatusError = (status) =>
  new AppError({
    status: 400,
    code: 'INVALID_STATUS',
    message: `Status ${status} tidak terdaftar pada tabel statuses.`,
    errors: [{ field: 'status', message: `status ${status} tidak terdaftar.` }],
  });

export const invalidIdError = (id) =>
  new AppError({
    status: 400,
    code: 'INVALID_ID',
    message: `Nilai id "${id}" tidak valid, harus berupa angka bulat.`,
  });

export const notFoundError = (id) =>
  new AppError({
    status: 404,
    code: 'NOT_FOUND',
    message: `Transaksi dengan id ${id} tidak ditemukan.`,
  });

export const duplicateKeyError = (id) =>
  new AppError({
    status: 409,
    code: 'DUPLICATE_KEY',
    message: `Transaksi dengan id ${id} sudah ada (tabrakan data).`,
    details: { conflictOn: 'transactions.id', conflictingId: id },
  });

export const versionConflictError = ({ expectedVersion, current }) =>
  new AppError({
    status: 409,
    code: 'VERSION_CONFLICT',
    message:
      'Data sudah diubah oleh proses/pengguna lain sejak terakhir dibaca ' +
      '(tabrakan data). Muat ulang data lalu ulangi perubahan.',
    details: {
      expectedVersion,
      currentVersion: current.version,
      updatedAt: current.updatedAt,
      current,
    },
  });

const POSTGRES_ERROR_MAP = {
  '23505': {
    status: 409,
    code: 'DUPLICATE_KEY',
    message: 'Data sudah ada (melanggar unique constraint).',
  },
  '23503': {
    status: 409,
    code: 'FOREIGN_KEY_VIOLATION',
    message: 'Referensi ke data lain tidak valid (foreign key).',
  },
  '23502': {
    status: 400,
    code: 'NOT_NULL_VIOLATION',
    message: 'Ada kolom wajib yang belum diisi.',
  },
  '23514': {
    status: 400,
    code: 'CHECK_VIOLATION',
    message: 'Nilai melanggar aturan kolom (check constraint).',
  },
  '22P02': {
    status: 400,
    code: 'INVALID_INPUT',
    message: 'Format nilai tidak sesuai tipe kolom.',
  },
  '22007': {
    status: 400,
    code: 'INVALID_INPUT',
    message: 'Format tanggal/timestamp tidak valid.',
  },
  '22003': {
    status: 400,
    code: 'INVALID_INPUT',
    message: 'Nilai numerik di luar jangkauan kolom.',
  },
  '40001': {
    status: 409,
    code: 'SERIALIZATION_FAILURE',
    message: 'Terjadi tabrakan transaksi database (serialization failure), silakan ulangi.',
  },
  '40P01': {
    status: 409,
    code: 'DEADLOCK_DETECTED',
    message: 'Deadlock terdeteksi di database, silakan ulangi.',
  },
  '57014': {
    status: 503,
    code: 'QUERY_TIMEOUT',
    message: 'Query database melebihi batas waktu.',
  },
};

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EHOSTUNREACH',
  '57P01',
  '57P02',
  '57P03',
  '08006',
  '08001',
]);

const CONNECTION_MESSAGE_PATTERNS = [
  /connection terminated/i,
  /terminating connection/i,
  /client has encountered a connection error/i,
  /connection error/i,
  /socket hang up/i,
  /server closed the connection/i,
  /connection ended unexpectedly/i,
];

export function mapDatabaseError(error) {
  const code = error?.code;
  const message = error?.message ?? '';

  if (code && POSTGRES_ERROR_MAP[code]) {
    return new AppError({
      ...POSTGRES_ERROR_MAP[code],
      details: { pgCode: code, pgDetail: error.detail ?? null },
    });
  }

  if (code && CONNECTION_ERROR_CODES.has(code)) {
    return new AppError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database tidak dapat dihubungi. Pastikan PostgreSQL berjalan.',
      details: { pgCode: code },
    });
  }

  if (CONNECTION_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
    return new AppError({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Koneksi ke database terputus. Pastikan PostgreSQL berjalan.',
      details: { pgCode: code ?? null, reason: message },
    });
  }

  return null;
}

export function mapHttpBodyError(error) {
  if (error?.type === 'entity.parse.failed') {
    return new AppError({
      status: 400,
      code: 'MALFORMED_JSON',
      message: 'Body request bukan JSON yang valid.',
      details: { reason: error.message },
    });
  }

  if (error?.type === 'entity.too.large') {
    return new AppError({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Ukuran body request terlalu besar.',
    });
  }

  return null;
}
