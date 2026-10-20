import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatNumber } from '../lib/format.js';

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:items-center">
      <span className="w-48 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>
        {value ?? '-'}
      </span>
    </div>
  );
}

export default function DetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [transaction, setTransaction] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const flash = location.state?.flash;
  const loadDetail = useCallback(async () => {
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
      setTransaction(null);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Hapus transaksi #${transaction.id} - ${transaction.productName}?`,
    );
    if (!confirmed) return;

    try {
      await api.remove(transaction.id);
      window.location.href = '/';
    } catch (deleteError) {
      setError(deleteError);
    }
  }

  const statusName = statuses.find((status) => status.id === transaction?.status)?.name;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Detail Data</h2>
          <p className="text-sm text-slate-500">
            Data lengkap transaksi <span className="font-mono">#{id}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Kembali
          </Link>
          {transaction && (
            <Link
              to={`/edit/${transaction.id}`}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {flash && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {flash}
        </p>
      )}

      {error && (
        <ErrorBanner
          tone={error.code === 'NOT_FOUND' ? 'warning' : 'error'}
          error={error}
          onRetry={error.code === 'NOT_FOUND' ? undefined : loadDetail}
          onDismiss={() => setError(null)}
        >
          {error.code === 'NOT_FOUND' && (
            <p className="mt-1">
              Data mungkin sudah dihapus. <Link to="/" className="underline">Kembali ke dashboard</Link>.
            </p>
          )}
        </ErrorBanner>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Memuat data...
        </div>
      )}

      {!loading && transaction && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={transaction.status} name={statusName} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Grouping: {transaction.monthName} {transaction.year}
            </span>
          </div>

          <Row label="ID" value={transaction.id} mono />
          <Row label="Product ID" value={transaction.productID} mono />
          <Row label="Product Name" value={transaction.productName} />
          <Row label="Amount" value={formatNumber(transaction.amount)} />
          <Row label="Customer Name" value={transaction.customerName} />
          <Row label="Status" value={`${transaction.status} (${statusName ?? '-'})`} />
          <Row label="Transaction Date" value={transaction.transactionDate} mono />
          <Row label="Tahun" value={transaction.year} />
          <Row label="Bulan" value={`${transaction.month} (${transaction.monthName})`} />
          <Row label="Create By" value={transaction.createBy} />
          <Row label="Create On" value={transaction.createOn} mono />
          <Row label="Version" value={transaction.version} mono />
          <Row label="Updated At" value={transaction.updatedAt} mono />

          <div className="mt-5">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200"
            >
              Hapus Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
