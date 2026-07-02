import { Product, Customer, Supplier, Invoice, DashboardStats } from '../types';

const DB_NAME = 'HardwarePOSDB';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        productStore.createIndex('sku', 'sku', { unique: true });
        productStore.createIndex('barcode', 'barcode', { unique: true });
      }

      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        customerStore.createIndex('name', 'name', { unique: true });
      }

      // Suppliers store
      if (!db.objectStoreNames.contains('suppliers')) {
        const supplierStore = db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
        supplierStore.createIndex('name', 'name', { unique: true });
      }

      // Invoices store
      if (!db.objectStoreNames.contains('invoices')) {
        const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
        invoiceStore.createIndex('invoice_number', 'invoice_number', { unique: true });
      }
    };
  });
}

// Helper for transactions
async function runTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | Promise<any>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    
    let result: any;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));

    const req = callback(store);
    if (req instanceof IDBRequest) {
      req.onsuccess = () => {
        result = req.result;
      };
    } else {
      // It was an async/promise callback, wait for it
      req.then((res) => {
        result = res;
      }).catch(reject);
    }
  });
}

// Core API Wrapper functions

export async function localGetProducts(): Promise<Product[]> {
  return runTx<Product[]>('products', 'readonly', (store) => store.getAll());
}

export async function localSaveProduct(product: Omit<Product, 'id'> & { id?: number }): Promise<Product> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    // Duplicate SKU/Barcode checking
    const skuIndex = store.index('sku');
    const barcodeIndex = store.index('barcode');

    // Clean fields
    const cleanProduct = {
      ...product,
      sku: product.sku.trim(),
      barcode: product.barcode ? product.barcode.trim() : '',
      name: product.name.trim(),
    };

    const runInsert = () => {
      const putReq = store.put(cleanProduct);
      putReq.onsuccess = () => {
        resolve({ ...cleanProduct, id: putReq.result as number } as Product);
      };
      putReq.onerror = () => reject(putReq.error);
    };

    // Fast local verification before commit
    const checkSku = skuIndex.get(cleanProduct.sku);
    checkSku.onsuccess = () => {
      if (checkSku.result && checkSku.result.id !== cleanProduct.id) {
        reject(new Error(`Duplicate SKU: '${cleanProduct.sku}' is already assigned.`));
        return;
      }

      if (cleanProduct.barcode) {
        const checkBarcode = barcodeIndex.get(cleanProduct.barcode);
        checkBarcode.onsuccess = () => {
          if (checkBarcode.result && checkBarcode.result.id !== cleanProduct.id) {
            reject(new Error(`Duplicate Barcode: '${cleanProduct.barcode}' is already in use.`));
            return;
          }
          runInsert();
        };
        checkBarcode.onerror = () => reject(checkBarcode.error);
      } else {
        runInsert();
      }
    };
    checkSku.onerror = () => reject(checkSku.error);
  });
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    
    const skuIndex = store.index('sku');
    const barcodeIndex = store.index('barcode');

    // Fetch all current entries to perform high-speed lookups in memory
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const dbProducts = getAllReq.result as Product[];
      const dbSkusMap = new Map<string, Product>(dbProducts.map(p => [p.sku.toLowerCase(), p]));
      const activeBarcodesRegistry = new Set<string>(dbProducts.map(p => p.barcode).filter(Boolean));

      let maxId = dbProducts.reduce((max, p) => (p.id > max ? p.id : max), 0);

      const processedList: Product[] = [];
      const skippedList: any[] = [];
      
      const payloadSkus = new Set<string>();
      const payloadBarcodes = new Set<string>();

      let generatedCount = 0;
      let updatedCount = 0;
      let insertedCount = 0;
      let skippedCount = 0;

      // Code128 and EAN-13 generators
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
          if (!activeBarcodesRegistry.has(barcode)) {
            return barcode;
          }
          attempt++;
        }
        return '201' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      };

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

        let finalProduct: Product;
        if (existingItem) {
          if (!overwrite) {
            skippedList.push({ sku: skuKey, name: p.name, reason: `SKU '${skuKey}' already exists (overwrite disabled)` });
            skippedCount++;
            continue;
          }
          // Merge
          finalProduct = {
            ...existingItem,
            name: p.name ? String(p.name).trim() : existingItem.name,
            name_ar: p.name_ar !== undefined ? String(p.name_ar).trim() : existingItem.name_ar,
            brand: p.brand !== undefined ? String(p.brand).trim() : existingItem.brand,
            category: p.category !== undefined ? String(p.category).trim() : existingItem.category,
            subcategory: p.subcategory !== undefined ? String(p.subcategory).trim() : existingItem.subcategory,
            unit: p.unit !== undefined ? String(p.unit).trim() : existingItem.unit,
            selling_price: p.selling_price !== undefined ? parseFloat(p.selling_price) || 0 : existingItem.selling_price,
            cost_price: p.cost_price !== undefined ? parseFloat(p.cost_price) || 0 : existingItem.cost_price,
            vat: p.vat !== undefined ? parseFloat(p.vat) || 0 : existingItem.vat,
            supplier: p.supplier !== undefined ? String(p.supplier).trim() : existingItem.supplier,
            stock_quantity: p.stock_quantity !== undefined ? parseInt(p.stock_quantity, 10) || 0 : existingItem.stock_quantity,
            description: p.description !== undefined ? String(p.description).trim() : existingItem.description,
            status: p.status !== undefined ? String(p.status).trim() : existingItem.status,
          };
          updatedCount++;
        } else {
          maxId++;
          finalProduct = {
            id: maxId,
            sku: skuKey,
            barcode: barcode,
            name: p.name ? String(p.name).trim() : 'Unknown Product',
            name_ar: p.name_ar ? String(p.name_ar).trim() : '',
            brand: p.brand ? String(p.brand).trim() : '',
            category: p.category ? String(p.category).trim() : '',
            subcategory: p.subcategory ? String(p.subcategory).trim() : '',
            unit: p.unit ? String(p.unit).trim() : 'pcs',
            selling_price: parseFloat(p.selling_price) || 0,
            cost_price: parseFloat(p.cost_price) || 0,
            vat: parseFloat(p.vat) || 0,
            supplier: p.supplier ? String(p.supplier).trim() : '',
            stock_quantity: parseInt(p.stock_quantity, 10) || 0,
            description: p.description ? String(p.description).trim() : '',
            status: p.status ? String(p.status).trim() : 'Active',
          };
          insertedCount++;
        }

        // Generate barcode if empty
        if (!finalProduct.barcode) {
          if (autoGenerateMissing) {
            // Generate standard compliant GS1 private range barcode
            const newBar = generateUniqueLocalBarcode();
            finalProduct.barcode = newBar;
            activeBarcodesRegistry.add(newBar);
            generatedCount++;
          } else {
            // Check if SKU is valid for Code128
            const cleanSku = finalProduct.sku.replace(/[^ -~]/g, '');
            if (cleanSku && !activeBarcodesRegistry.has(cleanSku)) {
              finalProduct.barcode = cleanSku;
              activeBarcodesRegistry.add(cleanSku);
            } else {
              finalProduct.barcode = '';
            }
          }
        } else {
          // Verify if barcode conflict exists with someone else
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
              if (existingItem) updatedCount--; else { insertedCount--; maxId--; }
              continue;
            }
          } else {
            activeBarcodesRegistry.add(finalProduct.barcode);
          }
        }

        processedList.push(finalProduct);
      }

      // Bulk write in single IndexedDB transaction
      let writeError: any = null;
      let index = 0;

      const writeNext = () => {
        if (index >= processedList.length) {
          resolve({
            count: processedList.length,
            inserted: insertedCount,
            updated: updatedCount,
            skipped: skippedCount,
            generated: generatedCount,
            skippedDetails: skippedList,
          });
          return;
        }

        const item = processedList[index];
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          index++;
          writeNext();
        };
        putReq.onerror = () => {
          reject(putReq.error);
        };
      };

      writeNext();
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

