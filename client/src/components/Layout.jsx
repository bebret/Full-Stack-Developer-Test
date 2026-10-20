import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/add', label: 'Tambah Data' },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Transaction App</h1>
            <p className="text-xs text-slate-400">
              Grid table ter-grouping per tahun &amp; bulan &middot; React + Express + PostgreSQL
            </p>
          </div>
          <nav className="flex gap-2">
            {navItems.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-500">
        Data sumber: <span className="font-mono">viewData.json</span> &middot; API:{' '}
        <span className="font-mono">http://localhost:3001/api</span>
      </footer>
    </div>
  );
}
