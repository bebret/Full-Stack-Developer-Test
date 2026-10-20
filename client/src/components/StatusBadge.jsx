const STYLES = {
  0: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  1: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export default function StatusBadge({ status, name }) {
  const label = name ?? `STATUS ${status}`;
  const style = STYLES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
