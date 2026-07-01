import { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { Printer, Settings2 } from 'lucide-react';
import { Product } from '../types';

export default function PrintLabels() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [labelSize, setLabelSize] = useState('50x25'); // mm
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data.products || []));
  }, []);

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handlePrint = () => {
    if (selectedIds.size === 0) return alert('Select at least one product to print');
    
    // Simple window print - in a real app this could generate a PDF
    window.print();
  };

  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  // A4 roughly 210x297mm. If label is 50x25mm, we can fit roughly 4 cols, 11 rows = 44 per page
  // We will let CSS Grid handle the layout for printing
  
  return (
    <div className="flex flex-col h-full bg-brand-bg print:bg-white print:p-0">
      <div className="flex h-full overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-[300px] bg-white border-r border-brand-line flex flex-col h-full print:hidden shrink-0">
          <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider bg-brand-header text-brand-ink flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Label Designer Settings</span>
          </div>
          
          <div className="p-4 flex-1 overflow-auto flex flex-col gap-4 bg-brand-bg">
            <div className="bg-white border border-brand-line p-3">
              <label className="block text-[11px] font-bold uppercase mb-2">Label Size</label>
              <select 
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                className="w-full border border-brand-line px-2 py-1.5 text-xs outline-none bg-brand-sidebar cursor-pointer"
              >
                <option value="38x21">38 × 21 mm</option>
                <option value="40x25">40 × 25 mm</option>
                <option value="50x25">50 × 25 mm</option>
                <option value="60x40">60 × 40 mm</option>
              </select>
            </div>

            <div className="flex-1 flex flex-col border border-brand-line bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-brand-line font-bold text-[11px] uppercase tracking-wider flex justify-between items-center bg-brand-header">
                <span>Products ({selectedIds.size})</span>
                <button onClick={selectAll} className="text-[10px] text-brand-ink underline">
                  {selectedIds.size === products.length ? 'Clear' : 'All'}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-brand-ink hover:text-white cursor-pointer border-b border-[#ddd] last:border-0 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.id)} 
                      onChange={() => toggleSelect(p.id)}
                      className="accent-brand-ink"
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[11px] font-bold truncate leading-none mb-1">{p.name}</div>
                      <div className="text-[10px] opacity-70 font-mono truncate leading-none">{p.sku}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={handlePrint}
              disabled={selectedIds.size === 0}
              className="w-full bg-brand-accent text-white border border-brand-line py-2 text-xs uppercase font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              <Printer className="w-4 h-4" />
              Generate Labels
            </button>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 bg-brand-bg overflow-auto p-4 flex flex-col items-center justify-start print:p-0 print:bg-white print:overflow-visible">
          <div className="w-full max-w-4xl border border-brand-line bg-white shadow-[10px_10px_0_rgba(0,0,0,0.1)] print:shadow-none print:border-none print:max-w-none">
            <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider bg-brand-header text-brand-ink print:hidden">
              Live Preview Output
            </div>
            <div className="p-8 print:p-0 print:bg-white bg-[#999] min-h-[500px]">
              <div 
                ref={printRef}
                className="grid gap-2 print:gap-0 justify-center" 
                style={{ 
                  gridTemplateColumns: `repeat(auto-fill, minmax(${labelSize.split('x')[0]}mm, 1fr))` 
                }}
              >
                {selectedProducts.map(p => (
                  <div 
                    key={p.id} 
                    className="border border-brand-line p-2 flex flex-col items-center justify-between bg-white print:border-none print:break-inside-avoid shadow-[5px_5px_0_rgba(0,0,0,0.1)] print:shadow-none"
                    style={{
                      width: `${labelSize.split('x')[0]}mm`,
                      height: `${labelSize.split('x')[1]}mm`,
                    }}
                  >
                    <div className="flex justify-between items-start w-full gap-1">
                      <div className="text-[10px] font-bold leading-tight truncate w-full">{p.name}</div>
                      <div className="text-[10px] font-black border border-brand-line px-1 whitespace-nowrap">${p.selling_price.toFixed(2)}</div>
                    </div>
                    
                    <Barcode 
                      value={p.barcode || p.sku} 
                      format="CODE128"
                      width={1.2}
                      height={labelSize === '38x21' ? 25 : 35}
                      displayValue={false}
                      margin={0}
                    />

                    <div className="flex justify-between items-end w-full">
                      <div className="text-[9px] font-mono leading-none">{p.sku}</div>
                      <div className="text-[10px] font-mono leading-none">{p.barcode || p.sku}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
