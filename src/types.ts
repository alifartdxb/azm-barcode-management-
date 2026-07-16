export interface Product {
  id?: number;
  sku: string;
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  unit?: string;
  cost_price: number;
  selling_price: number;
  vat: number;
  supplier?: string;
  warehouse_location?: string;
  minimum_stock?: number;
  stock_quantity: number;
  image_url?: string;
  price_code?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id?: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  trn?: string;
  address?: string;
  credit_limit?: number;
  balance: number;
  created_at?: string;
  
  // CRM fields
  customer_code?: string;
  whatsapp_number?: string;
  city?: string;
  country?: string;
  google_map?: string;
  customer_type?: 'Contractor' | 'Builder' | 'Consultant' | 'Retail Customer' | 'Walk-in' | 'Architect' | 'Interior Designer' | 'Supplier';
  opening_balance?: number;
  payment_terms?: string;
  sales_representative?: string;
  source?: string;
  status?: 'Active' | 'Inactive';
  remarks?: string;
  updated_at?: string;
  image_url?: string;
}

export interface Supplier {
  id?: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  trn?: string;
  address?: string;
  balance: number;
  created_at?: string;
}

export interface InvoiceItem {
  product_id: number;
  sku: string;
  barcode: string;
  name: string; // Add this since some code references product_name, wait, old code says product_name and vat_rate, total_amount.
  product_name?: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number;
  vat_percentage?: number;
  vat_amount?: number;
  total_amount?: number;
  total?: number;
}

export interface Invoice {
  id?: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  customer_trn?: string;
  date?: string;
  created_at?: string;
  total_amount?: number;
  subtotal?: number;
  discount?: number;
  discount_amount?: number;
  vat_amount: number;
  grand_total: number;
  payment_method: string;
  payment_status?: string;
  status?: string;
  notes?: string;
  items: InvoiceItem[];
}

export interface Quotation {
  id?: number;
  quotation_number: string;
  customer_id?: number;
  customer_name?: string;
  total_amount: number;
  vat_amount: number;
  discount_amount: number;
  grand_total: number;
  status: string; // 'Draft', 'Sent', 'Accepted', 'Rejected'
  created_at: string;
  notes?: string;
  terms?: string;
  items: InvoiceItem[];
}

export interface PurchaseOrder {
  id?: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  total_amount: number;
  status: string; // 'Pending', 'Received', 'Cancelled', 'Partial'
  created_at: string;
  expected_date?: string;
  items: InvoiceItem[];
}

export interface InventoryHistory {
  id?: number;
  product_id: number;
  type: string; // 'IN', 'OUT', 'ADJUST', 'TRANSFER', 'DAMAGE', 'RETURN'
  quantity: number;
  reference_id?: number; // invoice_id, po_id, etc.
  reference_type?: string;
  notes?: string;
  created_at: string;
}

export interface AppSettings {
  id: number; // Always 1
  company_name: string;
  company_trn?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  invoice_prefix: string;
  quotation_prefix: string;
  currency: string;
  default_vat: number;
  label_size: string; // e.g., '38x21', '50x25'
  theme: string;
  last_sku_seq?: number;
  last_barcode_seq?: number;
}

export interface DashboardStats {
  totalProducts: number;
  noBarcode: number;
  lowStock: number;
  totalSales: number;
  totalInvoices: number;
  activeCustomers: number;
  totalQuotations?: number;
  totalPurchases?: number;
  recentTransactions: Array<{ name: string; email: string; amount: string; status: string }>;
  salesChartData: Array<{ name: string; total: number }>;
}