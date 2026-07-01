import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Search, Package, AlertCircle, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../types';

export default function Scanner() {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<(Product & { qty: number })[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on the hidden input to capture scanner input
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scannedBarcode.trim();
      if (!code) return;
      
      fetchProductByBarcode(code);
      setScannedBarcode('');
    }
  };

  const fetchProductByBarcode = (barcode: string) => {
    setError(null);
    setProduct(null);
    
    fetch(`/api/products/scan/${encodeURIComponent(barcode)}`)
      .then(res => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then(data => {
        setProduct(data);
        addToInvoice(data);
      })
      .catch(err => {
        setError(err.message);
      });
  };

  const addToInvoice = (prod: Product) => {
    setInvoiceItems(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const totalAmount = invoiceItems.reduce((sum, item) => sum + (item.selling_price * item.qty), 0);

  return (
    <div className="flex h-full bg-brand-bg">
      {/* Hidden input to capture scanner keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute w-0 h-0"
        value={scannedBarcode}
        onChange={(e) => setScannedBarcode(e.target.value)}
        onKeyDown={handleScan}
        autoFocus
      />

      {/* Main scanning area */}
      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="bg-white border border-brand-line p-8 max-w-2xl w-full text-center mb-4">
          <div className="w-16 h-16 border-2 border-brand-line bg-brand-sidebar text-brand-ink flex items-center justify-center mx-auto mb-4">
            <ScanBarcode className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-brand-ink mb-1 uppercase tracking-tight">Ready to Scan</h2>
          <p className="text-brand-ink opacity-70 mb-6 text-sm">Use your USB barcode scanner or type the barcode below.</p>
          
          <div className="relative max-w-sm mx-auto flex border border-brand-line bg-white">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink opacity-50" />
            <input 
              type="text" 
              placeholder="Manual entry..."
              className="w-full pl-9 pr-4 py-2 text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchProductByBarcode(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {product && (
          <div className="bg-white border border-brand-line p-4 w-full max-w-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="w-12 h-12 border border-brand-line bg-brand-sidebar flex items-center justify-center text-brand-ink">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-brand-ink font-bold text-lg mb-0.5">{product.name}</div>
              <div className="text-brand-ink opacity-70 text-xs font-mono flex gap-4">
                <span>SKU: {product.sku}</span>
                <span>Barcode: {product.barcode}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-brand-ink font-bold text-xl">${product.selling_price.toFixed(2)}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white border border-red-600 p-4 w-full max-w-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-red-600 font-bold text-sm uppercase">Scan Error</div>
              <div className="text-red-600 text-xs">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Sidebar */}
      <div className="w-[300px] bg-white border-l border-brand-line flex flex-col z-10 shrink-0">
        <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider bg-brand-header text-brand-ink flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Current Invoice
        </div>
        
        <div className="flex-1 overflow-auto p-2 bg-brand-bg flex flex-col gap-2">
          {invoiceItems.length === 0 ? (
            <div className="text-center text-brand-ink opacity-50 mt-10 text-[11px] uppercase font-bold">
              <ShoppingBasketIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No items scanned yet.</p>
            </div>
          ) : (
            invoiceItems.map((item, idx) => (
              <div key={idx} className="bg-white border border-brand-line p-2 flex justify-between items-start group">
                <div>
                  <h4 className="font-bold text-brand-ink text-[11px] leading-tight">{item.name}</h4>
                  <p className="text-[10px] text-brand-ink opacity-70 font-mono mt-0.5">SKU: {item.sku}</p>
                  <div className="text-[11px] font-bold text-brand-accent mt-1">
                    ${item.selling_price.toFixed(2)} x {item.qty}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-[12px] text-brand-ink">
                  ${(item.selling_price * item.qty).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-brand-line bg-brand-sidebar text-brand-ink">
          <div className="flex justify-between items-center mb-2 text-xs font-bold uppercase">
            <span className="opacity-70">Subtotal</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-4 text-lg font-black font-mono border-t border-brand-line pt-2">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <button 
            disabled={invoiceItems.length === 0}
            className="w-full bg-brand-accent text-white border border-brand-line py-2 text-xs uppercase font-bold cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            Create Invoice
          </button>
          <button 
            onClick={() => setInvoiceItems([])}
            disabled={invoiceItems.length === 0}
            className="w-full bg-white text-red-600 border border-brand-line py-2 mt-2 text-xs uppercase font-bold cursor-pointer hover:bg-gray-100 disabled:opacity-50"
          >
            Clear List
          </button>
        </div>
      </div>
    </div>
  );
}

function ShoppingBasketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 11-1 9" />
      <path d="m19 11-4-7" />
      <path d="M2 11h20" />
      <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" />
      <path d="M4.5 15.5h15" />
      <path d="m5 11 4-7" />
      <path d="m9 11 1 9" />
    </svg>
  );
}
