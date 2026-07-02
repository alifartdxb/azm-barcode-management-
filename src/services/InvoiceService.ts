import { localGetInvoices, localGetInvoiceById, localSaveInvoice, localDeleteInvoice } from '../utils/localDb';
import { Invoice } from '../types';

export class InvoiceService {
  static async getAll(): Promise<Invoice[]> {
    return localGetInvoices();
  }

  static async getById(id: number): Promise<Invoice | undefined> {
    return localGetInvoiceById(id);
  }

  static async save(invoice: any): Promise<Invoice> {
    return localSaveInvoice(invoice);
  }

  static async delete(id: number): Promise<void> {
    return localDeleteInvoice(id);
  }
}
