const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

function normalizeDateTime(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DATETIME_PATTERN.test(trimmed)) return null;
  const normalized = trimmed.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export function validateTransaction(body = {}) {
  const errors = [];
  const value = {};

  const productID = body.productID ?? body.product_id;
  if (typeof productID !== 'string' || productID.trim() === '') {
    errors.push({ field: 'productID', message: 'productID wajib diisi.' });
  } else {
    value.productID = productID.trim();
  }

  const productName = body.productName ?? body.product_name;
  if (typeof productName !== 'string' || productName.trim() === '') {
    errors.push({ field: 'productName', message: 'productName wajib diisi.' });
  } else {
    value.productName = productName.trim();
  }

  const rawAmount = String(body.amount ?? '').trim();
  const amount = Number(rawAmount);
  if (rawAmount === '' || Number.isNaN(amount) || amount < 0) {
    errors.push({ field: 'amount', message: 'amount harus berupa angka >= 0.' });
  } else {
    value.amount = amount;
  }

  const customerName = body.customerName ?? body.customer_name;
  value.customerName =
    typeof customerName === 'string' && customerName.trim() !== ''
      ? customerName.trim()
      : null;

  const status = Number(body.status);
  if (!Number.isInteger(status)) {
    errors.push({ field: 'status', message: 'status wajib berupa angka.' });
  } else {
    value.status = status;
  }

  const transactionDate = normalizeDateTime(
    body.transactionDate ?? body.transaction_date,
  );
  if (!transactionDate) {
    errors.push({
      field: 'transactionDate',
      message: 'transactionDate tidak valid, gunakan format YYYY-MM-DD HH:MM:SS.',
    });
  } else {
    value.transactionDate = transactionDate;
  }

  const createBy = body.createBy ?? body.create_by;
  value.createBy =
    typeof createBy === 'string' && createBy.trim() !== ''
      ? createBy.trim()
      : null;

  const rawCreateOn = body.createOn ?? body.create_on;
  if (rawCreateOn === undefined || rawCreateOn === null || rawCreateOn === '') {
    value.createOn = null;
  } else {
    const createOn = normalizeDateTime(rawCreateOn);
    if (!createOn) {
      errors.push({
        field: 'createOn',
        message: 'createOn tidak valid, gunakan format YYYY-MM-DD HH:MM:SS.',
      });
    } else {
      value.createOn = createOn;
    }
  }

  const rawId = body.id;
  if (rawId === undefined || rawId === null || rawId === '') {
    value.id = null;
  } else {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      errors.push({ field: 'id', message: 'id harus berupa angka bulat positif.' });
    } else {
      value.id = id;
    }
  }

  const rawVersion = body.version;
  if (rawVersion === undefined || rawVersion === null || rawVersion === '') {
    value.version = null;
  } else {
    const version = Number(rawVersion);
    if (!Number.isInteger(version) || version < 1) {
      errors.push({ field: 'version', message: 'version harus berupa angka bulat >= 1.' });
    } else {
      value.version = version;
    }
  }

  return { value, errors };
}
