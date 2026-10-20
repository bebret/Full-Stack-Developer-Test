import { useState } from 'react';
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/format.js';

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

function Field({ label, hint, error, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

export default function TransactionForm({
  initialValues,
  statuses,
  submitLabel,
  onSubmit,
  onCancel,
  onError,
}) {
  const [values, setValues] = useState(() => ({
    productID: initialValues?.productID ?? '',
    productName: initialValues?.productName ?? '',
    amount: initialValues?.amount ?? '',
    customerName: initialValues?.customerName ?? '',
    status: String(initialValues?.status ?? statuses?.[0]?.id ?? 0),
    transactionDate: toDateTimeLocal(initialValues?.transactionDate),
    createBy: initialValues?.createBy ?? '',
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function setField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      await onSubmit({
        productID: values.productID.trim(),
        productName: values.productName.trim(),
        amount: Number(values.amount),
        customerName: values.customerName.trim(),
        status: Number(values.status),
        transactionDate: fromDateTimeLocal(values.transactionDate),
        createBy: values.createBy.trim(),
      });
    } catch (error) {
      const fieldErrors = {};
      for (const item of error.errors ?? []) {
        fieldErrors[item.field] = item.message;
      }
      if (Object.keys(fieldErrors).length === 0 && !onError) {
        fieldErrors._form = error.message;
      }
      setErrors(fieldErrors);
      onError?.(error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {errors._form && (
        <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {errors._form}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Product ID" error={errors.productID}>
          <input
            className={inputClass}
            value={values.productID}
            onChange={(event) => setField('productID', event.target.value)}
            placeholder="10001"
            required
          />
        </Field>

        <Field label="Product Name" error={errors.productName}>
          <input
            className={inputClass}
            value={values.productName}
            onChange={(event) => setField('productName', event.target.value)}
            placeholder="Test 1"
            required
          />
        </Field>

        <Field label="Amount" error={errors.amount} hint="Angka, contoh 1000">
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(event) => setField('amount', event.target.value)}
            placeholder="1000"
            required
          />
        </Field>

        <Field label="Customer Name" error={errors.customerName}>
          <input
            className={inputClass}
            value={values.customerName}
            onChange={(event) => setField('customerName', event.target.value)}
            placeholder="abc"
          />
        </Field>

        <Field label="Status" error={errors.status}>
          <select
            className={inputClass}
            value={values.status}
            onChange={(event) => setField('status', event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Transaction Date"
          error={errors.transactionDate}
          hint="Menentukan grouping tahun & bulan"
        >
          <input
            className={inputClass}
            type="datetime-local"
            value={values.transactionDate}
            onChange={(event) => setField('transactionDate', event.target.value)}
            required
          />
        </Field>

        <Field label="Create By" error={errors.createBy}>
          <input
            className={inputClass}
            value={values.createBy}
            onChange={(event) => setField('createBy', event.target.value)}
            placeholder="abc"
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Menyimpan...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
