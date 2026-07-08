import React, { useState } from 'react';
import { 
  ShoppingCart, Plus, Search, Filter, Download, MoreHorizontal,
  Truck, CheckCircle2, Clock
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

const MOCK_POS = [
  { id: 'PO-2024-089', date: '2024-02-18', supplier: 'Global Hardware Co.', amount: 12450.00, expected: '2024-02-25', status: 'ordered' },
  { id: 'PO-2024-088', date: '2024-02-16', supplier: 'Emirates Steel', amount: 89000.00, expected: '2024-02-20', status: 'shipped' },
  { id: 'PO-2024-087', date: '2024-02-10', supplier: 'RAK Ceramics', amount: 34200.50, expected: '2024-02-15', status: 'received' },
  { id: 'PO-2024-086', date: '2024-02-05', supplier: 'Makita Tools Middle East', amount: 5600.00, expected: '2024-02-12', status: 'received' },
];

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Manage supplier orders, track incoming shipments, and restock inventory.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Purchase Order
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Active Orders</p>
            <p className="text-3xl font-bold text-primary">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Value (Incoming)</p>
            <p className="text-3xl font-bold">$101,450</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Pending Delivery</p>
            <p className="text-3xl font-bold text-amber-600">8</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Received (This Month)</p>
            <p className="text-3xl font-bold text-green-600">34</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <Card className="h-full flex flex-col">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-card gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search"
                placeholder="Search PO number, supplier..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-background w-full"
              />
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_POS.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">{po.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.date}</TableCell>
                    <TableCell className="font-medium">{po.supplier}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.expected}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${po.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {po.status === 'ordered' && (
                        <Badge variant="warning" className="gap-1.5"><Clock className="w-3 h-3" /> Ordered</Badge>
                      )}
                      {po.status === 'shipped' && (
                        <Badge variant="secondary" className="gap-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100"><Truck className="w-3 h-3" /> Shipped</Badge>
                      )}
                      {po.status === 'received' && (
                        <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1.5"><CheckCircle2 className="w-3 h-3" /> Received</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
