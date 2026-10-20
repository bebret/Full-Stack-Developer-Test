CREATE TABLE IF NOT EXISTS statuses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  customer_name TEXT,
  status INTEGER NOT NULL REFERENCES statuses (id),
  transaction_date TIMESTAMP NOT NULL,
  create_by TEXT,
  create_on TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE SEQUENCE IF NOT EXISTS transactions_id_seq;
ALTER TABLE transactions ALTER COLUMN id SET DEFAULT nextval('transactions_id_seq');

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions (status);

CREATE INDEX IF NOT EXISTS idx_transactions_period
  ON transactions (
    (date_part('year', transaction_date)),
    (date_part('month', transaction_date))
  );
