import { localGetDashboardStats } from '../utils/localDb';
import { DashboardStats } from '../types';

export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    return localGetDashboardStats();
  }
}
