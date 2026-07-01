import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Upload, Plus, Search, RefreshCw, Trash2, CheckCircle2, 
  AlertTriangle, X, Zap, Check, FileSpreadsheet, ShieldAlert 
} from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../types';
import { validateBarcode, generateLocalEan13 } from '../utils/barcode';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const location = useLocation();

  // Manual Add Product form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newPrice, setNewPrice] = useState('0.00');
  const [newCost, setNewCost] = useState('0.00');
  const [newVat, setNewVat] = useState('5.0');
  const [newSupplier, setNewSupplier] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [newDesc, setNewDesc] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import Wizard state
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [wizardStats, setWizardStats] = useState({
    total: 0,
    missingBarcodes: 0,
    duplicateSkus: 0,
    duplicateBarcodes: 0
  });
  const [overwriteOnImport, setOverwriteOnImport] = useState(true);
  const [generateMissingOnImport, setGenerateMissingOnImport] = useState(true);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query !== null) {
      setSearchTerm(query);
    }
  }, [location.search]);

  // Real-time local duplicate check for manual form
  const isSkuDuplicate = products.some(p => p.sku.toLowerCase() === newSku.trim().toLowerCase());
  const isBarcodeDuplicate = newBarcode.trim() !== '' && products.some(p => p.barcode && p.barcode.toLowerCase() === newBarcode.trim().toLowerCase());
  const barcodeValidation = newBarcode ? validateBarcode(newBarcode) : null;

  // Handle manual product submission
  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newSku.trim() || !newName.trim()) {
      setFormError('SKU and Product Name are required fields.');
      return;
    }

    if (isSkuDuplicate) {
      setFormError(`SKU '${newSku}' is already assigned to a product.`);
      return;
    }

    if (isBarcodeDuplicate) {
      setFormError(`Barcode '${newBarcode}' is already assigned to a product.`);
      return;
    }

    if (newBarcode && barcodeValidation && !barcodeValidation.isValid) {
      setFormError(`Barcode format warning: ${barcodeValidation.errorMessage}`);
      return;
    }

    const payload = {
      sku: newSku.trim(),
      barcode: newBarcode.trim(),
      name: newName.trim(),
      name_ar: newNameAr.trim(),
      brand: newBrand.trim(),
      category: newCategory.trim(),
      subcategory: newSubcategory.trim(),
      unit: newUnit,
      selling_price: parseFloat(newPrice) || 0,
      cost_price: parseFloat(newCost) || 0,
      vat: parseFloat(newVat) || 0,
      supplier: newSupplier.trim(),
      stock_quantity: parseInt(newStock, 10) || 0,
      description: newDesc.trim(),
      status: 'Active'
    };

    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      return data;
    })
    .then((data) => {
      setMessage({ 
        type: 'success', 
        text: `Product '${newName}' created successfully! (Barcode: ${data.barcode})` 
      });
      setIsAddOpen(false);
      // Reset form
      setNewSku('');
      setNewName('');
      setNewNameAr('');
      setNewBrand('');
      setNewCategory('');
      setNewSubcategory('');
      setNewPrice('0.00');
      setNewCost('0.00');
      setNewVat('5.0');
      setNewSupplier('');
      setNewStock('0');
      setNewDesc('');
      setNewBarcode('');
      fetchProducts();
    })
    .catch(err => {
      setFormError(err.message);
    });
  };

  // Generate local barcode for manual entry form
  const triggerFormBarcodeGen = () => {
    const existingCodes = products.map(p => p.barcode || '').filter(Boolean);
    const generated = generateLocalEan13(existingCodes);
    setNewBarcode(generated);
  };

  // Pre-process uploaded CSV before finalizing imports
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawProducts = results.data.map((row: any) => ({
          sku: (row.sku || row.SKU || '').trim(),
          barcode: (row.barcode || row.Barcode || '').trim(),
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

        // Analyze and extract stats for the user
        let blankBarcodes = 0;
        let dupSkus = 0;
        let dupBarcodes = 0;

        const csvSkus = new Set<string>();
        const csvBarcodes = new Set<string>();

        const dbSkuMap = new Set(products.map(p => p.sku.toLowerCase()));
        const dbBarcodeMap = new Set(products.map(p => p.barcode ? p.barcode.toLowerCase() : '').filter(Boolean));

        rawProducts.forEach((p: any) => {
          if (!p.sku) return;

          // Check SKU duplicates in payload or database
          if (csvSkus.has(p.sku.toLowerCase()) || dbSkuMap.has(p.sku.toLowerCase())) {
            dupSkus++;
          }
          csvSkus.add(p.sku.toLowerCase());

          // Barcode audits
          if (!p.barcode) {
            blankBarcodes++;
          } else {
            if (csvBarcodes.has(p.barcode.toLowerCase()) || dbBarcodeMap.has(p.barcode.toLowerCase())) {
              dupBarcodes++;
            }
            csvBarcodes.add(p.barcode.toLowerCase());
          }
        });

        setParsedProducts(rawProducts);
        setWizardStats({
          total: rawProducts.length,
          missingBarcodes: blankBarcodes,
          duplicateSkus: dupSkus,
          duplicateBarcodes: dupBarcodes
        });
        setIsImportWizardOpen(true);
        setImporting(false);
      },
      error: (err) => {
        setMessage({ type: 'error', text: 'CSV Parse error: ' + err.message });
        setImporting(false);
      }
    });
  };

  // Submit parsed data to back-end with chosen settings
  const executeWizardImport = () => {
    setImporting(true);
    setIsImportWizardOpen(false);

    fetch('/api/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        products: parsedProducts,
        overwrite: overwriteOnImport,
        autoGenerateMissing: generateMissingOnImport
      })
    })
    .then(res => res.json())
    .then(data => {
      let statsText = `Successfully processed ${data.count} items.`;
      if (data.inserted > 0) statsText += ` Added: ${data.inserted}.`;
      if (data.updated > 0) statsText += ` Overwritten: ${data.updated}.`;
      if (data.generated > 0) statsText += ` Barcodes Auto-Generated: ${data.generated}.`;
      if (data.skipped > 0) statsText += ` Skipped: ${data.skipped}.`;

      setMessage({ 
        type: 'success', 
        text: statsText 
      });
      fetchProducts();
    })
    .catch(err => {
      setMessage({ type: 'error', text: 'Import failed: ' + err.message });
    })
    .finally(() => {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  // Quick Action: Fix all blank barcodes for existing records
  const handleBulkGenerateBarcodes = () => {
    const missingCount = products.filter(p => !p.barcode || p.barcode.trim() === '').length;
    if (missingCount === 0) {
      setMessage({ type: 'info', text: 'All products currently have a barcode associated. No action needed.' });
      return;
    }

    if (confirm(`Do you want to automatically generate EAN-13 barcodes for the ${missingCount} products with missing barcodes?`)) {
      setLoading(true);
      fetch('/api/products/generate-missing', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          setMessage({ type: 'success', text: data.message });
          fetchProducts();
        })
        .catch(err => {
          setMessage({ type: 'error', text: 'Generation failed: ' + err.message });
          setLoading(false);
        });
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all products? This action cannot be undone.')) {
      fetch('/api/products', { method: 'DELETE' })
        .then(() => {
          setMessage({ type: 'success', text: 'Product inventory cleared completely.' });
          fetchProducts();
        })
        .catch(console.error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-brand-bg relative">
      <div className="m-2 flex flex-wrap gap-2 items-center justify-between shrink-0">
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
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-brand-ink text-white border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:bg-opacity-90 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Add Product
          </button>
          
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
            className="bg-brand-accent text-white border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            + Import CSV
          </button>

          <button 
            onClick={handleBulkGenerateBarcodes}
            title="Auto-Generate barcodes for all existing products lacking a barcode"
            className="bg-white text-brand-ink border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:bg-gray-100 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            Auto Barcodes
          </button>

          <button 
            onClick={handleClearAll} 
            className="bg-white text-red-600 border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:bg-gray-100 flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Clear Data
          </button>
        </div>
      </div>

      {message && (
        <div className={`mx-2 mb-2 p-3 border border-brand-line text-xs font-bold flex items-center justify-between gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border-green-300' : 
          message.type === 'info' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-red-100 text-red-800 border-red-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Product List Table Layout */}
      <div className="border border-brand-line m-2 mt-0 bg-white flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-brand-line font-bold text-[12px] uppercase tracking-wider flex justify-between items-center bg-brand-header text-brand-ink shrink-0">
          <span>Product Explorer Database</span>
          <span className="text-[10px] font-normal normal-case opacity-70">Showing {filteredProducts.length} items</span>
        </div>

        <div className="grid grid-cols-[100px_2fr_1fr_120px_100px_80px] bg-brand-sidebar border-b border-brand-line shrink-0 font-bold">
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1.5">SKU</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1.5 border-l border-brand-line">Product Name</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1.5 border-l border-brand-line">Category</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1.5 border-l border-brand-line">Barcode & Validation</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1.5 text-right border-l border-brand-line">Price</div>
          <div className="font-serif italic text-[10px] text-gray-600 px-2 py-1.5 text-right border-l border-brand-line">Stock</div>
        </div>

        <div className="flex-1 overflow-auto bg-brand-bg">
          {loading ? (
            <div className="p-8 text-center text-[11px] opacity-60 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-ink opacity-40" />
              <span>Fetching secure SQLite index...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-[11px] opacity-60 flex flex-col items-center gap-2 bg-white m-4 border border-dashed border-[#ccc]">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <span className="font-bold uppercase tracking-wider text-xs">No records on file</span>
              <span>Import a CSV spreadsheet or click "+ Add Product" to get started.</span>
            </div>
          ) : (
            filteredProducts.map(p => {
              const val = p.barcode ? validateBarcode(p.barcode) : null;
              return (
                <div key={p.id} className="grid grid-cols-[100px_2fr_1fr_120px_100px_80px] text-[11px] border-b border-[#ddd] items-center min-h-[36px] py-1 px-0 cursor-pointer hover:bg-brand-ink hover:text-white transition-colors">
                  <div className="px-2 truncate font-bold font-mono">{p.sku}</div>
                  <div className="px-2 font-bold truncate">
                    <span>{p.name}</span>
                    {p.name_ar && <span className="block text-[9px] opacity-70 font-normal mt-0.5">{p.name_ar}</span>}
                  </div>
                  <div className="px-2 truncate font-serif italic text-gray-600 hover:text-white">{p.category || '-'}</div>
                  <div className="px-2 font-mono flex flex-col gap-0.5 shrink-0">
                    {p.barcode ? (
                      <>
                        <span className="font-bold tracking-tight">{p.barcode}</span>
                        {val && val.isValid ? (
                          <span className="text-[8px] bg-green-100 text-green-800 border border-green-300 font-sans uppercase tracking-widest px-1 py-0.2 rounded w-fit scale-90 -ml-1">
                            {val.type} ✓
                          </span>
                        ) : (
                          <span className="text-[8px] bg-red-100 text-red-800 border border-red-300 font-sans uppercase tracking-widest px-1 py-0.2 rounded w-fit scale-90 -ml-1" title={val?.errorMessage}>
                            INVALID
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-500 font-bold uppercase text-[9px]">Missing Barcode</span>
                    )}
                  </div>
                  <div className="px-2 text-right font-bold text-[11px] font-mono">${p.selling_price.toFixed(2)}</div>
                  <div className="px-2 text-right">
                    <span className={`px-1.5 py-0.5 text-[9px] font-mono ${p.stock_quantity > 10 ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300 font-bold'}`}>
                      {p.stock_quantity}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SIDE DRAWER: Manual Add Product Form */}
      {isAddOpen && (
        <div className="absolute inset-y-0 right-0 w-[380px] bg-white border-l-2 border-brand-line shadow-[0_0_30px_rgba(0,0,0,0.15)] z-40 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="px-4 py-3 border-b-2 border-brand-line font-bold text-xs uppercase tracking-wider bg-brand-header text-brand-ink flex justify-between items-center">
            <span>+ Add New Product Record</span>
            <button onClick={() => setIsAddOpen(false)} className="hover:text-red-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleManualAddSubmit} className="flex-1 overflow-auto p-4 flex flex-col gap-3 text-xs">
            {formError && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 font-bold flex gap-1.5 items-start">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">SKU Code *</label>
                <input 
                  type="text" 
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. AZ-4022"
                  className={`w-full border p-1.5 outline-none font-mono font-bold ${isSkuDuplicate ? 'border-red-500 bg-red-50' : 'border-brand-line'}`}
                  required
                />
                {isSkuDuplicate && <p className="text-red-600 text-[9px] mt-0.5 font-bold">⚠️ SKU already registered</p>}
              </div>
              
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Unit Type</label>
                <select 
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full border border-brand-line p-1.5 bg-brand-sidebar"
                >
                  <option value="pcs">Pcs (Each)</option>
                  <option value="box">Box</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="mtr">Meter (mtr)</option>
                  <option value="set">Set</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase mb-1 text-[10px]">Product Title Name *</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Stainless Steel Screws 4mm"
                className="w-full border border-brand-line p-1.5 outline-none font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-1 text-[10px]">Arabic Title Name (Arabic / name_ar)</label>
              <input 
                type="text" 
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
                placeholder="اسم المنتج باللغة العربية"
                className="w-full border border-brand-line p-1.5 outline-none text-right font-medium"
              />
            </div>

            <div className="border border-dashed border-[#ccc] p-2.5 bg-brand-bg relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block font-bold uppercase text-[10px] text-brand-ink">Barcode (Custom / System)</label>
                <button 
                  type="button" 
                  onClick={triggerFormBarcodeGen}
                  className="text-[9px] font-bold text-brand-accent hover:underline flex items-center gap-0.5 uppercase"
                >
                  <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  Generate Unique EAN-13
                </button>
              </div>
              
              <input 
                type="text" 
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="Blank to auto-generate on submit"
                className={`w-full border p-1.5 outline-none font-mono ${
                  isBarcodeDuplicate ? 'border-red-500 bg-red-50 text-red-800' : 'border-brand-line'
                }`}
              />

              {isBarcodeDuplicate && (
                <p className="text-red-600 text-[9px] mt-1 font-bold">⚠️ Duplicate: Barcode already exists in DB!</p>
              )}

              {newBarcode && barcodeValidation && (
                <div className="mt-1 flex items-center gap-1.5 text-[9px]">
                  {barcodeValidation.isValid ? (
                    <span className="text-green-700 font-bold">✓ Valid {barcodeValidation.type} format</span>
                  ) : (
                    <span className="text-amber-700 font-bold">⚠️ Format Issue: {barcodeValidation.errorMessage}</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Retail Price ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full border border-brand-line p-1.5 font-mono outline-none"
                />
              </div>
              
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Cost Price ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full border border-brand-line p-1.5 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">VAT (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={newVat}
                  onChange={(e) => setNewVat(e.target.value)}
                  className="w-full border border-brand-line p-1.5 font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Category</label>
                <input 
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Fasteners"
                  className="w-full border border-brand-line p-1.5 outline-none"
                />
              </div>
              
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Stock Level</label>
                <input 
                  type="number" 
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full border border-brand-line p-1.5 font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Brand / Mfr</label>
                <input 
                  type="text" 
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full border border-brand-line p-1.5 outline-none"
                />
              </div>
              
              <div>
                <label className="block font-bold uppercase mb-1 text-[10px]">Supplier Account</label>
                <input 
                  type="text" 
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full border border-brand-line p-1.5 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase mb-1 text-[10px]">Item Description Notes</label>
              <textarea 
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Hardware specifications, grade ratings, or placement coordinates..."
                className="w-full border border-brand-line p-1.5 outline-none resize-none"
              />
            </div>

            <div className="mt-auto pt-4 flex gap-2">
              <button 
                type="submit"
                className="flex-1 bg-brand-ink text-white border border-brand-line py-2 text-xs uppercase font-bold cursor-pointer hover:bg-opacity-90"
              >
                Save Product
              </button>
              <button 
                type="button" 
                onClick={() => setIsAddOpen(false)}
                className="border border-brand-line px-4 py-2 text-xs uppercase bg-white cursor-pointer hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV IMPORT WIZARD / AUDIT DIALOG */}
      {isImportWizardOpen && (
        <div className="absolute inset-0 bg-[#00000050] backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-brand-line w-full max-w-xl shadow-[10px_10px_0_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-3 py-2 border-b-2 border-brand-line font-bold text-xs uppercase tracking-wider bg-brand-header text-brand-ink flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand-accent" />
                <span>CSV File Pre-Import Audit & Validation</span>
              </div>
              <button onClick={() => setIsImportWizardOpen(false)} className="hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex flex-col gap-4 text-xs">
              
              {/* Audit Stats Bento */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-brand-sidebar border border-brand-line p-2">
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Total Rows</div>
                  <div className="font-mono text-lg font-black">{wizardStats.total}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-2">
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Missing Barcodes</div>
                  <div className="font-mono text-lg font-black text-amber-600">{wizardStats.missingBarcodes}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-2">
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Duplicate SKUs</div>
                  <div className="font-mono text-lg font-black text-red-600">{wizardStats.duplicateSkus}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-2">
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Dup Barcodes</div>
                  <div className="font-mono text-lg font-black text-red-600">{wizardStats.duplicateBarcodes}</div>
                </div>
              </div>

              {/* Duplicate/Generation Settings Panel */}
              <div className="border border-brand-line p-3 bg-brand-sidebar flex flex-col gap-2">
                <span className="font-bold uppercase text-[10px] text-brand-ink">Conflict & Auto-Generation Options:</span>
                
                <label className="flex items-start gap-2.5 cursor-pointer hover:bg-white p-1 rounded">
                  <input 
                    type="checkbox"
                    checked={overwriteOnImport}
                    onChange={(e) => setOverwriteOnImport(e.target.checked)}
                    className="mt-0.5 accent-brand-ink"
                  />
                  <div>
                    <span className="font-bold">Overwrite existing items matching SKU</span>
                    <p className="text-[10px] opacity-70">If disabled, records with pre-existing SKUs in the DB will be ignored.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer hover:bg-white p-1 rounded">
                  <input 
                    type="checkbox"
                    checked={generateMissingOnImport}
                    onChange={(e) => setGenerateMissingOnImport(e.target.checked)}
                    className="mt-0.5 accent-brand-ink"
                  />
                  <div>
                    <span className="font-bold">Auto-generate EAN-13 barcodes for missing/duplicate values</span>
                    <p className="text-[10px] opacity-70">Uses compliant GS1-like '201' private retail check-digit structure.</p>
                  </div>
                </label>
              </div>

              {/* Sample Preview list */}
              <div>
                <span className="block font-bold uppercase text-[10px] mb-1.5 opacity-70">Audit Preview (First 4 rows):</span>
                <div className="border border-brand-line bg-white">
                  <div className="grid grid-cols-[100px_1fr_120px] bg-brand-header border-b border-brand-line font-bold text-[9px] p-1 uppercase">
                    <div>SKU</div>
                    <div>Product Name</div>
                    <div>Parsed Barcode</div>
                  </div>
                  {parsedProducts.slice(0, 4).map((p, i) => (
                    <div key={i} className="grid grid-cols-[100px_1fr_120px] p-1 border-b border-gray-100 last:border-0 font-mono text-[10px]">
                      <div className="truncate font-bold">{p.sku || <span className="text-red-600">BLANK</span>}</div>
                      <div className="truncate font-sans font-medium">{p.name}</div>
                      <div className="truncate text-gray-500">
                        {p.barcode ? p.barcode : <span className="text-amber-600 font-bold font-sans text-[9px] uppercase">Auto-Generate</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={executeWizardImport}
                  className="flex-1 bg-brand-accent text-white border border-brand-line py-2.5 text-xs uppercase font-bold cursor-pointer hover:opacity-95"
                >
                  Confirm and Run Import
                </button>
                <button 
                  onClick={() => setIsImportWizardOpen(false)}
                  className="border border-brand-line px-4 py-2.5 text-xs uppercase bg-white cursor-pointer hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
