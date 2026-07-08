import { db } from '../db/db';
import { Product, Customer, Supplier, Invoice, DashboardStats, Quotation, PurchaseOrder } from '../types';

export async function localGetProducts(): Promise<Product[]> {
  return db.products.toArray();
}

export async function localSaveProduct(product: any): Promise<Product> {
  // Clean fields
  const cleanProduct = {
    ...product,
    sku: product.sku.trim(),
    barcode: product.barcode ? product.barcode.trim() : '',
    name: product.name.trim(),
  };

  // Check unique constraints
  const existingSku = await db.products.where('sku').equals(cleanProduct.sku).first();
  if (existingSku && existingSku.id !== cleanProduct.id) {
    throw new Error(`Duplicate SKU: '${cleanProduct.sku}' is already assigned.`);
  }

  if (cleanProduct.barcode) {
    const existingBarcode = await db.products.where('barcode').equals(cleanProduct.barcode).first();
    if (existingBarcode && existingBarcode.id !== cleanProduct.id) {
      throw new Error(`Duplicate Barcode: '${cleanProduct.barcode}' is already in use.`);
    }
  }

  if (cleanProduct.id) {
    await db.products.update(cleanProduct.id, cleanProduct);
    return cleanProduct;
  } else {
    const id = await db.products.add(cleanProduct);
    return { ...cleanProduct, id };
  }
}

