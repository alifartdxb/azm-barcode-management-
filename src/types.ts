export interface Product {
  id: number;
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
}
