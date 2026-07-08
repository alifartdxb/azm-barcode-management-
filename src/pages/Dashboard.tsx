import React, { useEffect, useState } from 'react';
import { 
  PackageSearch, AlertTriangle, Hash, TrendingUp, 
  DollarSign, ShoppingCart, Users, Receipt,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight, Package,
  FileText, Printer
} from 'lucide-react';
import { DashboardStats } from '../types';
import { DashboardService } from '../services/DashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    noBarcode: 0,
    lowStock: 0,
    totalSales: 0,
    totalInvoices: 0,
    activeCustomers: 0,
    recentTransactions: [],
    salesChartData: []
  });

  useEffect(() => {
    DashboardService.getStats()
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, <strong>Admin</strong>. Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="hidden md:flex">Download Report</Button>
          <Button>Create Invoice</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-green-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3" /> All Time
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-green-500 flex items-center mr-1">
                Total recorded
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products in Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-red-500 flex items-center mr-1">
                <AlertTriangle className="h-3 w-3" /> {stats.lowStock}
              </span>
              items low on stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-green-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3" /> Total clients
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <div className="text-sm text-muted-foreground">Fast access to common tasks</div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-primary" onClick={() => window.location.href='/products'}>
                <Package className="h-6 w-6" />
                <span className="text-xs font-medium">Add Product</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-primary" onClick={() => window.location.href='/billing'}>
                <ShoppingCart className="h-6 w-6" />
                <span className="text-xs font-medium">New Invoice</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-primary" onClick={() => window.location.href='/print'}>
                <Printer className="h-6 w-6" />
                <span className="text-xs font-medium">Print Labels</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-primary">
                <FileText className="h-6 w-6" />
                <span className="text-xs font-medium">New Quotation</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salesChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <div className="text-sm text-muted-foreground">Latest transactions across your store</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {stats.recentTransactions.length > 0 ? stats.recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                    {tx.name.substring(0, 2)}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{tx.name}</p>
                    <p className="text-sm text-muted-foreground">{tx.email}</p>
                  </div>
                  <div className="ml-auto font-medium">{tx.amount}</div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground text-sm py-12">
                  No recent transactions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Purchase Orders", value: (stats.totalPurchases || 0).toString(), desc: "Awaiting delivery", icon: ShoppingCart },
          { title: "Missing Barcodes", value: stats.noBarcode.toString(), desc: "Needs updating", icon: Hash, alert: true },
          { title: "Labels Printed", value: "0", desc: "Past 30 days", icon: Activity },
          { title: "Quotations", value: (stats.totalQuotations || 0).toString(), desc: "Pending approval", icon: Receipt },
        ].map((item, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className={cn("text-xs mt-1", item.alert ? "text-destructive" : "text-muted-foreground")}>
                {item.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
