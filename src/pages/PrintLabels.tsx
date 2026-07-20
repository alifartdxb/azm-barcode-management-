import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { 
  Printer, Settings2, Sparkles, Layout, ToggleLeft, 
  Layers, Plus, Minus, CheckSquare, Square, RefreshCw, 
  HelpCircle, CheckCircle2, AlertCircle, FileText, ChevronRight,
  Maximize2, Eye, EyeOff
} from 'lucide-react';
import { Product } from '../types';
import { validateBarcode } from '../utils/barcode';
import { ProductService } from '../services/ProductService';

interface LabelTemplate {
  id: string;
  name: string;
  mode: 'A4' | 'thermal';
  columns: number;
  rows: number;
  labelWidth: number;   // mm
  labelHeight: number;  // mm
  columnGap: number;    // mm
  rowGap: number;       // mm
  topMargin: number;    // mm
  leftMargin: number;   // mm
}


const TEMPLATES: LabelTemplate[] = [
  // A4 Layouts
  { id: 'A4-2x8', name: 'A4 Sheet (2 × 8)', mode: 'A4', columns: 2, rows: 8, labelWidth: 75.0, labelHeight: 35.0, columnGap: 0.0, rowGap: 0.0, topMargin: 8.5, leftMargin: 30.0 },
  { id: 'L7159', name: 'A4 - L7159 (3 x 8, 63.5×33.9mm)', mode: 'A4', columns: 3, rows: 8, labelWidth: 63.5, labelHeight: 33.9, columnGap: 2.5, rowGap: 0, topMargin: 12.9, leftMargin: 7.2 },
  { id: 'L7160', name: 'A4 - L7160 (3 x 7, 63.5×38.1mm)', mode: 'A4', columns: 3, rows: 7, labelWidth: 63.5, labelHeight: 38.1, columnGap: 2.5, rowGap: 0, topMargin: 15.1, leftMargin: 7.2 },
  { id: 'L7163', name: 'A4 - L7163 (2 x 7, 99.1×38.1mm)', mode: 'A4', columns: 2, rows: 7, labelWidth: 99.1, labelHeight: 38.1, columnGap: 2.5, rowGap: 0, topMargin: 15.1, leftMargin: 4.7 },
  { id: 'A4-24',  name: 'A4 - Standard (3 x 8, 70×37.0mm)',  mode: 'A4', columns: 3, rows: 8, labelWidth: 70.0, labelHeight: 37.0, columnGap: 0.0, rowGap: 0, topMargin: 0.5, leftMargin: 0.5 },
  
  // Thermal Continuous layouts
  { id: 'thermal-40-25', name: 'Thermal - 40 × 25 mm (Continuous)', mode: 'thermal', columns: 1, rows: 1, labelWidth: 40, labelHeight: 25, columnGap: 0, rowGap: 0, topMargin: 0, leftMargin: 0 },
  { id: 'thermal-50-25', name: 'Thermal - 50 × 25 mm (Continuous)', mode: 'thermal', columns: 1, rows: 1, labelWidth: 50, labelHeight: 25, columnGap: 0, rowGap: 0, topMargin: 0, leftMargin: 0 },
  { id: 'thermal-60-40', name: 'Thermal - 60 × 40 mm (Continuous)', mode: 'thermal', columns: 1, rows: 1, labelWidth: 60, labelHeight: 40, columnGap: 0, rowGap: 0, topMargin: 0, leftMargin: 0 },
  { id: 'thermal-75-35', name: 'Thermal - 75 × 35 mm (Continuous)', mode: 'thermal', columns: 1, rows: 1, labelWidth: 75, labelHeight: 35, columnGap: 0, rowGap: 0, topMargin: 0, leftMargin: 0 },
  { id: 'thermal-80-50', name: 'Thermal - 80 × 50 mm (Continuous)', mode: 'thermal', columns: 1, rows: 1, labelWidth: 80, labelHeight: 50, columnGap: 0, rowGap: 0, topMargin: 0, leftMargin: 0 },
  
  // Custom
  { id: 'custom', name: 'Custom Calibration Template...', mode: 'A4', columns: 3, rows: 8, labelWidth: 63.5, labelHeight: 33.9, columnGap: 2, rowGap: 2, topMargin: 10, leftMargin: 10 }
];

