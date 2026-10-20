import { Router } from 'express';
import { query } from '../db.js';
import {
  duplicateKeyError,
  invalidIdError,
  invalidStatusError,
  notFoundError,
  validationError,
  versionConflictError,
} from '../errors.js';
import { toTransaction } from '../mappers.js';
import { validateTransaction } from '../validate.js';

const router = Router();

const SELECT_COLUMNS = `id, product_id, product_name, amount, customer_name,
  status, transaction_date, create_by, create_on, version, updated_at`;

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function buildFilters(queryParams = {}) {
  const clauses = [];
  const params = [];

  if (queryParams.year !== undefined && queryParams.year !== '') {
    params.push(Number(queryParams.year));
    clauses.push(`date_part('year', transaction_date) = $${params.length}::int`);
  }

  if (queryParams.month !== undefined && queryParams.month !== '') {
    params.push(Number(queryParams.month));
    clauses.push(`date_part('month', transaction_date) = $${params.length}::int`);
  }

  if (queryParams.status !== undefined && queryParams.status !== '') {
    params.push(Number(queryParams.status));
    clauses.push(`status = $${params.length}`);
  }

  if (queryParams.q !== undefined && String(queryParams.q).trim() !== '') {
    params.push(`%${String(queryParams.q).trim().toLowerCase()}%`);
    clauses.push(
      `(lower(product_name) LIKE $${params.length}
        OR lower(product_id) LIKE $${params.length}
        OR lower(COALESCE(customer_name, '')) LIKE $${params.length})`,
    );
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function splitPeriod(transactionDate) {
  const [datePart = ''] = String(transactionDate ?? '').split(' ');
  const [year, month] = datePart.split('-').map(Number);
  return { year, month };
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw invalidIdError(rawId);
  }
  return id;
}

async function assertStatusExists(status) {
  const { rowCount } = await query('SELECT 1 FROM statuses WHERE id = $1', [status]);
  if (rowCount === 0) {
    throw invalidStatusError(status);
  }
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${SELECT_COLUMNS} FROM transactions WHERE id = $1`,
    [id],
  );
  return rows[0] ? toTransaction(rows[0]) : null;
}

function withPeriod(transaction) {
  const { year, month } = splitPeriod(transaction.transactionDate);
  return {
    ...transaction,
    year,
    month,
    monthName: MONTH_NAMES[month - 1] ?? String(month),
  };
}

router.get('/grouped', async (req, res, next) => {
  try {
    const { where, params } = buildFilters(req.query);
    const { rows } = await query(
      `SELECT ${SELECT_COLUMNS} FROM transactions ${where}
       ORDER BY transaction_date DESC, id DESC`,
      params,
    );

    const years = new Map();

    for (const row of rows) {
      const transaction = toTransaction(row);
      const { year, month } = splitPeriod(transaction.transactionDate);

      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);

      if (!months.has(month)) {
        months.set(month, {
          year,
          month,
          monthName: MONTH_NAMES[month - 1] ?? String(month),
          count: 0,
          totalAmount: 0,
          transactions: [],
        });
      }

      const group = months.get(month);
      group.count += 1;
      group.totalAmount += transaction.amount;
      group.transactions.push(transaction);
    }

    const data = [...years.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => {
        const monthList = [...months.values()].sort((a, b) => b.month - a.month);
        return {
          year,
          count: monthList.reduce((total, item) => total + item.count, 0),
          totalAmount: monthList.reduce((total, item) => total + item.totalAmount, 0),
          months: monthList,
        };
      });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export async function summaryHandler(req, res, next) {
  try {
    const { where, params } = buildFilters(req.query);
    const { rows } = await query(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(SUM(amount), 0)::numeric AS total_amount,
         COUNT(*) FILTER (WHERE status = 0)::int AS success,
         COUNT(*) FILTER (WHERE status = 1)::int AS failed
       FROM transactions ${where}`,
      params,
    );

    const row = rows[0];
    res.json({
      data: {
        total: row.total,
        totalAmount: Number(row.total_amount),
        success: row.success,
        failed: row.failed,
      },
    });
  } catch (error) {
    next(error);
  }
}

router.get('/summary', summaryHandler);

router.get('/', async (req, res, next) => {
  try {
    const { where, params } = buildFilters(req.query);
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20) || 20));
    const offset = (page - 1) * pageSize;

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM transactions ${where}`,
      params,
    );
    const total = countResult.rows[0].total;

    const { rows } = await query(
      `SELECT ${SELECT_COLUMNS} FROM transactions ${where}
       ORDER BY transaction_date DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    );

    res.json({
      data: rows.map(toTransaction),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const transaction = await findById(id);
    if (!transaction) {
      throw notFoundError(id);
    }
    res.json({ data: withPeriod(transaction) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { value, errors } = validateTransaction(req.body);
    if (errors.length > 0) {
      throw validationError(errors);
    }

    await assertStatusExists(value.status);

    if (value.id !== null) {
      const existing = await findById(value.id);
      if (existing) {
        throw duplicateKeyError(value.id);
      }
    }

    const { rows } = await query(
      `INSERT INTO transactions (
         id, product_id, product_name, amount, customer_name,
         status, transaction_date, create_by, create_on
       ) VALUES (
         COALESCE($9::int, nextval('transactions_id_seq')), $1, $2, $3, $4, $5, $6, $7,
         COALESCE($8::timestamp, now())::timestamp(0)
       )
       RETURNING ${SELECT_COLUMNS}`,
      [
        value.productID,
        value.productName,
        value.amount,
        value.customerName,
        value.status,
        value.transactionDate,
        value.createBy,
        value.createOn,
        value.id,
      ],
    );

    res.status(201).json({ data: toTransaction(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    const { value, errors } = validateTransaction(req.body);
    if (errors.length > 0) {
      throw validationError(errors);
    }

    await assertStatusExists(value.status);

    const current = await findById(id);
    if (!current) {
      throw notFoundError(id);
    }

    if (value.version !== null && value.version !== current.version) {
      throw versionConflictError({ expectedVersion: value.version, current });
    }

    const { rows } = await query(
      `UPDATE transactions SET
         product_id = $1,
         product_name = $2,
         amount = $3,
         customer_name = $4,
         status = $5,
         transaction_date = $6,
         create_by = $7,
         create_on = COALESCE($8::timestamp, create_on)::timestamp(0),
         updated_at = now(),
         version = version + 1
       WHERE id = $9
       RETURNING ${SELECT_COLUMNS}`,
      [
        value.productID,
        value.productName,
        value.amount,
        value.customerName,
        value.status,
        value.transactionDate,
        value.createBy,
        value.createOn,
        id,
      ],
    );

    if (rows.length === 0) {
      throw notFoundError(id);
    }

    res.json({ data: toTransaction(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { rowCount } = await query('DELETE FROM transactions WHERE id = $1', [id]);
    if (rowCount === 0) {
      throw notFoundError(id);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
