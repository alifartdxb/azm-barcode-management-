import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { localSaveQuotation, localDeleteQuotation } from '../utils/localDb';
import { 
  FileText, Plus, Search, Filter, Download, MoreHorizontal,
  Clock, CheckCircle2, XCircle, X
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Quotation } from '../types';

export default function Quotations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');

  const quotations = useLiveQuery(() => db.quotations.toArray(), []) || [];
  
  const filtered = quotations.filter(q => 
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (q.customer_name && q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalQuotes = quotations.length;
  const pendingQuotes = quotations.filter(q => q.status === 'pending');
  const pendingValue = pendingQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);
  const approvedQuotes = quotations.filter(q => q.status === 'approved');
  const conversionRate = totalQuotes > 0 ? Math.round((approvedQuotes.length / totalQuotes) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount) || 0;
    await localSaveQuotation({
      quotation_number: '', // will auto-generate
      customer_name: customerName,
      total_amount: val,
      vat_amount: val * 0.05,
      discount_amount: 0,
      grand_total: val * 1.05,
      status: 'pending',
      created_at: new Date().toISOString(),
      items: []
    } as Quotation);
    setIsModalOpen(false);
    setCustomerName('');
    setAmount('');
  };

  const handleDelete = async (id?: number) => {
    if (id && confirm('Are you sure you want to delete this quotation?')) {
      await localDeleteQuotation(id);
    }
  };

  const markStatus = async (q: Quotation, status: string) => {
    q.status = status;
    await db.quotations.put(q);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage and track customer quotes, estimates, and proposals.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Quotation
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Quotes</p>
            <p className="text-3xl font-bold">{totalQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Pending Value</p>
            <p className="text-3xl font-bold text-amber-600">${pendingValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Approved</p>
            <p className="text-3xl font-bold text-green-600">{approvedQuotes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Conversion Rate</p>
            <p className="text-3xl font-bold text-primary">{conversionRate}%</p>
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
                placeholder="Search quotations by ID, customer..."
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
                  <TableHead className="w-[150px]">Quote ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">{quote.quotation_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(quote.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{quote.customer_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${(quote.grand_total || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {quote.status === 'approved' && (
                        <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1.5"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
                      )}
                      {quote.status === 'pending' && (
                        <Badge variant="warning" className="gap-1.5"><Clock className="w-3 h-3" /> Pending</Badge>
                      )}
                      {quote.status === 'rejected' && (
                        <Badge variant="destructive" className="gap-1.5"><XCircle className="w-3 h-3" /> Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {quote.status === 'pending' && (
                           <>
                             <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markStatus(quote, 'approved')}>Approve</Button>
                             <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => markStatus(quote, 'rejected')}>Reject</Button>
                           </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(quote.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No quotations found.</TableCell>
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
               <h3 className="font-bold text-lg">New Quotation</h3>
               <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8">
                 <X className="w-4 h-4" />
               </Button>
             </div>
             <CardContent className="p-6">
               <form onSubmit={handleSave} className="flex flex-col gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Customer Name</label>
                   <Input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Al Futtaim Group" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Base Amount (AED)</label>
                   <Input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                   <p className="text-xs text-muted-foreground">VAT (5%) will be added automatically.</p>
                 </div>
                 <div className="flex gap-3 pt-4 border-t mt-2">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                   <Button type="submit" className="flex-1">Save Quotation</Button>
                 </div>
               </form>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
