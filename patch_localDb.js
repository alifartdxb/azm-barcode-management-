import fs from 'fs';

let code = fs.readFileSync('src/utils/localDb.ts', 'utf8');

const target = `  const [totalProducts, noBarcode, lowStock, allInvoices, allCustomers, totalQuotations, totalPurchases] = await Promise.all([
    db.products.count(),
    db.products.filter(p => !p.barcode || p.barcode.trim() === '').count(),
    db.products.filter(p => p.stock_quantity < 10).count(),
    db.invoices.toArray(),
    db.customers.toArray()
  ]);`;

const replacement = `  const [totalProducts, noBarcode, lowStock, allInvoices, allCustomers, totalQuotations, totalPurchases] = await Promise.all([
    db.products.count(),
    db.products.filter(p => !p.barcode || p.barcode.trim() === '').count(),
    db.products.filter(p => p.stock_quantity < 10).count(),
    db.invoices.toArray(),
    db.customers.toArray(),
    db.quotations.count(),
    db.purchaseOrders.count()
  ]);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/utils/localDb.ts', code);