export default function PrintLabels() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection and Quantity Maps
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  
  // Active Template State (with local storage restoration)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return localStorage.getItem('mfms_label_default_template') || 'A4-2x8';
  });
  const [customSpecs, setCustomSpecs] = useState<LabelTemplate>(() => {
    const saved = localStorage.getItem('mfms_label_custom_specs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      id: 'custom', name: 'Custom Calibration Template...', mode: 'A4', columns: 3, rows: 8, labelWidth: 63.5, labelHeight: 38.1, columnGap: 2, rowGap: 0, topMargin: 10, leftMargin: 10
    };
  });

  // Current applied template configurations
  const activeTemplate = selectedTemplateId === 'custom' 
    ? customSpecs 
    : TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

  // Visual Designer options
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [showHeader, setShowHeader] = useState(false);
  const [headerText, setHeaderText] = useState('AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)');
  const [headerFontSize, setHeaderFontSize] = useState(7);
  
  const [showName, setShowName] = useState(true);
  const [nameFontSize, setNameFontSize] = useState(9);
  
  const [showPrice, setShowPrice] = useState<boolean>(() => {
    const saved = localStorage.getItem('mfms_label_show_price');
    return saved !== null ? saved === 'true' : true;
  });
  const [priceFontSize, setPriceFontSize] = useState(11);
  const [priceStyle, setPriceStyle] = useState<'standard' | 'badge' | 'inverse'>('badge');
  const [currency, setCurrency] = useState('AED');

  const [showSku, setShowSku] = useState(true);
  const [skuFontSize, setSkuFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('mfms_label_sku_font_size');
    return saved !== null ? parseInt(saved, 10) : 10;
  });

  const [showPriceCode, setShowPriceCode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mfms_label_show_price_code');
    return saved !== null ? saved === 'true' : true;
  });
  const [priceCodeFontSize, setPriceCodeFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('mfms_label_price_code_font_size');
    return saved !== null ? parseInt(saved, 10) : 10;
  });

  const [showBrand, setShowBrand] = useState<boolean>(() => {
    const saved = localStorage.getItem('mfms_label_show_brand');
    return saved !== null ? saved === 'true' : true;
  });

  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [barcodeTextFontSize, setBarcodeTextFontSize] = useState(8);
  
  const [barcodeHeight, setBarcodeHeight] = useState(26); // in px
  const [barcodeWidth, setBarcodeWidth] = useState(1.1); // scaling factor
  const [barcodeFormat, setBarcodeFormat] = useState<'CODE128' | 'EAN13'>('CODE128');
  
  const [showBorder, setShowBorder] = useState(true);
  const [labelPadding, setLabelPadding] = useState(2); // internal padding in mm
  
  // Quick batch config
  const [bulkQty, setBulkQty] = useState<string>(() => {
    return localStorage.getItem('mfms_label_bulk_qty') || '1';
  });
  const [activeTab, setActiveTab] = useState<'template' | 'style' | 'items'>('template');

  // Save preferences when state changes
  useEffect(() => {
    localStorage.setItem('mfms_label_default_template', selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    localStorage.setItem('mfms_label_custom_specs', JSON.stringify(customSpecs));
  }, [customSpecs]);

  useEffect(() => {
    localStorage.setItem('mfms_label_show_brand', String(showBrand));
  }, [showBrand]);

  useEffect(() => {
    localStorage.setItem('mfms_label_show_price', String(showPrice));
  }, [showPrice]);

  useEffect(() => {
    localStorage.setItem('mfms_label_sku_font_size', String(skuFontSize));
  }, [skuFontSize]);

  useEffect(() => {
    localStorage.setItem('mfms_label_show_price_code', String(showPriceCode));
  }, [showPriceCode]);

  useEffect(() => {
    localStorage.setItem('mfms_label_price_code_font_size', String(priceCodeFontSize));
  }, [priceCodeFontSize]);

  useEffect(() => {
    localStorage.setItem('mfms_label_bulk_qty', bulkQty);
  }, [bulkQty]);

  useEffect(() => {
    ProductService.getAll()
      .then(prods => {
        setProducts(prods);
        
        // Pre-select first 3 products to show quick previews, and initialize quantities to 1
        const initialSelected = new Set<number>();
        const initialQtys: Record<number, number> = {};
        prods.forEach((p: Product, i: number) => {
          initialQtys[p.id!] = 1;
          if (i < 3) {
            initialSelected.add(p.id!);
          }
        });
        setSelectedIds(initialSelected);
        setQuantities(initialQtys);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products', err);
        setLoading(false);
      });
  }, []);


  // Update specific values in custom template
  const handleCustomChange = (key: keyof LabelTemplate, val: any) => {
    setCustomSpecs(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      if (!quantities[id]) {
        setQuantities(prev => ({
          ...prev,
          [id]: 1
        }));
      }
    }
    setSelectedIds(newSet);
  };

  const handleQtyChange = (id: number, val: number) => {
    const cleanVal = Math.max(1, isNaN(val) ? 1 : val);
    setQuantities(prev => ({
      ...prev,
      [id]: cleanVal
    }));
  };

  const applyBulkQty = () => {
    const parsed = parseInt(bulkQty, 10);
    if (isNaN(parsed) || parsed < 1) return;
    const newQtys = { ...quantities };
    selectedIds.forEach(id => {
      newQtys[id] = parsed;
    });
    setQuantities(newQtys);
  };

  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id!)));
      const newQtys = { ...quantities };
      products.forEach(p => {
        newQtys[p.id!] = 1;
      });
      setQuantities(newQtys);
    }
  };

  // Compile active label matrix (expand by copies count)
  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  const expandedLabels: Product[] = [];
  selectedProducts.forEach(p => {
    const count = quantities[p.id] || 1;
    for (let i = 0; i < count; i++) {
      expandedLabels.push(p);
    }
  });

  // Organize labels into sheets if mode is A4
  const labelsPerPage = activeTemplate.columns * activeTemplate.rows;
  const pages: (Product | null)[][] = [];
  
  if (activeTemplate.mode === 'A4') {
    let currentPage: (Product | null)[] = [];
    expandedLabels.forEach(label => {
      if (currentPage.length === labelsPerPage) {
        pages.push(currentPage);
        currentPage = [];
      }
      currentPage.push(label);
    });
    // Pad the last page with empty slots so elements remain perfectly aligned in the grid
    if (currentPage.length > 0) {
      while (currentPage.length < labelsPerPage) {
        currentPage.push(null);
      }
      pages.push(currentPage);
    }
  } else {
    // For thermal rolls, pages represents individual stickers (single cell list)
    pages.push(...expandedLabels.map(label => [label]));
  }

  // Trigger Native browser printing flow with fully custom styling overrides
  const handlePrint = () => {
    if (selectedIds.size === 0) {
      alert('Selection Required: Choose at least one product sticker to compile.');
      return;
    }
    window.print();
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-brand-bg print:bg-white print:p-0 print:h-auto print:overflow-visible">
      
      {/* Dynamic Print CSS Style Injection */}
      <style>{`
        @media print {
          /* Force scrollbar hiding on all elements during print */
          * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          *::-webkit-scrollbar {
            display: none !important;
          }

          /* Reset heights and overflows on all layout/ancestor containers to prevent scrollbar rendering and clipping */
          html, body, #root, main,
          .flex.h-screen, 
          .flex-1.flex-col,
          .flex.flex-col.h-full.bg-brand-bg,
          .flex.h-full.overflow-hidden,
          .flex-1.bg-brand-bg.overflow-auto,
          .print-canvas {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            position: relative !important;
            background: white !important;
          }

          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden, .print-hidden, header, nav, aside {
            display: none !important;
          }
          .print-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: ${activeTemplate.mode === 'A4' ? 'A4 portrait' : `${activeTemplate.labelWidth}mm ${activeTemplate.labelHeight}mm`};
            margin: 0 !important;
          }
          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
            display: grid !important;
          }
        }
      `}</style>

      <div className="flex h-full overflow-hidden print:block print:h-auto print:overflow-visible">
        
        {/* SIDE PANEL DESIGNER CONTROLS */}
        <div className="w-[360px] bg-white border-r-2 border-brand-line flex flex-col h-full print:hidden shrink-0">
          
          <div className="px-3 py-2 border-b-2 border-brand-line font-bold text-[11px] uppercase tracking-wider bg-brand-header text-brand-ink flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-sans font-black">
              <Settings2 className="w-4 h-4 text-brand-accent animate-pulse" />
              LABEL DESIGN ENGINE
            </span>
            <span className="bg-brand-ink text-white text-[9px] px-1.5 py-0.5 font-mono">v2.1 Enterprise</span>
          </div>

          {/* Designer Tab Switches */}
          <div className="grid grid-cols-3 border-b border-brand-line text-center bg-brand-sidebar shrink-0">
            <button 
              onClick={() => setActiveTab('template')}
              className={`py-2 text-[10px] font-bold uppercase border-r border-brand-line ${activeTab === 'template' ? 'bg-white text-brand-ink border-b-2 border-b-brand-ink' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              1. Paper Specs
            </button>
            <button 
              onClick={() => setActiveTab('style')}
              className={`py-2 text-[10px] font-bold uppercase border-r border-brand-line ${activeTab === 'style' ? 'bg-white text-brand-ink border-b-2 border-b-brand-ink' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              2. Design Style
            </button>
            <button 
              onClick={() => setActiveTab('items')}
              className={`py-2 text-[10px] font-bold uppercase ${activeTab === 'items' ? 'bg-white text-brand-ink border-b-2 border-b-brand-ink' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              3. Quantities
            </button>
          </div>

          <div className="flex-1 overflow-auto p-3.5 flex flex-col gap-3.5 bg-brand-bg">
            
            {/* TAB 1: TEMPLATE & CALIBRATION */}
            {activeTab === 'template' && (
              <div className="flex flex-col gap-3">
                
                {/* Mode description box */}
                <div className="bg-brand-sidebar border border-brand-line p-2.5 flex items-start gap-2">
                  <Layout className="w-4 h-4 text-brand-ink shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[11px] uppercase block">Target Printer Mode</span>
                    <p className="text-[10px] opacity-75">Switch below between multi-sticker A4 Sheets (laser/inkjet) or Single Label continuous rolls (Zebra, TSC, Brother, Dymo).</p>
                  </div>
                </div>

                <div className="bg-white border border-brand-line p-3 flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Select Label Template</label>
                    <select 
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full border border-brand-line px-2 py-1.5 text-xs outline-none bg-brand-sidebar cursor-pointer font-bold"
                    >
                      {TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mode display badge */}
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2.5">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Output Technology:</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border ${
                      activeTemplate.mode === 'A4' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {activeTemplate.mode === 'A4' ? 'A4 Sticker Sheet' : 'Direct Thermal Roll'}
                    </span>
                  </div>
                </div>

                {/* Grid & Calibration Manual Overrides */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-3">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-[10px] uppercase text-brand-ink">Millimeter Calibration Overrides</span>
                    {selectedTemplateId !== 'custom' && (
                      <span className="text-[9px] text-gray-400 italic font-mono">Preset Locked</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Label Width (mm)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={activeTemplate.labelWidth}
                        disabled={selectedTemplateId !== 'custom'}
                        onChange={(e) => handleCustomChange('labelWidth', parseFloat(e.target.value) || 0)}
                        className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Label Height (mm)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={activeTemplate.labelHeight}
                        disabled={selectedTemplateId !== 'custom'}
                        onChange={(e) => handleCustomChange('labelHeight', parseFloat(e.target.value) || 0)}
                        className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  {activeTemplate.mode === 'A4' && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Cols in Grid</label>
                          <input 
                            type="number"
                            value={activeTemplate.columns}
                            disabled={selectedTemplateId !== 'custom'}
                            onChange={(e) => handleCustomChange('columns', parseInt(e.target.value, 10) || 1)}
                            className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Rows in Grid</label>
                          <input 
                            type="number"
                            value={activeTemplate.rows}
                            disabled={selectedTemplateId !== 'custom'}
                            onChange={(e) => handleCustomChange('rows', parseInt(e.target.value, 10) || 1)}
                            className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Top Margin (mm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={activeTemplate.topMargin}
                            disabled={selectedTemplateId !== 'custom'}
                            onChange={(e) => handleCustomChange('topMargin', parseFloat(e.target.value) || 0)}
                            className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Side Margin (mm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={activeTemplate.leftMargin}
                            disabled={selectedTemplateId !== 'custom'}
                            onChange={(e) => handleCustomChange('leftMargin', parseFloat(e.target.value) || 0)}
                            className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Col Gap (mm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={activeTemplate.columnGap}
                            disabled={selectedTemplateId !== 'custom'}
                            onChange={(e) => handleCustomChange('columnGap', parseFloat(e.target.value) || 0)}
                            className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Row Gap (mm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={activeTemplate.rowGap}
                            disabled={selectedTemplateId !== 'custom'}
                            onChange={(e) => handleCustomChange('rowGap', parseFloat(e.target.value) || 0)}
                            className="w-full border border-brand-line px-2 py-1 text-xs font-mono disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {selectedTemplateId !== 'custom' && (
                    <button 
                      onClick={() => {
                        setSelectedTemplateId('custom');
                        setCustomSpecs({
                          ...activeTemplate,
                          id: 'custom',
                          name: 'Custom Calibration Template (Clone)...'
                        });
                      }}
                      className="text-center font-bold text-[9px] uppercase text-brand-ink border border-brand-line py-1 hover:bg-gray-50 cursor-pointer"
                    >
                      Clone Current Template to Customize & Overwrite
                    </button>
                  )}
                </div>

                {/* Quick Toggle guidelines helper */}
                <div className="bg-white border border-brand-line p-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[10px] uppercase block">Designer Guidelines</span>
                    <span className="text-[9px] text-gray-500">Show margins and pad markers on preview</span>
                  </div>
                  <button 
                    onClick={() => setShowGuidelines(!showGuidelines)}
                    className={`px-3 py-1 font-bold text-[10px] uppercase border cursor-pointer ${
                      showGuidelines ? 'bg-brand-ink text-white' : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {showGuidelines ? 'ACTIVE' : 'MUTED'}
                  </button>
                </div>

              </div>
            )}

            {/* TAB 2: VISUAL STYLE OVERRIDES */}
            {activeTab === 'style' && (
              <div className="flex flex-col gap-3">
                
                {/* Brand Display Toggle */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={showBrand}
                        onChange={(e) => setShowBrand(e.target.checked)}
                        className="accent-brand-ink cursor-pointer"
                      />
                      Show Product Brand
                    </label>
                  </div>
                </div>

                {/* Product Name Title Style */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase">
                      <input 
                        type="checkbox"
                        checked={showName}
                        onChange={(e) => setShowName(e.target.checked)}
                        className="accent-brand-ink"
                      />
                      English Title
                    </label>
                    
                  </div>
                </div>

                {/* Arabic Title Style */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    
                    
                  </div>
                </div>

                {/* Selling Price Display Options */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase">
                      <input 
                        type="checkbox"
                        checked={showPrice}
                        onChange={(e) => setShowPrice(e.target.checked)}
                        className="accent-brand-ink"
                      />
                      Retail Price Indicator
                    </label>
                    
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block mb-0.5">Price Style</span>
                      <select 
                        value={priceStyle}
                        onChange={(e: any) => setPriceStyle(e.target.value)}
                        className="w-full border border-brand-line text-xs p-1 bg-brand-sidebar"
                      >
                        <option value="standard">Simple text</option>
                        <option value="badge">Outlined Box</option>
                        <option value="inverse">Inverse Black Box</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block mb-0.5">Currency</span>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full border border-brand-line text-xs p-1 bg-brand-sidebar font-mono"
                      >
                        <option value="AED">AED</option>
                        <option value="$">USD ($)</option>
                        <option value="SAR">SAR</option>
                        <option value="QAR">QAR</option>
                        <option value="OMR">OMR</option>
                        <option value="BHD">BHD</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SKU Code Toggles & Font Size */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={showSku}
                        onChange={(e) => setShowSku(e.target.checked)}
                        className="accent-brand-ink cursor-pointer"
                      />
                      Product SKU
                    </label>
                  </div>
                  {showSku && (
                    <div className="flex flex-col gap-2 border-t border-dashed border-gray-100 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase text-gray-500 font-bold">SKU Font Size (pt)</span>
                        <input 
                          type="number"
                          min="6"
                          max="18"
                          value={skuFontSize}
                          onChange={(e) => setSkuFontSize(Math.min(18, Math.max(6, parseInt(e.target.value, 10) || 10)))}
                          className="w-12 border border-brand-line text-center text-xs font-mono p-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-gray-400 font-mono">6pt</span>
                        <input 
                          type="range"
                          min="6"
                          max="18"
                          value={skuFontSize}
                          onChange={(e) => setSkuFontSize(parseInt(e.target.value, 10))}
                          className="flex-1 h-4 accent-brand-ink"
                        />
                        <span className="text-[8px] text-gray-400 font-mono">18pt</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Code Toggles & Font Size */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={showPriceCode}
                        onChange={(e) => setShowPriceCode(e.target.checked)}
                        className="accent-brand-ink cursor-pointer"
                      />
                      Price Code (Bottom-Right)
                    </label>
                  </div>
                  {showPriceCode && (
                    <div className="flex flex-col gap-2 border-t border-dashed border-gray-100 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase text-gray-500 font-bold">Price Code Font Size (pt)</span>
                        <input 
                          type="number"
                          min="6"
                          max="18"
                          value={priceCodeFontSize}
                          onChange={(e) => setPriceCodeFontSize(Math.min(18, Math.max(6, parseInt(e.target.value, 10) || 10)))}
                          className="w-12 border border-brand-line text-center text-xs font-mono p-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-gray-400 font-mono">6pt</span>
                        <input 
                          type="range"
                          min="6"
                          max="18"
                          value={priceCodeFontSize}
                          onChange={(e) => setPriceCodeFontSize(parseInt(e.target.value, 10))}
                          className="flex-1 h-4 accent-brand-ink"
                        />
                        <span className="text-[8px] text-gray-400 font-mono">18pt</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barcode Vector Dimensions */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2.5">
                  <span className="font-bold text-[10px] uppercase block">Barcode Layout Parameters</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block mb-0.5">Standards</span>
                      <select 
                        value={barcodeFormat}
                        onChange={(e: any) => setBarcodeFormat(e.target.value)}
                        className="w-full border border-brand-line text-xs p-1 bg-brand-sidebar font-mono"
                      >
                        <option value="CODE128">CODE-128</option>
                        <option value="EAN13">EAN-13</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block mb-0.5">Lines Height</span>
                      <input 
                        type="range"
                        min="15"
                        max="60"
                        value={barcodeHeight}
                        onChange={(e) => setBarcodeHeight(parseInt(e.target.value, 10))}
                        className="w-full h-4 accent-brand-ink"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-dashed border-gray-100 pt-2 mt-1">
                    <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase">
                      <input 
                        type="checkbox"
                        checked={showBarcodeText}
                        onChange={(e) => setShowBarcodeText(e.target.checked)}
                        className="accent-brand-ink"
                      />
                      Display Numeric String
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-400 font-mono">Size:</span>
                      <input 
                        type="number"
                        value={barcodeTextFontSize}
                        onChange={(e) => setBarcodeTextFontSize(parseInt(e.target.value, 10) || 6)}
                        className="w-10 border border-brand-line text-center text-[10px] font-mono p-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Borders, Paddings, margins */}
                <div className="bg-white border border-brand-line p-3 flex flex-col gap-2.5">
                  <span className="font-bold text-[10px] uppercase block">Card Outer Boundaries</span>
                  
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input 
                        type="checkbox"
                        checked={showBorder}
                        onChange={(e) => setShowBorder(e.target.checked)}
                        className="accent-brand-ink"
                      />
                      Draw Label Outer Border Line
                    </label>
                  </div>

                  <div className="flex justify-between items-center border-t border-dashed border-gray-100 pt-2">
                    <span className="text-xs">Internal Padding Margin</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number"
                        min="0"
                        max="10"
                        value={labelPadding}
                        onChange={(e) => setLabelPadding(parseFloat(e.target.value) || 0)}
                        className="w-12 border border-brand-line text-center text-xs font-mono p-0.5"
                      />
                      <span className="text-[10px] text-gray-400">mm</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: BATCH PRODUCTS & QUANTITIES */}
            {activeTab === 'items' && (
              <div className="flex flex-col gap-3 h-full">
                
                {/* Search products bar */}
                <div className="bg-white border border-brand-line p-2.5">
                  <input 
                    type="text"
                    placeholder="Filter products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-brand-line p-1.5 text-xs outline-none bg-brand-sidebar"
                  />
                </div>

                {/* Bulk tools */}
                <div className="bg-brand-sidebar border border-brand-line p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <span>Set selected to:</span>
                      <input 
                        type="number"
                        value={bulkQty}
                        onChange={(e) => setBulkQty(e.target.value)}
                        className="w-12 border border-brand-line p-1 text-center font-mono text-xs bg-white"
                      />
                    </div>
                    <button 
                      onClick={applyBulkQty}
                      className="bg-brand-ink text-white text-[10px] font-bold px-3 py-1 border border-brand-line hover:bg-opacity-90 cursor-pointer uppercase"
                    >
                      Apply Qty
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      const newQtys = { ...quantities };
                      selectedIds.forEach(id => {
                        newQtys[id] = 1;
                      });
                      setQuantities(newQtys);
                    }}
                    className="w-full bg-white text-brand-ink border border-brand-line hover:bg-gray-50 text-[10px] font-bold py-1 cursor-pointer uppercase text-center"
                  >
                    Set All Selected (Qty = 1)
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-white border border-brand-line flex flex-col min-h-[180px]">
                  <div className="px-2.5 py-1.5 bg-brand-header text-[10px] font-bold uppercase border-b border-brand-line flex justify-between items-center">
                    <span>Available Index ({products.length})</span>
                    <button 
                      onClick={selectAll} 
                      className="text-[9px] font-bold underline text-brand-ink hover:opacity-80"
                    >
                      {selectedIds.size === products.length ? 'Clear Select' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-auto divide-y divide-gray-100">
                    {filteredProducts.map(p => {
                      const isSelected = selectedIds.has(p.id);
                      const qty = quantities[p.id] || 1;
                      return (
                        <div key={p.id} className="p-2 flex items-center gap-2 hover:bg-brand-bg">
                          <button 
                            onClick={() => toggleSelect(p.id)}
                            className="text-brand-ink opacity-80 hover:opacity-100"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-brand-accent fill-brand-accent/10" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0" onClick={() => toggleSelect(p.id)}>
                            <div className="text-[11px] font-bold truncate leading-tight">{p.name}</div>
                            <div className="text-[9px] font-mono text-gray-400 truncate">{p.sku} {p.barcode ? `• ${p.barcode}` : '• No barcode'}</div>
                          </div>

                          {/* Individual quantity modifier */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => handleQtyChange(p.id, qty - 1)}
                              disabled={!isSelected}
                              className="w-4 h-4 border border-brand-line flex items-center justify-center bg-gray-50 text-[9px] hover:bg-gray-100 disabled:opacity-40"
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              value={qty}
                              disabled={!isSelected}
                              onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value, 10))}
                              className="w-8 border border-brand-line text-center text-[10px] font-mono p-0.5 disabled:opacity-40"
                            />
                            <button 
                              onClick={() => handleQtyChange(p.id, qty + 1)}
                              disabled={!isSelected}
                              className="w-4 h-4 border border-brand-line flex items-center justify-center bg-gray-50 text-[9px] hover:bg-gray-100 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* QUICK ACTIONS BUTTONS */}
            <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-brand-line shrink-0">
              <button 
                onClick={handlePrint}
                disabled={selectedIds.size === 0}
                className="w-full bg-brand-ink text-white border-2 border-brand-line py-2.5 text-xs uppercase font-bold cursor-pointer hover:bg-opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[4px_4px_0_rgba(0,0,0,0.15)] hover:shadow-none transition-all"
              >
                <Printer className="w-4 h-4" />
                Compile & Print Labels
              </button>
              
              <div className="text-center text-[10px] text-gray-500 font-mono">
                Total stickers to build: <strong className="text-brand-ink">{expandedLabels.length}</strong> 
                {activeTemplate.mode === 'A4' && (
                  <span> ({pages.length} sheets)</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* MAIN LIVE SIMULATOR VIEWPORT */}
        <div className="flex-1 bg-brand-bg overflow-auto p-4 flex flex-col items-center justify-start print:p-0 print:bg-white print:overflow-visible print:block print:h-auto">
          
          <div className="w-full max-w-4xl border-2 border-brand-line bg-white shadow-[10px_10px_0_rgba(0,0,0,0.1)] print:shadow-none print:border-none print:max-w-none flex flex-col print:block print:h-auto print:overflow-visible">
            
            <div className="px-3 py-2 border-b border-brand-line font-bold text-[11px] uppercase tracking-wider bg-brand-header text-brand-ink flex justify-between items-center print:hidden">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-ink" />
                <span>Live Sticker Grid Simulator</span>
              </div>
              
              <div className="flex gap-2 items-center text-[10px] font-mono bg-white border border-brand-line px-2 py-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-ping"></span>
                <span>Page Size Mode: {activeTemplate.mode === 'A4' ? 'A4 Paper (210×297mm)' : 'Thermal continuous roll'}</span>
              </div>
            </div>

            {/* Warning if no selection */}
            {selectedIds.size === 0 && (
              <div className="p-8 text-center bg-yellow-50 border-b border-brand-line text-xs font-bold text-yellow-800 flex items-center justify-center gap-2 print:hidden">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span>Select at least one product in the right sidebar (Tab 3. Quantities) to begin visual render.</span>
              </div>
            )}

            {/* SIMULATOR SHEET CONTAINER */}
            <div className="p-8 print:p-0 bg-[#555] print:bg-white min-h-[600px] flex flex-col items-center gap-8 overflow-auto print:overflow-visible print-canvas">
              
              {activeTemplate.mode === 'A4' ? (
                /* A4 SHEET MODE GENERATOR */
                pages.map((page, pageIdx) => (
                  <div 
                    key={pageIdx}
                    className="bg-white print:border-none relative shadow-[0_15px_30px_rgba(0,0,0,0.3)] print:shadow-none print-page-break"
                    style={{
                      width: '210mm',
                      height: '297mm',
                      paddingTop: `${activeTemplate.topMargin}mm`,
                      paddingBottom: `${activeTemplate.topMargin}mm`, // balanced top/bottom
                      paddingLeft: `${activeTemplate.leftMargin}mm`,
                      paddingRight: `${activeTemplate.leftMargin}mm`,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${activeTemplate.columns}, ${activeTemplate.labelWidth}mm)`,
                      gridTemplateRows: `repeat(${activeTemplate.rows}, ${activeTemplate.labelHeight}mm)`,
                      columnGap: `${activeTemplate.columnGap}mm`,
                      rowGap: `${activeTemplate.rowGap}mm`,
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Visual A4 Watermark Margin lines for Design Guidance (hidden in print) */}
                    {showGuidelines && (
                      <div className="absolute inset-0 border border-dashed border-red-300 pointer-events-none print:hidden" style={{
                        top: `${activeTemplate.topMargin}mm`,
                        left: `${activeTemplate.leftMargin}mm`,
                        right: `${activeTemplate.leftMargin}mm`,
                        bottom: `${activeTemplate.topMargin}mm`
                      }}>
                        <div className="absolute top-1 left-1 bg-red-100 text-red-700 text-[8px] font-mono font-bold px-1 uppercase scale-90">A4 Margin ({activeTemplate.leftMargin}mm)</div>
                      </div>
                    )}

                    {page.map((product, labelIdx) => {
                      if (!product) {
                        // Empty slot to maintain laser sheet structure alignment
                        return (
                          <div 
                            key={`empty-${labelIdx}`} 
                            className="flex items-center justify-center border border-dashed border-gray-200 text-gray-300 font-mono text-[9px] uppercase tracking-wider bg-gray-50 print:border-none print:bg-transparent"
                            style={{
                              width: `${activeTemplate.labelWidth}mm`,
                              height: `${activeTemplate.labelHeight}mm`,
                              boxSizing: 'border-box'
                            }}
                          >
                            {showGuidelines && <span></span>}
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={`label-${labelIdx}`}
                          className="relative flex flex-col justify-between bg-white text-black break-inside-avoid overflow-hidden"
                          style={{
                            width: `${activeTemplate.labelWidth}mm`,
                            height: `${activeTemplate.labelHeight}mm`,
                            border: showBorder ? '1px solid #111' : 'none',
                            padding: `${labelPadding}mm`,
                            boxSizing: 'border-box',
                            fontSize: '10px'
                          }}
                        >
                          {/* Label internal padding visual guidelines */}
                          {showGuidelines && (
                            <div className="absolute inset-0 border border-dotted border-blue-200 pointer-events-none print:hidden" style={{ margin: `${labelPadding}mm` }} />
                          )}

                          {/* 2. Middle Block (Titles and Price Tag) */}
                          <div className="flex-1 flex flex-col justify-center my-0.5 min-h-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-1">
                              
                              {/* Descriptive Text Column */}
                              <div className="flex-1 min-w-0 flex flex-col">
                                {showName && (
                                  <div 
                                    className="font-bold truncate text-black uppercase tracking-tight"
                                    style={{ fontSize: `${nameFontSize}pt`, lineHeight: 1.1 }}
                                  >
                                    {product.name}
                                  </div>
                                )}
                                {showBrand && (
                                  <div className="text-[7pt] text-gray-500 font-medium truncate uppercase leading-tight mt-0.5">
                                    Brand: {product.brand || 'N/A'}
                                  </div>
                                )}
                              </div>

                              {/* Price Tag Column */}
                              {showPrice && (
                                <div className="shrink-0 flex items-center justify-end">
                                  {priceStyle === 'inverse' ? (
                                    <div 
                                      className="bg-black text-white font-black px-1.5 py-0.5 rounded-sm whitespace-nowrap text-center font-mono"
                                      style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                                    >
                                      <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                      {product.selling_price.toFixed(2)}
                                    </div>
                                  ) : priceStyle === 'badge' ? (
                                    <div 
                                      className="border-2 border-black font-black px-1.5 py-0.5 whitespace-nowrap text-center font-mono"
                                      style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                                    >
                                      <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                      {product.selling_price.toFixed(2)}
                                    </div>
                                  ) : (
                                    <div 
                                      className="font-extrabold whitespace-nowrap text-right font-mono text-black"
                                      style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                                    >
                                      <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                      {product.selling_price.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3. Barcode Vector element */}
                          <div className="flex flex-col items-center justify-center shrink-0 w-full overflow-hidden">
                            <Barcode 
                              value={product.barcode || product.sku}
                              format={barcodeFormat}
                              width={barcodeWidth}
                              height={barcodeHeight}
                              displayValue={false}
                              margin={0}
                            />
                            {showBarcodeText && (
                              <div 
                                className="font-mono text-center leading-none mt-0.5 text-black tracking-widest font-semibold"
                                style={{ fontSize: `${barcodeTextFontSize}pt` }}
                              >
                                {product.barcode || product.sku}
                              </div>
                            )}
                          </div>

                          {/* 4. Footer SKU & Price Code Indicators */}
                          {(showSku || (showPriceCode && product.price_code)) && (
                            <div 
                              className="flex justify-between items-center text-gray-400 mt-0.5 border-t border-dashed border-gray-100 pt-0.5 font-mono leading-none"
                            >
                              <div>
                                {showPriceCode && product.price_code && (
                                  <span style={{ fontSize: `${priceCodeFontSize}pt` }} className="text-gray-400">
                                    <strong className="text-black">{product.price_code}</strong>
                                  </span>
                                )}
                              </div>
                              <div>
                                {showSku && (
                                  <span style={{ fontSize: `${skuFontSize}pt` }} className="text-gray-400">
                                    SKU: <strong className="text-black">{product.sku}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                /* THERMAL DIRECT ROLL MODE GENERATOR */
                expandedLabels.map((product, idx) => (
                  <div 
                    key={`thermal-${idx}`}
                    className="bg-white print:border-none relative shadow-[0_10px_20px_rgba(0,0,0,0.25)] print:shadow-none print-page-break flex flex-col justify-between"
                    style={{
                      width: `${activeTemplate.labelWidth}mm`,
                      height: `${activeTemplate.labelHeight}mm`,
                      border: showBorder ? '1px solid #111' : 'none',
                      padding: `${labelPadding}mm`,
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Visual guidelines for margins/padding (hidden in print) */}
                    {showGuidelines && (
                      <div className="absolute inset-0 border border-dotted border-amber-300 pointer-events-none print:hidden" style={{ margin: `${labelPadding}mm` }}>
                        <div className="absolute top-0.5 left-0.5 bg-amber-50 text-amber-800 text-[6px] font-mono px-0.5 uppercase">THERMAL EDGE</div>
                      </div>
                    )}

                    {/* 2. Middle Block (Titles and Price Tag) */}
                    <div className="flex-1 flex flex-col justify-center my-0.5 min-h-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-1">
                        
                        {/* Descriptive Text Column */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {showName && (
                            <div 
                              className="font-extrabold truncate text-black uppercase tracking-tight"
                              style={{ fontSize: `${nameFontSize}pt`, lineHeight: 1.1 }}
                            >
                              {product.name}
                            </div>
                          )}
                          {showBrand && (
                            <div className="text-[7pt] text-gray-500 font-medium truncate uppercase leading-tight mt-0.5">
                              Brand: {product.brand || 'N/A'}
                            </div>
                          )}
                        </div>

                        {/* Price Tag Column */}
                        {showPrice && (
                          <div className="shrink-0 flex items-center justify-end">
                            {priceStyle === 'inverse' ? (
                              <div 
                                className="bg-black text-white font-black px-1.5 py-0.5 rounded-sm whitespace-nowrap text-center font-mono"
                                style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                              >
                                <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                {product.selling_price.toFixed(2)}
                              </div>
                            ) : priceStyle === 'badge' ? (
                              <div 
                                className="border-2 border-black font-black px-1.5 py-0.5 whitespace-nowrap text-center font-mono"
                                style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                              >
                                <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                {product.selling_price.toFixed(2)}
                              </div>
                            ) : (
                              <div 
                                className="font-extrabold whitespace-nowrap text-right font-mono text-black"
                                style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                              >
                                <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                {product.selling_price.toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Barcode Vector element */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-full overflow-hidden">
                      <Barcode 
                        value={product.barcode || product.sku}
                        format={barcodeFormat}
                        width={barcodeWidth}
                        height={barcodeHeight}
                        displayValue={false}
                        margin={0}
                      />
                      {showBarcodeText && (
                        <div 
                          className="font-mono text-center leading-none mt-0.5 text-black tracking-widest font-semibold"
                          style={{ fontSize: `${barcodeTextFontSize}pt` }}
                        >
                          {product.barcode || product.sku}
                        </div>
                      )}
                    </div>

                    {/* 4. Footer SKU & Price Code Indicators */}
                    {(showSku || (showPriceCode && product.price_code)) && (
                      <div 
                        className="flex justify-between items-center text-gray-400 mt-0.5 border-t border-dashed border-gray-100 pt-0.5 font-mono leading-none"
                      >
                        <div>
                          {showPriceCode && product.price_code && (
                            <span style={{ fontSize: `${priceCodeFontSize}pt` }} className="text-gray-400">
                              CODE: <strong className="text-black">{product.price_code}</strong>
                            </span>
                          )}
                        </div>
                        <div>
                          {showSku && (
                            <span style={{ fontSize: `${skuFontSize}pt` }} className="text-gray-400">
                              SKU: <strong className="text-black">{product.sku}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                ))
              )}

            </div>

            {/* Print Settings Assistant footer tips */}
            <div className="bg-brand-sidebar border-t border-brand-line p-3 text-xs flex items-start gap-2.5 print:hidden">
              <HelpCircle className="w-5 h-5 text-brand-ink shrink-0 mt-0.5 opacity-70" />
              <div className="text-[11px] leading-relaxed text-gray-600">
                <strong className="text-brand-ink uppercase block mb-0.5 text-[10px]">Laser / Thermal Alignment Pro-Tips:</strong>
                <ul className="list-disc list-inside space-y-0.5 font-sans">
                  <li>In Chrome/Edge Print dialog, check <strong>Margins: None</strong> and <strong>Scale: 100%</strong> to ensure sub-millimeter calibration matching.</li>
                  <li>Enable <strong>Background Graphics</strong> to render solid inverse price badges correctly.</li>
                  <li>For Zebra thermal stickers, configure the printer driver's stock dimension to match the chosen template precisely.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
