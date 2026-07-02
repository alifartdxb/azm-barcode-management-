import { db } from '../db/db';
import { Product } from '../types';
import { localSaveProduct, localBulkImportProducts, localGenerateMissingBarcodes, localClearAllProducts, localUpdateProductStock } from '../utils/localDb';

export class ProductService {
  static async getAll(): Promise<Product[]> {
    return db.products.toArray();
  }

  static async getById(id: number): Promise<Product | undefined> {
    return db.products.get(id);
  }

  static async search(query: string): Promise<Product[]> {
    if (!query) return this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return db.products.filter(p => 
      p.sku.toLowerCase().includes(lowerQuery) || 
      (p.barcode || '').toLowerCase().includes(lowerQuery) || 
      p.name.toLowerCase().includes(lowerQuery)
    ).toArray();
  }

  static async getByBarcodeOrSku(code: string): Promise<Product | undefined> {
    const trimmedCode = code.trim().toLowerCase();
    return db.products.filter(p => 
      p.sku.toLowerCase() === trimmedCode || 
      (p.barcode || '').toLowerCase() === trimmedCode
    ).first();
  }

  static async save(product: any): Promise<Product> {
    return localSaveProduct(product);
  }

  static async delete(id: number): Promise<void> {
    return db.products.delete(id);
  }

  static async clearAll(): Promise<void> {
    return localClearAllProducts();
  }

  static async bulkImport(productsList: any[], overwrite: boolean, autoGenerateMissing: boolean) {
    return localBulkImportProducts(productsList, overwrite, autoGenerateMissing);
  }

  static async generateMissingBarcodes(): Promise<number> {
    return localGenerateMissingBarcodes();
  }

  static async updateStock(id: number, newStock: number): Promise<void> {
    return localUpdateProductStock(id, newStock);
  }
}

