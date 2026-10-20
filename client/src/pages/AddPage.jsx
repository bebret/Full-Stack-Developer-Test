import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import TransactionForm from '../components/TransactionForm.jsx';

export default function AddPage() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .statuses()
      .then((response) => setStatuses(response.data))
      .catch((requestError) => setError(requestError));
  }, []);

  async function handleSubmit(payload) {
    const response = await api.create(payload);
    navigate(`/view/${response.data.id}`, { state: { flash: 'Data berhasil ditambahkan.' } });
  }

  function handleServerError(requestError) {
    if (requestError.status !== 400) {
      setError(requestError);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tambah Data</h2>
          <p className="text-sm text-slate-500">
            Lengkapi data transaksi, lalu simpan ke database.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Kembali
        </Link>
      </div>

      {error && (
        <ErrorBanner
          error={error}
          onRetry={() => window.location.reload()}
          retryLabel="Muat Ulang Halaman"
          onDismiss={() => setError(null)}
        />
      )}

      <TransactionForm
        statuses={statuses}
        submitLabel="Simpan Data"
        onSubmit={handleSubmit}
        onError={handleServerError}
        onCancel={() => navigate('/')}
      />
    </div>
  );
}
