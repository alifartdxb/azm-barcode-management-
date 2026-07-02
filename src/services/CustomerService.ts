import { localGetCustomers, localSaveCustomer, localDeleteCustomer } from '../utils/localDb';
import { Customer } from '../types';

export class CustomerService {
  static async getAll(): Promise<Customer[]> {
    return localGetCustomers();
  }

  static async save(customer: any): Promise<void> {
    return localSaveCustomer(customer);
  }

  static async delete(id: number): Promise<void> {
    return localDeleteCustomer(id);
  }
}
