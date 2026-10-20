import { MONTH_NAMES } from '../lib/format.js';

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

export default function FilterBar({ filters, years, statuses, onChange, onReset }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cari
          </span>
          <input
            type="search"
            placeholder="Product name, product ID, atau customer"
            className={inputClass}
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tahun
          </span>
          <select
            className={inputClass}
            value={filters.year}
            onChange={(event) => onChange({ year: event.target.value })}
          >
            <option value="">Semua tahun</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Bulan
          </span>
          <select
            className={inputClass}
            value={filters.month}
            onChange={(event) => onChange({ month: event.target.value })}
          >
            <option value="">Semua bulan</option>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              className={inputClass}
              value={filters.status}
              onChange={(event) => onChange({ status: event.target.value })}
            >
              <option value="">Semua status</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onReset}
            className="h-[38px] self-end rounded-md border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
