import React, { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Search, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../types';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedProducts = results.data.map((row: any) => ({
          sku: row.sku || row.SKU || `AZM-${Math.floor(Math.random()*1000000)}`,
          barcode: row.barcode || row.Barcode || row.sku || row.SKU || `AZM${Math.floor(Math.random()*1000000)}`,
          name: row.name || row.Name || row['Product Name'] || 'Unknown Product',
          name_ar: row.name_ar || row['Arabic Name'] || '',
          brand: row.brand || row.Brand || '',
          category: row.category || row.Category || '',
          subcategory: row.subcategory || row.Subcategory || '',
          unit: row.unit || row.Unit || 'pcs',
          selling_price: parseFloat(row.selling_price || row['Selling Price'] || '0'),
          cost_price: parseFloat(row.cost_price || row['Cost Price'] || '0'),
          vat: parseFloat(row.vat || row.VAT || '0'),
          supplier: row.supplier || row.Supplier || '',
          stock_quantity: parseInt(row.stock_quantity || row.Stock || row.Quantity || '0', 10),
          description: row.description || row.Description || '',
          status: row.status || row.Status || 'Active'
        }));

        fetch('/api/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: parsedProducts })
        })
        .then(res => res.json())
        .then(data => {
          setMessage({ type: 'success', text: `Successfully imported ${data.count} products.` });
          fetchProducts();
        })
        .catch(err => {
          setMessage({ type: 'error', text: 'Import failed: ' + err.message });
        })
        .finally(() => {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        });
      },
      error: (err) => {
        setMessage({ type: 'error', text: 'CSV Parse error: ' + err.message });
        setImporting(false);
      }
    });
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all products? This action cannot be undone.')) {
      fetch('/api/products', { method: 'DELETE' })
        .then(() => fetchProducts())
        .catch(console.error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <div className="m-2 flex items-center justify-between shrink-0">
        <div className="flex gap-3 items-center w-full max-w-md">
          <div className="relative flex-1 border border-brand-line bg-white">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink opacity-50" />
            <input 
              type="text"
              placeholder="Search by SKU, Barcode, or Name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm outline-none bg-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-brand-accent text-white border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : '+ Import CSV'}
          </button>
          <button onClick={handleClearAll} className="bg-white text-red-600 border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:bg-gray-100 flex items-center gap-2">
            Clear Data
          </button>
        </div>
      </div>

      {message && (
        <div className={`mx-2 mb-2 p-2 border border-brand-line text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <CheckCircle2 className="w-4 h-4" />
          {message.text}
        </div>
      )}

      <div className="border border-brand-line m-2 mt-0 bg-white flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider flex justify-between items-center bg-brand-header text-brand-ink shrink-0">
          <span>Product Explorer</span>
          <span className="text-[10px] font-normal normal-case opacity-70">Showing {filteredProducts.length} items</span>
        </div>

        <div className="grid grid-cols-[100px_2fr_1fr_120px_100px_80px] bg-brand-sidebar border-b border-brand-line shrink-0">
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1">SKU</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1 border-l border-brand-line">Product Name</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1 border-l border-brand-line">Category</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1 border-l border-brand-line">Barcode</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1 text-right border-l border-brand-line">Price</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1 text-right border-l border-brand-line">Stock</div>
        </div>

        <div className="flex-1 overflow-auto bg-brand-bg">
          {loading ? (
            <div className="p-8 text-center text-[11px] opacity-60">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-[11px] opacity-60">No products found.</div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.id} className="grid grid-cols-[100px_2fr_1fr_120px_100px_80px] text-[11px] border-b border-[#ddd] items-center h-8 px-0 cursor-pointer hover:bg-brand-ink hover:text-white transition-colors">
                <div className="px-2 truncate">{p.sku}</div>
                <div className="px-2 font-bold truncate">{p.name}</div>
                <div className="px-2 truncate">{p.category || '-'}</div>
                <div className="px-2 font-mono truncate">{p.barcode}</div>
                <div className="px-2 text-right">${p.selling_price.toFixed(2)}</div>
                <div className="px-2 text-right font-mono text-xs">{p.stock_quantity}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