export async function localBulkImportProducts(
  productsList: any[],
  overwrite: boolean,
  autoGenerateMissing: boolean
): Promise<{
  count: number;
  inserted: number;
  updated: number;
  skipped: number;
  generated: number;
  skippedDetails: any[];
}> {
  
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let generatedCount = 0;
  let skippedList: any[] = [];

  const getEan13CheckDigit = (code12: string): string => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const val = parseInt(code12[i], 10);
      sum += (i % 2 === 0) ? val : val * 3;
    }
    return ((10 - (sum % 10)) % 10).toString();
  };

  // Bulk import is complex, wrap in a transaction
  await db.transaction('rw', db.products, async () => {
    const allDbProducts = await db.products.toArray();
    const dbSkusMap = new Map<string, Product>(allDbProducts.map(p => [p.sku.toLowerCase(), p]));
    const activeBarcodesRegistry = new Set<string>(allDbProducts.map(p => p.barcode).filter(Boolean));
    
    const payloadSkus = new Set<string>();
    const payloadBarcodes = new Set<string>();
    
    const generateUniqueLocalBarcode = (): string => {
      let attempt = 0;
      while (attempt < 1000) {
        const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
        const code12 = '201' + random9;
        const barcode = code12 + getEan13CheckDigit(code12);
        if (!activeBarcodesRegistry.has(barcode)) {
          return barcode;
        }
        attempt++;
      }
      return '201' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    };

    const toPut: Product[] = [];

    for (const p of productsList) {
      const skuKey = p.sku ? String(p.sku).trim() : '';
      if (!skuKey) {
        skippedList.push({ sku: '', name: p.name, reason: 'Missing SKU value' });
        skippedCount++;
        continue;
      }

      if (payloadSkus.has(skuKey.toLowerCase())) {
        skippedList.push({ sku: skuKey, name: p.name, reason: `Duplicate SKU '${skuKey}' within import file` });
        skippedCount++;
        continue;
      }
      payloadSkus.add(skuKey.toLowerCase());

      let barcode = p.barcode ? String(p.barcode).trim() : '';
      if (barcode) {
        if (payloadBarcodes.has(barcode.toLowerCase())) {
          skippedList.push({ sku: skuKey, name: p.name, reason: `Duplicate Barcode '${barcode}' within import file` });
          skippedCount++;
          continue;
        }
        payloadBarcodes.add(barcode.toLowerCase());
      }

      const existingItem = dbSkusMap.get(skuKey.toLowerCase());

      let finalProduct: Partial<Product> = {};
      
      if (existingItem) {
        if (!overwrite) {
          skippedList.push({ sku: skuKey, name: p.name, reason: `SKU '${skuKey}' already exists (overwrite disabled)` });
          skippedCount++;
          continue;
        }
        finalProduct = {
          ...existingItem,
          name: p.name ? String(p.name).trim() : existingItem.name,
          brand: p.brand !== undefined ? String(p.brand).trim() : existingItem.brand,
          category: p.category !== undefined ? String(p.category).trim() : existingItem.category,
          unit: p.unit !== undefined ? String(p.unit).trim() : existingItem.unit,
          selling_price: p.selling_price !== undefined ? parseFloat(p.selling_price) || 0 : existingItem.selling_price,
          cost_price: p.cost_price !== undefined ? parseFloat(p.cost_price) || 0 : existingItem.cost_price,
          vat: p.vat !== undefined ? parseFloat(p.vat) || 0 : existingItem.vat,
          supplier: p.supplier !== undefined ? String(p.supplier).trim() : existingItem.supplier,
          stock_quantity: p.stock_quantity !== undefined ? parseInt(p.stock_quantity, 10) || 0 : existingItem.stock_quantity,
        };
      } else {
        finalProduct = {
          sku: skuKey,
          barcode: barcode,
          name: p.name ? String(p.name).trim() : 'Unknown Product',
          brand: p.brand ? String(p.brand).trim() : '',
          category: p.category ? String(p.category).trim() : '',
          unit: p.unit ? String(p.unit).trim() : 'pcs',
          selling_price: parseFloat(p.selling_price) || 0,
          cost_price: parseFloat(p.cost_price) || 0,
          vat: parseFloat(p.vat) || 0,
          supplier: p.supplier ? String(p.supplier).trim() : '',
          stock_quantity: parseInt(p.stock_quantity, 10) || 0,
        };
      }

      // Generate barcode if empty
      if (!finalProduct.barcode) {
        if (autoGenerateMissing) {
          const newBar = generateUniqueLocalBarcode();
          finalProduct.barcode = newBar;
          activeBarcodesRegistry.add(newBar);
          generatedCount++;
        } else {
          // Check if SKU is valid for Code128
          const cleanSku = finalProduct.sku!.replace(/[^ -~]/g, '');
          if (cleanSku && !activeBarcodesRegistry.has(cleanSku)) {
            finalProduct.barcode = cleanSku;
            activeBarcodesRegistry.add(cleanSku);
          } else {
            finalProduct.barcode = '';
          }
        }
      } else {
        const isOwnBarcode = existingItem && existingItem.barcode === finalProduct.barcode;
        if (!isOwnBarcode && activeBarcodesRegistry.has(finalProduct.barcode)) {
          if (autoGenerateMissing) {
            const newBar = generateUniqueLocalBarcode();
            finalProduct.barcode = newBar;
            activeBarcodesRegistry.add(newBar);
            generatedCount++;
          } else {
            skippedList.push({ sku: skuKey, name: p.name, reason: `Barcode '${finalProduct.barcode}' is already in use` });
            skippedCount++;
            continue;
          }
        } else {
          activeBarcodesRegistry.add(finalProduct.barcode);
        }
      }

      if (existingItem) updatedCount++; else insertedCount++;
      toPut.push(finalProduct as Product);
    }
    
    // Dexie bulk put
    await db.products.bulkPut(toPut);
  });

  return {
    count: productsList.length,
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedCount,
    generated: generatedCount,
    skippedDetails: skippedList,
  };
}

export async function localGenerateMissingBarcodes(): Promise<number> {
  let count = 0;
  
  await db.transaction('rw', db.products, async () => {
    const allProducts = await db.products.toArray();
    const activeBarcodes = new Set(allProducts.map(p => p.barcode).filter(Boolean));
    const missing = allProducts.filter(p => !p.barcode || p.barcode.trim() === '');
    
    const getEan13CheckDigit = (code12: string): string => {
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const val = parseInt(code12[i], 10);
        sum += (i % 2 === 0) ? val : val * 3;
      }
      return ((10 - (sum % 10)) % 10).toString();
    };

    const generateUniqueLocalBarcode = (): string => {
      let attempt = 0;
      while (attempt < 1000) {
        const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
        const code12 = '201' + random9;
        const barcode = code12 + getEan13CheckDigit(code12);
        if (!activeBarcodes.has(barcode)) {
          return barcode;
        }
        attempt++;
      }
      return '201' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    };

    const toUpdate: Product[] = [];
    for (const p of missing) {
      const newBar = generateUniqueLocalBarcode();
      activeBarcodes.add(newBar);
      p.barcode = newBar;
      toUpdate.push(p);
      count++;
    }
    
    await db.products.bulkPut(toUpdate);
  });
  
  return count;
}

