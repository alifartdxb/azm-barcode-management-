import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatCurrency } from '../utils/currency';
import { 
  BarChart4, Download, FileText, PieChart, TrendingUp, Calendar, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Reports() {
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  const lowStockCount = products.filter(p => p.stock_quantity <= (p.minimum_stock || 10)).length;
  const noBarcodeCount = products.filter(p => !p.barcode || p.barcode.trim() === '').length;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">Generate comprehensive business reports and data exports.</p>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Sales Reports */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">Sales & Revenue</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                <ReportItem title="Daily Sales Summary" desc={`Total Recorded Revenue: ${formatCurrency(totalRevenue)}`} />
                <ReportItem title="Monthly Revenue Analysis" desc="Month-over-month growth and trend analysis." />
                <ReportItem title="Customer Purchase History" desc="Sales grouped by customer account." />
              </div>
            </CardContent>
          </Card>

          {/* Inventory Reports */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-md text-amber-600">
                  <PieChart className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">Inventory & Stock</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                <ReportItem title="Current Stock Valuation" desc={`Total Catalog Items: ${products.length}`} />
                <ReportItem title="Low Stock Alerts" desc={`${lowStockCount} items below minimum threshold.`} icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} />
                <ReportItem title="Missing Barcodes" desc={`${noBarcodeCount} items require barcode generation.`} />
              </div>
            </CardContent>
          </Card>

          {/* Purchasing Reports */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-md text-green-600">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">Purchasing & Suppliers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                <ReportItem title="Purchase Order History" desc="All POs grouped by status and date." />
                <ReportItem title="Supplier Expenditure" desc="Total spend analysis per supplier." />
                <ReportItem title="Incoming Shipments" desc="Pending deliveries and expected dates." />
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}

function ReportItem({ title, desc, icon }: { title: string, desc: string, icon?: React.ReactNode }) {
  return (
    <div className="p-4 flex items-start justify-between hover:bg-muted/50 transition-colors group cursor-pointer">
      <div>
        <h4 className="font-medium text-sm flex items-center gap-2">
          {title} {icon}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}
