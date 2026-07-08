const fs = require('fs');
let code = fs.readFileSync('src/utils/localDb.ts', 'utf8');

if (!code.includes('export async function localGetQuotations()')) {
code += `
export async function localGetQuotations(): Promise<Quotation[]> {
  return db.quotations.toArray();
}
export async function localSaveQuotation(quotation: Quotation): Promise<Quotation> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const pattern = \`QT-\${today}-\`;
  if (!quotation.quotation_number) {
    const dailyCount = await db.quotations.filter(q => q.quotation_number.startsWith(pattern)).count();
    const sequence = (dailyCount + 1).toString().padStart(4, '0');
    quotation.quotation_number = \`QT-\${today}-\${sequence}\`;
  }
  const id = await db.quotations.put(quotation as any);
  quotation.id = id as number;
  return quotation;
}
export async function localDeleteQuotation(id: number): Promise<void> {
  await db.quotations.delete(id);
}

export async function localGetPurchases(): Promise<PurchaseOrder[]> {
  return db.purchaseOrders.toArray();
}
export async function localSavePurchase(purchase: PurchaseOrder): Promise<PurchaseOrder> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const pattern = \`PO-\${today}-\`;
  if (!purchase.po_number) {
    const dailyCount = await db.purchaseOrders.filter(p => p.po_number.startsWith(pattern)).count();
    const sequence = (dailyCount + 1).toString().padStart(4, '0');
    purchase.po_number = \`PO-\${today}-\${sequence}\`;
  }
  const id = await db.purchaseOrders.put(purchase as any);
  purchase.id = id as number;
  return purchase;
}
export async function localDeletePurchase(id: number): Promise<void> {
  await db.purchaseOrders.delete(id);
}
`;
}
fs.writeFileSync('src/utils/localDb.ts', code);