export async function localGenerateMissingBarcodes(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const allProducts = getAllReq.result as Product[];
      const activeBarcodes = new Set(allProducts.map(p => p.barcode).filter(Boolean));
      const missing = allProducts.filter(p => !p.barcode || p.barcode.trim() === '');
      let count = 0;

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

      let index = 0;
      const updateNext = () => {
        if (index >= missing.length) {
          resolve(count);
          return;
        }

        const item = missing[index];
        const newBar = generateUniqueLocalBarcode();
        activeBarcodes.add(newBar);
        item.barcode = newBar;
        
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          count++;
          index++;
          updateNext();
        };
        putReq.onerror = () => reject(putReq.error);
      };

      updateNext();
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

export async function localClearAllProducts(): Promise<void> {
  return runTx<void>('products', 'readwrite', (store) => store.clear());
}

export async function localUpdateProductStock(productId: number, newStock: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    const getReq = store.get(productId);
    getReq.onsuccess = () => {
      const product = getReq.result as Product;
      if (!product) {
        reject(new Error('Product not found'));
        return;
      }
      product.stock_quantity = newStock;
      const putReq = store.put(product);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// -------------------------------------------------------------
// Customers & Suppliers Fallbacks (With Seed data)
// -------------------------------------------------------------

const DEFAULT_CUSTOMERS: Omit<Customer, 'id'>[] = [
  { name: 'Cash Customer', name_ar: 'عميل نقدي', phone: '0501234567', email: 'cash@alrehab.com', trn: '', address: 'Deira, Dubai, UAE', balance: 0.0 },
  { name: 'Al Sahel Contracting LLC', name_ar: 'شركة الساحل للمقاولات ذ.م.م', phone: '042233445', email: 'info@alsahel.ae', trn: '100234567800003', address: 'Al Quoz, Dubai, UAE', balance: 5420.50 },
  { name: 'Emirates Heights Builders', name_ar: 'بناة مرتفعات الإمارات', phone: '0569876543', email: 'contact@ehbuilders.ae', trn: '100456789100003', address: 'Sharjah, UAE', balance: 0.0 }
];

const DEFAULT_SUPPLIERS: Omit<Supplier, 'id'>[] = [
  { name: 'Steel & Rebar Gulf Corp', name_ar: 'مؤسسة الخليج للحديد والصلب', contact_person: 'Mr. Robert Chen', phone: '0528889991', email: 'sales@gulfsteel.com', trn: '100999888700003', address: 'Jebel Ali Free Zone, Dubai', balance: -12500.00 },
  { name: 'Universal Cement Factory', name_ar: 'مصنع الاسمنت العالمي', phone: '037776665', email: 'orders@unicement.ae', trn: '100345112200003', address: 'Al Ain, UAE', balance: 0.0 },
  { name: 'National Pipes & Fittings', name_ar: 'الوطنية للأنابيب والتجهيزات', contact_person: 'Sanjay Kumar', phone: '065554433', email: 'sanjay@nationalpipes.com', trn: '100888111200003', address: 'Industrial Area 5, Sharjah', balance: -4350.00 }
];

export async function localGetCustomers(): Promise<Customer[]> {
  const list = await runTx<Customer[]>('customers', 'readonly', (store) => store.getAll());
  if (list.length === 0) {
    // Seed and retrieve
    const db = await openDB();
    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');
    for (const c of DEFAULT_CUSTOMERS) {
      store.put(c);
    }
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        openDB().then(d => {
          d.transaction('customers', 'readonly').objectStore('customers').getAll().onsuccess = (e: any) => {
            resolve(e.target.result);
          };
        });
      };
    });
  }
  return list;
}

