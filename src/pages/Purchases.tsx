import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { localSavePurchase, localDeletePurchase } from '../utils/localDb';
import { 
  ShoppingCart, Plus, Search, Filter, Download, MoreHorizontal,
  Truck, CheckCircle2, Clock, X
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { PurchaseOrder } from '../types';

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState('');

  const purchases = useLiveQuery(() => db.purchaseOrders.toArray(), []) || [];

  const filtered = purchases.filter(po => 
    po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (po.supplier_name && po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeOrders = purchases.filter(po => po.status !== 'received' && po.status !== 'cancelled').length;
  const pendingValue = purchases.filter(po => po.status !== 'received').reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const pendingDelivery = purchases.filter(po => po.status === 'shipped').length;
  const received = purchases.filter(po => po.status === 'received').length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount) || 0;
    await localSavePurchase({
      po_number: '',
      supplier_id: Date.now(),
      supplier_name: supplierName,
      total_amount: val,
      status: 'ordered',
      created_at: new Date().toISOString(),
      expected_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
      items: []
    } as PurchaseOrder);
    setIsModalOpen(false);
    setSupplierName('');
    setAmount('');
  };

  const handleDelete = async (id?: number) => {
    if (id && confirm('Delete this Purchase Order?')) {
      await localDeletePurchase(id);
    }
  };

  const markStatus = async (po: PurchaseOrder, status: string) => {
    po.status = status;
    await db.purchaseOrders.put(po);
  };

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
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Purchase Order
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Active Orders</p>
            <p className="text-3xl font-bold text-primary">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Value (Incoming)</p>
            <p className="text-3xl font-bold">${pendingValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Pending Delivery</p>
            <p className="text-3xl font-bold text-amber-600">{pendingDelivery}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Received</p>
            <p className="text-3xl font-bold text-green-600">{received}</p>
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
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">{po.po_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{po.supplier_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.expected_date}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${(po.total_amount || 0).toFixed(2)}</TableCell>
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
                      <div className="flex items-center gap-2">
                        {po.status === 'ordered' && (
                           <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markStatus(po, 'shipped')}>Mark Shipped</Button>
                        )}
                        {po.status === 'shipped' && (
                           <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markStatus(po, 'received')}>Receive</Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(po.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No purchase orders found.</TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
             <div className="px-6 py-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-lg">New Purchase Order</h3>
               <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8">
                 <X className="w-4 h-4" />
               </Button>
             </div>
             <CardContent className="p-6">
               <form onSubmit={handleSave} className="flex flex-col gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Supplier Name</label>
                   <Input required value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. Global Hardware" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Order Amount (AED)</label>
                   <Input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                 </div>
                 <div className="flex gap-3 pt-4 border-t mt-2">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                   <Button type="submit" className="flex-1">Save Order</Button>
                 </div>
               </form>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
