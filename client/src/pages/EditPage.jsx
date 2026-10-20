import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import TransactionForm from '../components/TransactionForm.jsx';

export default function EditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [detailResponse, statusesResponse] = await Promise.all([
        api.detail(id),
        api.statuses(),
      ]);
      setTransaction(detailResponse.data);
      setStatuses(statusesResponse.data);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(payload) {
    await api.update(id, { ...payload, version: transaction.version });
    navigate(`/view/${id}`, { state: { flash: 'Data berhasil diperbarui.' } });
  }

  function handleServerError(requestError) {
    if (requestError.code === 'VERSION_CONFLICT') {
      setConflict(requestError);
      return;
    }
    if (requestError.status !== 400) {
      setError(requestError);
    }
  }

  async function reloadLatest() {
    setConflict(null);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Edit Data</h2>
          <p className="text-sm text-slate-500">
            Ubah data transaksi <span className="font-mono">#{id}</span>.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Kembali
        </Link>
      </div>

      {conflict && (
        <ErrorBanner
          tone="warning"
          title="Tabrakan data terdeteksi (VERSION_CONFLICT)"
          error={conflict}
          onRetry={reloadLatest}
          retryLabel="Muat Ulang Data Terbaru"
        >
          <p className="mt-1">
            Kamu memegang versi{' '}
            <span className="font-mono font-semibold">
              {conflict.details?.expectedVersion}
            </span>
            , sedangkan data di server sudah menjadi versi{' '}
            <span className="font-mono font-semibold">
              {conflict.details?.currentVersion}
            </span>
            . Perubahanmu ditolak supaya tidak menimpa perubahan orang lain &mdash;
            muat ulang lalu ulangi pengeditan.
          </p>
        </ErrorBanner>
      )}

      {error && (
        <ErrorBanner
          error={error}
          onRetry={load}
          retryLabel="Muat Ulang"
          onDismiss={() => setError(null)}
        />
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Memuat data...
        </div>
      )}

      {!loading && transaction && (
        <TransactionForm
          key={transaction.version}
          initialValues={transaction}
          statuses={statuses}
          submitLabel="Simpan Perubahan"
          onSubmit={handleSubmit}
          onError={handleServerError}
          onCancel={() => navigate(`/view/${id}`)}
        />
      )}
    </div>
  );
}
