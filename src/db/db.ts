import Dexie, { Table } from 'dexie';
import { Product, Customer, Supplier, Invoice, Quotation, PurchaseOrder, InventoryHistory, AppSettings } from '../types';

export class ERPDatabase extends Dexie {
  users!: Table<any, number>;
  products!: Table<Product, number>;
  customers!: Table<Customer, number>;
  suppliers!: Table<Supplier, number>;
  invoices!: Table<Invoice, number>;
  quotations!: Table<Quotation, number>;
  purchaseOrders!: Table<PurchaseOrder, number>;
  inventoryHistory!: Table<InventoryHistory, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('OfflineERPDB');
    this.version(1).stores({
      products: '++id, sku, barcode, name, category, brand, supplier', // indexed fields for fast searching
      customers: '++id, name, phone, trn',
      suppliers: '++id, name, phone, trn',
      invoices: '++id, invoice_number, customer_id, date, payment_status',
      quotations: '++id, quotation_number, customer_id, created_at, status',
      purchaseOrders: '++id, po_number, supplier_id, created_at, status',
      inventoryHistory: '++id, product_id, type, created_at',
      settings: 'id'
    });
    this.version(2).stores({
      users: '++id, name, email, role, status'
    });
  
  }
}

export const db = new ERPDatabase();

// Initialize default settings if not exists
db.on('ready', async () => {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      id: 1,
      company_name: 'My Hardware Store',
      invoice_prefix: 'INV-',
      quotation_prefix: 'QT-',
      currency: 'AED',
      default_vat: 5,
      label_size: '38x21',
      theme: 'light'
    });
  }
});