export async function localClearAllProducts(): Promise<void> {
  return db.products.clear();
}

export async function localUpdateProductStock(productId: number, newStock: number): Promise<void> {
  const p = await db.products.get(productId);
  if (!p) throw new Error('Product not found');
  await db.products.update(productId, { stock_quantity: newStock });
}


const DEFAULT_CUSTOMERS: Customer[] = [
  { name: 'Cash Customer', phone: '0501234567', email: 'cash@alzahrabm.com', trn: '', address: 'Industrial Area, Al Sajaa, Sharjah, U.A.E.', balance: 0.0 },
  { name: 'Al Sahel Contracting LLC', phone: '042233445', email: 'info@alsahel.ae', trn: '100234567800003', address: 'Al Quoz, Dubai, UAE', balance: 5420.50 },
  { name: 'Emirates Heights Builders', phone: '0569876543', email: 'contact@ehbuilders.ae', trn: '100456789100003', address: 'Sharjah, UAE', balance: 0.0 }
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { name: 'Steel & Rebar Gulf Corp', contact_person: 'Mr. Robert Chen', phone: '0528889991', email: 'sales@gulfsteel.com', trn: '100999888700003', address: 'Jebel Ali Free Zone, Dubai', balance: -12500.00 },
  { name: 'Universal Cement Factory', phone: '037776665', email: 'orders@unicement.ae', trn: '100345112200003', address: 'Al Ain, UAE', balance: 0.0 },
  { name: 'National Pipes & Fittings', contact_person: 'Sanjay Kumar', phone: '065554433', email: 'sanjay@nationalpipes.com', trn: '100888111200003', address: 'Industrial Area 5, Sharjah', balance: -4350.00 }
];

export async function localGetCustomers(): Promise<Customer[]> {
  let list = await db.customers.toArray();
  if (list.length === 0) {
    await db.customers.bulkAdd(DEFAULT_CUSTOMERS);
    list = await db.customers.toArray();
  }
  return list;
}

export async function localSaveCustomer(customer: any): Promise<void> {
  if (customer.id) await db.customers.update(customer.id, customer);
  else await db.customers.add(customer);
}

export async function localDeleteCustomer(id: number): Promise<void> {
  await db.customers.delete(id);
}

export async function localGetSuppliers(): Promise<Supplier[]> {
  let list = await db.suppliers.toArray();
  if (list.length === 0) {
    await db.suppliers.bulkAdd(DEFAULT_SUPPLIERS);
    list = await db.suppliers.toArray();
  }
  return list;
}

export async function localSaveSupplier(supplier: any): Promise<void> {
  if (supplier.id) await db.suppliers.update(supplier.id, supplier);
  else await db.suppliers.add(supplier);
}

export async function localDeleteSupplier(id: number): Promise<void> {
  await db.suppliers.delete(id);
}

export async function localGetInvoices(): Promise<Invoice[]> {
  return db.invoices.toArray();
}

export async function localGetInvoiceById(id: number): Promise<Invoice | undefined> {
  return db.invoices.get(id);
}

export async function localSaveInvoice(invoiceData: any): Promise<Invoice> {
  return db.transaction('rw', db.invoices, db.products, db.customers, async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const pattern = `INV-${today}-`;
    const dailyCount = await db.invoices.filter(inv => inv.invoice_number.startsWith(pattern)).count();
    const sequence = (dailyCount + 1).toString().padStart(4, '0');
    const invoice_number = `INV-${today}-${sequence}`;

    const finalInvoice: Invoice = {
      ...invoiceData,
      invoice_number,
      date: new Date().toISOString()
    };

    if (finalInvoice.items) {
      for (const item of finalInvoice.items) {
        const product = await db.products.get(item.product_id);
        if (product) {
          product.stock_quantity = Math.max(0, product.stock_quantity - item.quantity);
          await db.products.put(product);
        }
      }
    }

    if (finalInvoice.customer_id && finalInvoice.payment_status !== 'Paid') {
      const customer = await db.customers.get(finalInvoice.customer_id);
      if (customer) {
        customer.balance = (customer.balance || 0) + (finalInvoice.grand_total || 0);
        await db.customers.put(customer);
      }
    }

    const id = await db.invoices.add(finalInvoice);
    finalInvoice.id = id;
    return finalInvoice;
  });
}

