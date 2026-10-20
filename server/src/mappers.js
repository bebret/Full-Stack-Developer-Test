export function toTransaction(row) {
  return {
    id: row.id,
    productID: row.product_id,
    productName: row.product_name,
    amount: Number(row.amount),
    customerName: row.customer_name,
    status: row.status,
    transactionDate: row.transaction_date,
    createBy: row.create_by,
    createOn: row.create_on,
    version: row.version,
    updatedAt: row.updated_at,
  };
}

export function toStatus(row) {
  return {
    id: row.id,
    name: row.name,
  };
}
