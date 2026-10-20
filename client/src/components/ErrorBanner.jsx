const TONES = {
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function ErrorBanner({
  title,
  error,
  tone = 'error',
  children,
  onRetry,
  retryLabel = 'Coba Lagi',
  onDismiss,
}) {
  if (!title && !error) return null;

  const message = title ?? error?.message ?? 'Terjadi kesalahan.';
  const fieldErrors = error?.errors ?? [];

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${TONES[tone] ?? TONES.error}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">{message}</p>

          {fieldErrors.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {fieldErrors.map((item) => (
                <li key={`${item.field}-${item.message}`}>
                  <span className="font-mono text-xs">{item.field}</span> &mdash; {item.message}
                </li>
              ))}
            </ul>
          )}

          {children}

          {(error?.code || error?.requestId) && (
            <p className="mt-2 break-all font-mono text-[11px] opacity-70">
              {error?.code && <span>code: {error.code}</span>}
              {error?.code && error?.requestId && <span> &middot; </span>}
              {error?.requestId && <span>requestId: {error.requestId}</span>}
            </p>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-md bg-white/70 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-current transition hover:bg-white"
            >
              {retryLabel}
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup"
            className="rounded px-2 text-lg leading-none opacity-60 transition hover:opacity-100"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