export async function localDeleteInvoice(id: number): Promise<void> {
  await db.transaction('rw', db.invoices, db.products, db.customers, async () => {
    const invoice = await db.invoices.get(id);
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.items) {
      for (const item of invoice.items) {
        const product = await db.products.get(item.product_id);
        if (product) {
          product.stock_quantity = product.stock_quantity + item.quantity;
          await db.products.put(product);
        }
      }
    }

    if (invoice.customer_id && invoice.payment_status !== 'Paid') {
      const customer = await db.customers.get(invoice.customer_id);
      if (customer) {
        customer.balance = Math.max(0, (customer.balance || 0) - (invoice.grand_total || 0));
        await db.customers.put(customer);
      }
    }

    await db.invoices.delete(id);
  });
}

export async function localGetDashboardStats(): Promise<DashboardStats> {
  const [totalProducts, noBarcode, lowStock, allInvoices, allCustomers, totalQuotations, totalPurchases] = await Promise.all([
    db.products.count(),
    db.products.filter(p => !p.barcode || p.barcode.trim() === '').count(),
    db.products.filter(p => p.stock_quantity < 10).count(),
    db.invoices.toArray(),
    db.customers.toArray(),
    db.quotations.count(),
    db.purchaseOrders.count()
  ]);

  const totalSales = parseFloat(allInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0).toFixed(2));
  
  // Sort invoices by date desc
  const sortedInvoices = [...allInvoices].sort((a, b) => {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });
  
  const recentTransactions = sortedInvoices.slice(0, 5).map(inv => ({
    name: inv.customer_name || 'Walk-in Customer',
    email: inv.customer_name ? 'Registered Customer' : 'No Email',
    amount: `+$${(inv.grand_total || 0).toFixed(2)}`,
    status: inv.payment_status || 'Paid'
  }));

  // Chart data (last 7 days)
  const salesChartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toISOString().split('T')[0];
    const shortName = d.toLocaleDateString('en-US', { weekday: 'short' });
    
    const dayTotal = allInvoices
      .filter(inv => inv.date && inv.date.startsWith(dateString))
      .reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
      
    salesChartData.push({
      name: shortName,
      total: dayTotal
    });
  }

  return {
    totalProducts,
    noBarcode,
    lowStock,
    totalSales,
    totalInvoices: allInvoices.length,
    activeCustomers: allCustomers.length,
    totalQuotations,
    totalPurchases,
    recentTransactions,
    salesChartData
  };
}

export async function localGetQuotations(): Promise<Quotation[]> {
  return db.quotations.toArray();
}
export async function localSaveQuotation(quotation: Quotation): Promise<Quotation> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const pattern = `QT-${today}-`;
  if (!quotation.quotation_number) {
    const dailyCount = await db.quotations.filter(q => q.quotation_number.startsWith(pattern)).count();
    const sequence = (dailyCount + 1).toString().padStart(4, '0');
    quotation.quotation_number = `QT-${today}-${sequence}`;
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
  const pattern = `PO-${today}-`;
  if (!purchase.po_number) {
    const dailyCount = await db.purchaseOrders.filter(p => p.po_number.startsWith(pattern)).count();
    const sequence = (dailyCount + 1).toString().padStart(4, '0');
    purchase.po_number = `PO-${today}-${sequence}`;
  }
  const id = await db.purchaseOrders.put(purchase as any);
  purchase.id = id as number;
  return purchase;
}
export async function localDeletePurchase(id: number): Promise<void> {
  await db.purchaseOrders.delete(id);
}
