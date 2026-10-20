import { formatNumber } from '../lib/format.js';

function Card({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Total Transaksi" value={formatNumber(summary.total)} />
      <Card label="Total Amount" value={formatNumber(summary.totalAmount)} />
      <Card label="Success" value={formatNumber(summary.success)} accent="text-emerald-600" />
      <Card label="Failed" value={formatNumber(summary.failed)} accent="text-rose-600" />
    </section>
  );
}