export async function localSaveCustomer(customer: any): Promise<void> {
  await runTx<any>('customers', 'readwrite', (store) => store.put(customer));
}

export async function localDeleteCustomer(id: number): Promise<void> {
  await runTx<any>('customers', 'readwrite', (store) => store.delete(id));
}

export async function localGetSuppliers(): Promise<Supplier[]> {
  const list = await runTx<Supplier[]>('suppliers', 'readonly', (store) => store.getAll());
  if (list.length === 0) {
    // Seed and retrieve
    const db = await openDB();
    const tx = db.transaction('suppliers', 'readwrite');
    const store = tx.objectStore('suppliers');
    for (const s of DEFAULT_SUPPLIERS) {
      store.put(s);
    }
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        openDB().then(d => {
          d.transaction('suppliers', 'readonly').objectStore('suppliers').getAll().onsuccess = (e: any) => {
            resolve(e.target.result);
          };
        });
      };
    });
  }
  return list;
}

export async function localSaveSupplier(supplier: any): Promise<void> {
  await runTx<any>('suppliers', 'readwrite', (store) => store.put(supplier));
}

export async function localDeleteSupplier(id: number): Promise<void> {
  await runTx<any>('suppliers', 'readwrite', (store) => store.delete(id));
}

// -------------------------------------------------------------
// Invoices Flow
// -------------------------------------------------------------

export async function localGetInvoices(): Promise<Invoice[]> {
  return runTx<Invoice[]>('invoices', 'readonly', (store) => store.getAll());
}

