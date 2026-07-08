import React, { useState } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, MoreHorizontal,
  Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

const MOCK_QUOTATIONS = [
  { id: 'QT-2024-001', date: '2024-02-15', customer: 'Emaar Properties', amount: 45200.50, status: 'approved' },
  { id: 'QT-2024-002', date: '2024-02-14', customer: 'Damac Construction', amount: 12500.00, status: 'pending' },
  { id: 'QT-2024-003', date: '2024-02-12', customer: 'Al Futtaim Group', amount: 8900.25, status: 'rejected' },
  { id: 'QT-2024-004', date: '2024-02-10', customer: 'Nakheel Landscapes', amount: 34000.00, status: 'approved' },
  { id: 'QT-2024-005', date: '2024-02-08', customer: 'Arabtec Construction', amount: 5600.00, status: 'pending' },
];

export default function Quotations() {
  const [searchTerm, setSearchTerm] = useState('');

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
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Quotation
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Total Quotes</p>
            <p className="text-3xl font-bold">124</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Pending Value</p>
            <p className="text-3xl font-bold text-amber-600">$18,100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Approved (This Month)</p>
            <p className="text-3xl font-bold text-green-600">45</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground font-medium mb-2">Conversion Rate</p>
            <p className="text-3xl font-bold text-primary">68%</p>
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_QUOTATIONS.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">{quote.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{quote.date}</TableCell>
                    <TableCell className="font-medium">{quote.customer}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${quote.amount.toFixed(2)}</TableCell>
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
