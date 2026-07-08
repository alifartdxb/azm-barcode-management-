import React from 'react';
import { 
  BarChart4, Download, FileText, PieChart, TrendingUp, Calendar, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Reports() {
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
                <ReportItem title="Daily Sales Summary" desc="Revenue breakdown by day and payment method." />
                <ReportItem title="Monthly Revenue Analysis" desc="Month-over-month growth and trend analysis." />
                <ReportItem title="Top Selling Products" desc="Best performing items by volume and revenue." />
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
                <ReportItem title="Current Stock Valuation" desc="Total inventory value at cost and retail price." />
                <ReportItem title="Low Stock Alerts" desc="Items below minimum threshold." icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} />
                <ReportItem title="Stock Movement" desc="In/out ledger for all inventory adjustments." />
                <ReportItem title="Missing Barcodes" desc="List of products requiring barcode generation." />
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
