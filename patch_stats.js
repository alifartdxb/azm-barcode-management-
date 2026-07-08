import fs from 'fs';

let code = fs.readFileSync('src/utils/localDb.ts', 'utf8');

code = code.replace('db.customers.toArray()', 'db.customers.toArray(), db.quotations.count(), db.purchaseOrders.count()');
code = code.replace('const [totalProducts, noBarcode, lowStock, allInvoices, allCustomers] = await Promise.all([', 'const [totalProducts, noBarcode, lowStock, allInvoices, allCustomers, totalQuotations, totalPurchases] = await Promise.all([');
code = code.replace('activeCustomers: allCustomers.length,', 'activeCustomers: allCustomers.length,\n    totalQuotations,\n    totalPurchases,');

fs.writeFileSync('src/utils/localDb.ts', code);
