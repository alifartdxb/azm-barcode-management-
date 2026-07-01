export interface Product {
  id: string | number;
  sku: string;
  barcode: string;
  name: string;
  name_ar?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  unit?: string;
  selling_price: number;
  cost_price?: number;
  vat?: number;
  supplier?: string;
  stock_quantity: number;
  description?: string;
  status: string;
}

export interface DashboardStats {
  totalProducts: number;
  noBarcode: number;
  lowStock: number;
  totalSales?: number;
  totalInvoices?: number;
}

export interface Customer {
  id: string | number;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  trn?: string; // Tax Registration Number for VAT invoices in UAE
  address?: string;
  balance: number;
}

export interface Supplier {
  id: string | number;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  trn?: string;
  address?: string;
  balance: number;
}

export interface InvoiceItem {
  id?: string | number;
  invoice_id?: string | number;
  product_id: string | number;
  product_name: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  vat_rate: number; // e.g. 5 for 5%
  vat_amount: number;
  total_amount: number;
}

export interface Invoice {
  id: string | number;
  invoice_number: string;
  customer_id?: number;
  customer_name: string;
  customer_trn?: string;
  date: string;
  subtotal: number;
  discount: number;
  vat_amount: number;
  grand_total: number;
  payment_status: 'Paid' | 'Unpaid' | 'Partial';
  payment_method: 'Cash' | 'Card' | 'Bank Transfer';
  notes?: string;
  items?: InvoiceItem[];
}
