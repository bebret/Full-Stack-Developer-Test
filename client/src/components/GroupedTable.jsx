import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayValue, formatNumber } from '../lib/format.js';
import StatusBadge from './StatusBadge.jsx';

const COLUMNS = [
  'ID',
  'Product ID',
  'Product Name',
  'Amount',
  'Customer',
  'Status',
  'Transaction Date',
  'Create By',
  'Create On',
  'Aksi',
];

export default function GroupedTable({ groups, statuses, onDelete }) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const statusName = (id) => statuses.find((status) => status.id === id)?.name;

  function toggle(key) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Tidak ada data yang cocok dengan filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-100">
              {COLUMNS.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((yearGroup) => {
              const yearKey = `year-${yearGroup.year}`;
              const yearCollapsed = collapsed.has(yearKey);

              return (
                <Fragment key={yearKey}>
                  <tr className="bg-slate-200">
                    <td colSpan={COLUMNS.length} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggle(yearKey)}
                        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-slate-800"
                      >
                        <span className="text-slate-600">{yearCollapsed ? '▸' : '▾'}</span>
                        Tahun {yearGroup.year}
                        <span className="ml-auto text-xs font-medium text-slate-600">
                          {formatNumber(yearGroup.count)} transaksi &middot; total{' '}
                          {formatNumber(yearGroup.totalAmount)}
                        </span>
                      </button>
                    </td>
                  </tr>

                  {!yearCollapsed &&
                    yearGroup.months.map((month) => {
                      const monthKey = `${yearKey}-month-${month.month}`;
                      const monthCollapsed = collapsed.has(monthKey);

                      return (
                        <Fragment key={monthKey}>
                          <tr className="bg-slate-50">
                            <td colSpan={COLUMNS.length} className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => toggle(monthKey)}
                                className="flex w-full items-center gap-2 pl-4 text-left text-sm font-medium text-slate-700"
                              >
                                <span className="text-slate-500">
                                  {monthCollapsed ? '▸' : '▾'}
                                </span>
                                {month.monthName} {month.year}
                                <span className="ml-auto text-xs font-normal text-slate-500">
                                  {formatNumber(month.count)} transaksi &middot; total{' '}
                                  {formatNumber(month.totalAmount)}
                                </span>
                              </button>
                            </td>
                          </tr>

                          {!monthCollapsed &&
                            month.transactions.map((transaction) => (
                              <tr
                                key={transaction.id}
                                className="border-b border-slate-100 transition hover:bg-slate-50"
                              >
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500">
                                  {transaction.id}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                                  {displayValue(transaction.productID)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
                                  {displayValue(transaction.productName)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                                  {formatNumber(transaction.amount)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  {displayValue(transaction.customerName)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  <StatusBadge
                                    status={transaction.status}
                                    name={statusName(transaction.status)}
                                  />
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                                  {displayValue(transaction.transactionDate)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                                  {displayValue(transaction.createBy)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                                  {displayValue(transaction.createOn)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2">
                                  <div className="flex gap-2">
                                    <Link
                                      to={`/view/${transaction.id}`}
                                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                                    >
                                      Detail
                                    </Link>
                                    <Link
                                      to={`/edit/${transaction.id}`}
                                      className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-200"
                                    >
                                      Edit
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => onDelete(transaction)}
                                      className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-200"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
