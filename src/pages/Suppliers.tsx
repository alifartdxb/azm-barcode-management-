import React, { useState } from 'react';
import { 
  Truck, Plus, Search, Filter, Download, MoreHorizontal,
  Mail, Phone, ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

const MOCK_SUPPLIERS = [
  { id: 'SUP-001', name: 'Global Hardware Co.', contact: 'Ahmed Hassan', phone: '+971 50 123 4567', email: 'sales@globalhardware.ae', status: 'active' },
  { id: 'SUP-002', name: 'Emirates Steel', contact: 'Mohammed Ali', phone: '+971 4 234 5678', email: 'orders@emiratessteel.com', status: 'active' },
  { id: 'SUP-003', name: 'RAK Ceramics', contact: 'Sarah Smith', phone: '+971 7 345 6789', email: 'distributors@rakceramics.com', status: 'active' },
  { id: 'SUP-004', name: 'Makita Tools Middle East', contact: 'John Doe', phone: '+971 4 456 7890', email: 'sales.me@makita.com', status: 'inactive' },
  { id: 'SUP-005', name: 'Berger Paints', contact: 'Vikram Singh', phone: '+971 6 567 8901', email: 'wholesale@berger.ae', status: 'active' },
];

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('');

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
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Suppliers</p>
            <p className="text-3xl font-bold text-primary">84</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Active Vendors</p>
            <p className="text-3xl font-bold text-green-600">72</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Open Purchase Orders</p>
            <p className="text-3xl font-bold text-amber-600">15</p>
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
                placeholder="Search suppliers by name, contact, or email..."
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
                  <TableHead className="w-[120px]">Supplier ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_SUPPLIERS.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono text-xs font-medium text-muted-foreground">{supplier.id}</TableCell>
                    <TableCell className="font-medium text-primary">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.contact}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-muted-foreground" /> {supplier.phone}</span>
                        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-muted-foreground" /> {supplier.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.status === 'active' ? (
                        <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Inactive</Badge>
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
