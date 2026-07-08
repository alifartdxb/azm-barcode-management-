import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { localSaveSupplier, localDeleteSupplier } from '../utils/localDb';
import { formatCurrency } from '../utils/currency';
import { 
  Truck, Plus, Search, Filter, Download, MoreHorizontal,
  Mail, Phone, X
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Supplier } from '../types';

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', trn: '', address: '', balance: '' });

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []) || [];

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeVendors = suppliers.length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await localSaveSupplier({
      name: form.name,
      contact_person: form.contact_person,
      phone: form.phone,
      email: form.email,
      trn: form.trn,
      address: form.address,
      balance: parseFloat(form.balance) || 0,
      created_at: new Date().toISOString()
    } as Supplier);
    setIsModalOpen(false);
    setForm({ name: '', contact_person: '', phone: '', email: '', trn: '', address: '', balance: '' });
  };

  const handleDelete = async (id?: number) => {
    if (id && confirm('Delete this supplier?')) {
      await localDeleteSupplier(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Suppliers & Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage your supply chain partners and vendor contact details.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Suppliers</p>
            <p className="text-3xl font-bold text-primary">{activeVendors}</p>
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
                placeholder="Search suppliers by name or contact..."
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
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium text-primary">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-muted-foreground" /> {supplier.phone || '-'}</span>
                        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-muted-foreground" /> {supplier.email || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                       {formatCurrency(supplier.balance || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(supplier.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No suppliers found.</TableCell>
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
               <h3 className="font-bold text-lg">Add Supplier</h3>
               <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8">
                 <X className="w-4 h-4" />
               </Button>
             </div>
             <CardContent className="p-6">
               <form onSubmit={handleSave} className="flex flex-col gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Company Name *</label>
                   <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Supplier name" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Contact Person</label>
                   <Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="e.g. John Doe" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Phone</label>
                     <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+971..." />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Email</label>
                     <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@..." />
                   </div>
                 </div>
                 <div className="flex gap-3 pt-4 border-t mt-2">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                   <Button type="submit" className="flex-1">Save Supplier</Button>
                 </div>
               </form>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
