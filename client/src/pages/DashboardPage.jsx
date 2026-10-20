import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FilterBar from '../components/FilterBar.jsx';
import GroupedTable from '../components/GroupedTable.jsx';
import SummaryCards from '../components/SummaryCards.jsx';

const EMPTY_FILTERS = { q: '', year: '', month: '', status: '' };

export default function DashboardPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .statuses()
      .then((response) => setStatuses(response.data))
      .catch(() => setStatuses([]));

    api
      .grouped()
      .then((response) => {
        const uniqueYears = [...new Set(response.data.map((item) => item.year))];
        setYears(uniqueYears.sort((a, b) => b - a));
      })
      .catch(() => setYears([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.q.trim() !== '') params.q = filters.q.trim();
    if (filters.year !== '') params.year = filters.year;
    if (filters.month !== '') params.month = filters.month;
    if (filters.status !== '') params.status = filters.status;

    try {
      const [groupedResponse, summaryResponse] = await Promise.all([
        api.grouped(params),
        api.summary(params),
      ]);
      setGroups(groupedResponse.data);
      setSummary(summaryResponse.data);
    } catch (requestError) {
      setError(requestError);
      setGroups([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterChange(patch) {
    setFilters((previous) => ({ ...previous, ...patch }));
  }

  async function handleDelete(transaction) {
    const confirmed = window.confirm(
      `Hapus transaksi #${transaction.id} - ${transaction.productName}?`,
    );
    if (!confirmed) return;

    try {
      await api.remove(transaction.id);
      await load();
    } catch (deleteError) {
      setError(deleteError);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard Transaksi</h2>
          <p className="text-sm text-slate-500">
            Data digrouping berdasarkan tahun dan bulan transaksi.
          </p>
        </div>
        <Link
          to="/add"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Tambah Data
        </Link>
      </div>

      <SummaryCards summary={summary} />

      <FilterBar
        filters={filters}
        years={years}
        statuses={statuses}
        onChange={handleFilterChange}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      {error && (
        <ErrorBanner error={error} onRetry={load} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Memuat data...
        </div>
      ) : (
        <GroupedTable groups={groups} statuses={statuses} onDelete={handleDelete} />
      )}
    </div>
  );
}