export async function localGetInvoiceById(id: number): Promise<Invoice> {
  return runTx<Invoice>('invoices', 'readonly', (store) => store.get(id));
}

export async function localSaveInvoice(invoiceData: Omit<Invoice, 'id' | 'invoice_number'>): Promise<Invoice> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['invoices', 'products', 'customers'], 'readwrite');
    const invoiceStore = tx.objectStore('invoices');
    const productStore = tx.objectStore('products');
    const customerStore = tx.objectStore('customers');

    // 1. Get current list to generate Invoice Number
    const getAllReq = invoiceStore.getAll();
    getAllReq.onsuccess = () => {
      const allInvoices = getAllReq.result as Invoice[];
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const pattern = `INV-${today}-`;
      const dailyCount = allInvoices.filter(inv => inv.invoice_number.startsWith(pattern)).length;
      const sequence = (dailyCount + 1).toString().padStart(4, '0');
      const invoice_number = `INV-${today}-${sequence}`;

      const finalInvoice: Invoice = {
        ...invoiceData,
        id: allInvoices.length + 1,
        invoice_number,
      } as Invoice;

      // 2. Adjust products stock levels
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        for (const item of invoiceData.items) {
          productStore.get(item.product_id).onsuccess = (e: any) => {
            const product = e.target.result as Product;
            if (product) {
              product.stock_quantity = Math.max(0, product.stock_quantity - item.quantity);
              productStore.put(product);
            }
          };
        }
      }

      // 3. Adjust customer credit/balance if unpaid on account
      if (invoiceData.customer_id && invoiceData.payment_status !== 'Paid') {
        customerStore.get(invoiceData.customer_id).onsuccess = (e: any) => {
          const customer = e.target.result as Customer;
          if (customer) {
            customer.balance = (customer.balance || 0) + invoiceData.grand_total;
            customerStore.put(customer);
          }
        };
      }

      // 4. Save Invoice
      const putReq = invoiceStore.put(finalInvoice);
      putReq.onsuccess = () => {
        resolve(finalInvoice);
      };
      putReq.onerror = () => reject(putReq.error);
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

export async function localDeleteInvoice(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['invoices', 'products', 'customers'], 'readwrite');
    const invoiceStore = tx.objectStore('invoices');
    const productStore = tx.objectStore('products');
    const customerStore = tx.objectStore('customers');

    invoiceStore.get(id).onsuccess = (e: any) => {
      const invoice = e.target.result as Invoice;
      if (!invoice) {
        reject(new Error('Invoice not found'));
        return;
      }

      // 1. Revert product stocks
      if (invoice.items) {
        for (const item of invoice.items) {
          productStore.get(item.product_id).onsuccess = (pe: any) => {
            const product = pe.target.result as Product;
            if (product) {
              product.stock_quantity = product.stock_quantity + item.quantity;
              productStore.put(product);
            }
          };
        }
      }

      // 2. Revert customer balance
      if (invoice.customer_id && invoice.payment_status !== 'Paid') {
        customerStore.get(invoice.customer_id).onsuccess = (ce: any) => {
          const customer = ce.target.result as Customer;
          if (customer) {
            customer.balance = Math.max(0, (customer.balance || 0) - invoice.grand_total);
            customerStore.put(customer);
          }
        };
      }

      // 3. Delete invoice record
      const delReq = invoiceStore.delete(id);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    };
  });
}

// -------------------------------------------------------------
// Dashboard Statistics Calculator
// -------------------------------------------------------------

export async function localGetDashboardStats(): Promise<DashboardStats> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['products', 'invoices'], 'readonly');
    const productStore = tx.objectStore('products');
    const invoiceStore = tx.objectStore('invoices');

    const stats: DashboardStats = {
      totalProducts: 0,
      noBarcode: 0,
      lowStock: 0,
      totalSales: 0,
      totalInvoices: 0,
    };

    productStore.getAll().onsuccess = (pe: any) => {
      const products = pe.target.result as Product[];
      stats.totalProducts = products.length;
      stats.noBarcode = products.filter(p => !p.barcode || p.barcode.trim() === '').length;
      stats.lowStock = products.filter(p => p.stock_quantity < 10).length;

      invoiceStore.getAll().onsuccess = (ie: any) => {
        const invoices = ie.target.result as Invoice[];
        stats.totalInvoices = invoices.length;
        stats.totalSales = parseFloat(invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0).toFixed(2));
        resolve(stats);
      };
    };
  });
}
