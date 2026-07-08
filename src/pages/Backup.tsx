import React, { useState } from 'react';
import { db } from '../db/db';
import { 
  Database, Download, Upload, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Backup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        products: await db.products.toArray(),
        customers: await db.customers.toArray(),
        suppliers: await db.suppliers.toArray(),
        invoices: await db.invoices.toArray(),
        quotations: await db.quotations.toArray(),
        purchaseOrders: await db.purchaseOrders.toArray(),
        settings: await db.settings.toArray(),
        users: await db.users.toArray()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export backup');
    }
    setIsExporting(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('WARNING: Restoring will overwrite all existing data. Are you sure?')) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        await db.transaction('rw', [db.products, db.customers, db.suppliers, db.invoices, db.quotations, db.purchaseOrders, db.settings, db.users], async () => {
          if (data.products) { await db.products.clear(); await db.products.bulkAdd(data.products); }
          if (data.customers) { await db.customers.clear(); await db.customers.bulkAdd(data.customers); }
          if (data.suppliers) { await db.suppliers.clear(); await db.suppliers.bulkAdd(data.suppliers); }
          if (data.invoices) { await db.invoices.clear(); await db.invoices.bulkAdd(data.invoices); }
          if (data.quotations) { await db.quotations.clear(); await db.quotations.bulkAdd(data.quotations); }
          if (data.purchaseOrders) { await db.purchaseOrders.clear(); await db.purchaseOrders.bulkAdd(data.purchaseOrders); }
          if (data.settings) { await db.settings.clear(); await db.settings.bulkAdd(data.settings); }
          if (data.users) { await db.users.clear(); await db.users.bulkAdd(data.users); }
        });
        alert('Database restored successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to restore database. Invalid file format.');
      }
      setIsRestoring(false);
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (confirm('CRITICAL WARNING: This will delete ALL data. Type "DELETE" to confirm.')) {
      const p = prompt('Type DELETE to confirm');
      if (p === 'DELETE') {
         await db.delete();
         alert('Database deleted. Reloading...');
         window.location.reload();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground">Export your data safely or restore from a previous backup file.</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Download className="w-5 h-5" />
            </div>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download a complete JSON backup of all your local database records, including products, invoices, and settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
               {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
               Download Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <CardTitle>Restore Data</CardTitle>
            <CardDescription>Upload a previously exported JSON backup file. This will overwrite your current database completely.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="relative">
               <input 
                 type="file" 
                 accept=".json" 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                 onChange={handleImport}
                 disabled={isRestoring}
               />
               <Button variant="outline" disabled={isRestoring} className="w-full border-blue-200 text-blue-700 hover:bg-blue-50">
                 {isRestoring ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                 Select Backup File
               </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-red-200 bg-red-50/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
               <AlertTriangle className="w-5 h-5" />
               <CardTitle>Danger Zone</CardTitle>
            </div>
            <CardDescription className="text-red-600/80">Irreversible actions that affect your entire database.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button variant="destructive" onClick={handleClear}>
               Factory Reset / Wipe All Data
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
