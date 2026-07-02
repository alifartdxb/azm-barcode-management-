import { localGetSuppliers, localSaveSupplier, localDeleteSupplier } from '../utils/localDb';
import { Supplier } from '../types';

export class SupplierService {
  static async getAll(): Promise<Supplier[]> {
    return localGetSuppliers();
  }

  static async save(supplier: any): Promise<void> {
    return localSaveSupplier(supplier);
  }

  static async delete(id: number): Promise<void> {
    return localDeleteSupplier(id);
  }
}
