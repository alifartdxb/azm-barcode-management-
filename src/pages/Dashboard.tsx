import { useEffect, useState } from 'react';
import { PackageSearch, AlertTriangle, Hash, TrendingUp } from 'lucide-react';
import { DashboardStats } from '../types';
import { DashboardService } from '../services/DashboardService';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    noBarcode: 0,
    lowStock: 0
  });

  useEffect(() => {
    DashboardService.getStats()
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <div className="grid grid-cols-4 border-b-2 border-brand-line bg-brand-bg shrink-0">
        <div className="p-3 border-r border-brand-line flex flex-col justify-center">
          <div className="text-[10px] opacity-60 uppercase text-brand-ink">Total SKU</div>
          <div className="font-mono text-2xl font-bold text-brand-ink">{stats.totalProducts.toLocaleString()}</div>
        </div>
        <div className="p-3 border-r border-brand-line flex flex-col justify-center">
          <div className="text-[10px] opacity-60 uppercase text-brand-ink">Printed (24h)</div>
          <div className="font-mono text-2xl font-bold text-brand-ink">0</div>
        </div>
        <div className="p-3 border-r border-brand-line flex flex-col justify-center">
          <div className="text-[10px] uppercase text-red-600 font-bold">Missing Barcode</div>
          <div className="font-mono text-2xl font-bold text-red-600">{stats.noBarcode.toLocaleString()}</div>
        </div>
        <div className="p-3 flex flex-col justify-center">
          <div className="text-[10px] opacity-60 uppercase text-brand-ink">Low Stock Items</div>
          <div className="font-mono text-2xl font-bold text-brand-ink">{stats.lowStock.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr] flex-1 overflow-hidden m-2 gap-2">
        <div className="flex flex-col border border-brand-line bg-white">
          <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider flex justify-between items-center bg-brand-header text-brand-ink">
            <span>Quick Actions</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 flex-1">
            <button onClick={() => window.location.href='/products'} className="border border-brand-line bg-brand-accent text-white hover:opacity-90 px-4 py-2 text-xs uppercase font-bold cursor-pointer flex flex-col gap-2 items-start justify-center h-24">
              <TrendingUp className="w-5 h-5" />
              <span>Import Excel Data</span>
            </button>
            <button onClick={() => window.location.href='/print'} className="border border-brand-line bg-brand-sidebar text-brand-ink hover:bg-gray-200 px-4 py-2 text-xs uppercase font-bold cursor-pointer flex flex-col gap-2 items-start justify-center h-24">
              <span>Batch Print Labels</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-col border border-brand-line bg-white">
          <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider flex justify-between items-center bg-brand-header text-brand-ink">
            <span>Scanner Activity</span>
          </div>
          <div className="p-4 flex-1 flex items-center justify-center bg-[#999]">
             <span className="text-xs uppercase font-bold opacity-50 text-white">No recent activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
