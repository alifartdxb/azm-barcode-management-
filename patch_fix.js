import fs from 'fs';

let code = fs.readFileSync('src/utils/localDb.ts', 'utf8');

code = code.replace("let list = await db.customers.toArray(), db.quotations.count(), db.purchaseOrders.count();", "let list = await db.customers.toArray();");

fs.writeFileSync('src/utils/localDb.ts', code);
