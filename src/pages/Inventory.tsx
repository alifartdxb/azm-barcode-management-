import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Search, Plus, Filter, Download, ArrowUpDown, MoreHorizontal,
  PackageCheck, AlertTriangle, ArrowRightLeft, Edit2, X, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Product } from '../types';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const loading = products === undefined;

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const startEdit = (p: Product) => {
    setEditingStock(p.id!);
    setNewStockVal(p.stock_quantity);
  };

  const saveStock = async (p: Product) => {
    await db.products.update(p.id!, { stock_quantity: newStockVal });
    setEditingStock(null);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Monitor stock levels, adjust quantities, and manage warehouse locations.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Items in Stock</p>
              <p className="text-2xl font-bold">{products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Low Stock Alerts</p>
              <p className="text-2xl font-bold">{products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Out of Stock</p>
              <p className="text-2xl font-bold">{products.filter(p => p.stock_quantity <= 0).length}</p>
            </div>
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
                placeholder="Search inventory by SKU, name, or category..."
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
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Adjust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No inventory records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const value = (product.stock_quantity || 0) * (product.cost_price || 0);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-xs font-medium">{product.sku}</TableCell>
                        <TableCell className="font-medium max-w-[250px] truncate">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{product.category || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">${(product.cost_price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">${value.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {editingStock === product.id ? (
                            <div className="flex items-center justify-end gap-1">
                               <Input type="number" className="w-16 h-7 text-xs px-1 text-right" value={newStockVal} onChange={e => setNewStockVal(parseInt(e.target.value)||0)} />
                               <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => saveStock(product)}><CheckCircle2 className="h-4 w-4"/></Button>
                               <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => setEditingStock(null)}><X className="h-4 w-4"/></Button>
                            </div>
                          ) : product.stock_quantity}
                        </TableCell>
                        <TableCell>
                          {product.stock_quantity <= 0 ? (
                            <Badge variant="destructive" className="px-2 font-medium">Out of Stock</Badge>
                          ) : product.stock_quantity <= 10 ? (
                            <Badge variant="warning" className="px-2 font-medium">Low Stock</Badge>
                          ) : (
                            <Badge variant="success" className="px-2 font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingStock !== product.id && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(product)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
