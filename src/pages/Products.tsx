import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Upload, Plus, Search, RefreshCw, Trash2, CheckCircle2, 
  AlertTriangle, X, Zap, Check, FileSpreadsheet, ShieldAlert 
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { validateBarcode, generateLocalEan13 } from '../utils/barcode';
import { localBulkImportProducts } from '../utils/localDb';

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
    duplicateBarcodes: 0,
    skippedRows: 0,
    emptyRows: 0
  });
  const [overwriteOnImport, setOverwriteOnImport] = useState(true);
  const [generateMissingOnImport, setGenerateMissingOnImport] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<{row: number, sku: string, name: string, message: string, severity: 'error' | 'warning'}[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});

  const fetchProducts = () => {
    setLoading(true);
    fetch('/api/products')
      .then(async res => {
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : null;
        if (!res.ok) {
          throw new Error(data?.error || `Server responded with status ${res.status}`);
        }
        return data;
      })
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load products: ' + err.message });
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

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      alert("No inventory data to export matching current filter.");
      return;
    }
    // Prepare clean data for CSV export
    const cleanData = filteredProducts.map(({ id, ...p }) => ({
      SKU: p.sku,
      Barcode: p.barcode || '',
      Name: p.name,
      'Arabic Name': p.name_ar || '',
      Brand: p.brand || '',
      Category: p.category || '',
      Subcategory: p.subcategory || '',
      Unit: p.unit || 'pcs',
      'Selling Price (AED)': p.selling_price,
      'Cost Price (AED)': p.cost_price,
      'VAT (%)': p.vat,
      Supplier: p.supplier || '',
      'Stock Quantity': p.stock_quantity,
      Description: p.description || '',
      Status: p.status || 'Active'
    }));

    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      alert("No inventory data to export matching current filter.");
      return;
    }
    // Prepare clean data for Excel export
    const cleanData = filteredProducts.map(({ id, ...p }) => ({
      SKU: p.sku,
      Barcode: p.barcode || '',
      Name: p.name,
      'Arabic Name': p.name_ar || '',
      Brand: p.brand || '',
      Category: p.category || '',
      Subcategory: p.subcategory || '',
      Unit: p.unit || 'pcs',
      'Selling Price (AED)': p.selling_price,
      'Cost Price (AED)': p.cost_price,
      'VAT (%)': p.vat,
      Supplier: p.supplier || '',
      'Stock Quantity': p.stock_quantity,
      Description: p.description || '',
      Status: p.status || 'Active'
    }));

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Report');
    XLSX.writeFile(workbook, `inventory_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const processRawProducts = (rawProducts: any[], detectedHeaders: string[]) => {
    // Determine column mapping for user display
    const mapping: { [key: string]: string } = {};
    const keyPairs = [
      { field: 'SKU', keys: ['sku', 'SKU', 'Sku'] },
      { field: 'Barcode', keys: ['barcode', 'Barcode', 'BarcodeNo'] },
      { field: 'Product Name', keys: ['name', 'Name', 'product name', 'Product Name', 'title', 'Title'] },
      { field: 'Brand', keys: ['brand', 'Brand'] },
      { field: 'Category', keys: ['category', 'Category'] },
      { field: 'Unit', keys: ['unit', 'Unit'] },
      { field: 'Selling Price', keys: ['selling_price', 'Selling Price', 'Price', 'Retail Price', 'Selling Price (AED)'] },
      { field: 'Cost Price', keys: ['cost_price', 'Cost Price', 'Cost Price (AED)'] },
      { field: 'VAT (%)', keys: ['vat', 'VAT', 'VAT (%)'] },
      { field: 'Stock Level', keys: ['stock_quantity', 'Stock', 'Quantity', 'Stock Quantity'] },
      { field: 'Supplier', keys: ['supplier', 'Supplier'] },
      { field: 'Description', keys: ['description', 'Description'] }
    ];

    detectedHeaders.forEach(header => {
      const match = keyPairs.find(p => p.keys.some(k => k.toLowerCase() === header.trim().toLowerCase()));
      if (match) {
        mapping[match.field] = header;
      }
    });
    setColumnMapping(mapping);

    // Analyze and extract stats for the user with robust client-side validation
    let blankBarcodes = 0;
    let dupSkus = 0;
    let dupBarcodes = 0;
    let emptyRows = 0;

    const fileSkus = new Set<string>();
    const fileBarcodes = new Set<string>();

    const dbSkuMap = new Set(products.map(p => p.sku.toLowerCase()));
    const dbBarcodeMap = new Set(products.map(p => p.barcode ? p.barcode.toLowerCase() : '').filter(Boolean));

    const errorsList: {row: number, sku: string, name: string, message: string, severity: 'error' | 'warning'}[] = [];
    const validRows: any[] = [];

    rawProducts.forEach((p: any, index) => {
      const rowNum = index + 2; // Row numbers are 1-indexed, first data row is 2 (after header)

      // Ignore truly empty rows
      if (!p.sku && !p.name && !p.barcode && p.selling_price === 0 && p.stock_quantity === 0) {
        emptyRows++;
        return;
      }

      const cleanSku = String(p.sku || '').trim();
      const cleanName = String(p.name || '').trim();
      const cleanBarcode = String(p.barcode || '').trim();

      let hasRowErr = false;

      // 1. Validate SKU
      if (!cleanSku) {
        errorsList.push({
          row: rowNum,
          sku: 'BLANK',
          name: cleanName || 'Unknown Product',
          message: 'Missing SKU: Product must have a unique identifier.',
          severity: 'error'
        });
        hasRowErr = true;
      } else {
        const lowerSku = cleanSku.toLowerCase();
        if (fileSkus.has(lowerSku)) {
          errorsList.push({
            row: rowNum,
            sku: cleanSku,
            name: cleanName,
            message: `Duplicate SKU: '${cleanSku}' is defined multiple times in this spreadsheet.`,
            severity: 'error'
          });
          hasRowErr = true;
          dupSkus++;
        } else {
          fileSkus.add(lowerSku);
          if (dbSkuMap.has(lowerSku)) {
            errorsList.push({
              row: rowNum,
              sku: cleanSku,
              name: cleanName,
              message: `SKU exists in DB: '${cleanSku}' will overwrite the existing database record.`,
              severity: 'warning'
            });
            dupSkus++;
          }
        }
      }

      // 2. Validate Product Name
      if (!cleanName || cleanName.toLowerCase() === 'unknown product') {
        errorsList.push({
          row: rowNum,
          sku: cleanSku || 'N/A',
          name: 'MISSING',
          message: 'Missing Product Name: Product title is a required field.',
          severity: 'error'
        });
        hasRowErr = true;
      }

      // 3. Validate Barcode
      if (!cleanBarcode) {
        blankBarcodes++;
        errorsList.push({
          row: rowNum,
          sku: cleanSku || 'N/A',
          name: cleanName,
          message: 'Missing Barcode: System will auto-generate an EAN-13 barcode on import.',
          severity: 'warning'
        });
      } else {
        const lowerBar = cleanBarcode.toLowerCase();
        if (fileBarcodes.has(lowerBar)) {
          errorsList.push({
            row: rowNum,
            sku: cleanSku || 'N/A',
            name: cleanName,
            message: `Duplicate Barcode: '${cleanBarcode}' appears multiple times in this spreadsheet.`,
            severity: 'error'
          });
          hasRowErr = true;
          dupBarcodes++;
        } else {
          fileBarcodes.add(lowerBar);
          if (dbBarcodeMap.has(lowerBar)) {
            errorsList.push({
              row: rowNum,
              sku: cleanSku || 'N/A',
              name: cleanName,
              message: `Barcode exists in DB: '${cleanBarcode}' is already assigned to another item.`,
              severity: 'warning'
            });
            dupBarcodes++;
          }
        }

        // Validate barcode format
        const valRes = validateBarcode(cleanBarcode);
        if (!valRes.isValid) {
          errorsList.push({
            row: rowNum,
            sku: cleanSku || 'N/A',
            name: cleanName,
            message: `Barcode format issue: ${valRes.errorMessage}`,
            severity: 'warning'
          });
        }
      }

      // 4. Validate Price
      const sPrice = parseFloat(p.selling_price);
      if (isNaN(sPrice) || sPrice < 0) {
        errorsList.push({
          row: rowNum,
          sku: cleanSku || 'N/A',
          name: cleanName,
          message: `Invalid Price: Selling price '${p.selling_price}' must be a non-negative number.`,
          severity: 'error'
        });
        hasRowErr = true;
      }

      const cPrice = parseFloat(p.cost_price);
      if (isNaN(cPrice) || cPrice < 0) {
        errorsList.push({
          row: rowNum,
          sku: cleanSku || 'N/A',
          name: cleanName,
          message: `Invalid Cost: Cost price '${p.cost_price}' must be a non-negative number.`,
          severity: 'warning'
        });
      }

      // Only push completely valid rows or warnable rows to the processable queue
      if (!hasRowErr) {
        validRows.push({
          ...p,
          sku: cleanSku,
          name: cleanName,
          barcode: cleanBarcode
        });
      }
    });

    setParsedProducts(validRows);
    setValidationErrors(errorsList);
    setWizardStats({
      total: rawProducts.length,
      missingBarcodes: blankBarcodes,
      duplicateSkus: dupSkus,
      duplicateBarcodes: dupBarcodes,
      skippedRows: rawProducts.length - validRows.length - emptyRows,
      emptyRows
    });
    setIsImportWizardOpen(true);
    setImporting(false);
  };

  // Pre-process uploaded CSV or Excel before finalizing imports
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const u8 = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(u8, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          // Get raw headers from worksheet
          const headers: string[] = [];
          if (worksheet['!ref']) {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
              if (cell && cell.v) headers.push(String(cell.v));
            }
          }

          const rawProducts = jsonData.map((row: any) => {
            const getVal = (val: any) => (val === undefined || val === null ? '' : String(val).trim());
            return {
              sku: getVal(row.sku || row.SKU || row.Sku || ''),
              barcode: getVal(row.barcode || row.Barcode || row.BarcodeNo || ''),
              name: getVal(row.name || row.Name || row['Product Name'] || row.product_name || 'Unknown Product'),
              name_ar: getVal(row.name_ar || row['Arabic Name'] || row.arabic_name || ''),
              brand: getVal(row.brand || row.Brand || ''),
              category: getVal(row.category || row.Category || ''),
              subcategory: getVal(row.subcategory || row.Subcategory || ''),
              unit: getVal(row.unit || row.Unit || 'pcs'),
              selling_price: parseFloat(row.selling_price || row['Selling Price'] || row['Selling Price (AED)'] || row.sellingPrice || '0') || 0,
              cost_price: parseFloat(row.cost_price || row['Cost Price'] || row['Cost Price (AED)'] || row.costPrice || '0') || 0,
              vat: parseFloat(row.vat || row.VAT || row['VAT (%)'] || row.vatRate || '0') || 0,
              supplier: getVal(row.supplier || row.Supplier || ''),
              stock_quantity: parseInt(row.stock_quantity || row.Stock || row.Quantity || row['Stock Quantity'] || row.stock || '0', 10) || 0,
              description: getVal(row.description || row.Description || ''),
              status: getVal(row.status || row.Status || 'Active')
            };
          });

          processRawProducts(rawProducts, headers);
        } catch (err: any) {
          setMessage({ type: 'error', text: 'Excel Parse error: ' + err.message });
          setImporting(false);
        }
      };
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'File reading failed' });
        setImporting(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rawProducts = results.data.map((row: any) => {
            const getVal = (val: any) => (val === undefined || val === null ? '' : String(val).trim());
            return {
              sku: getVal(row.sku || row.SKU || row.Sku || ''),
              barcode: getVal(row.barcode || row.Barcode || row.BarcodeNo || ''),
              name: getVal(row.name || row.Name || row['Product Name'] || row.product_name || 'Unknown Product'),
              name_ar: getVal(row.name_ar || row['Arabic Name'] || row.arabic_name || ''),
              brand: getVal(row.brand || row.Brand || ''),
              category: getVal(row.category || row.Category || ''),
              subcategory: getVal(row.subcategory || row.Subcategory || ''),
              unit: getVal(row.unit || row.Unit || 'pcs'),
              selling_price: parseFloat(row.selling_price || row['Selling Price'] || row['Selling Price (AED)'] || row.sellingPrice || '0') || 0,
              cost_price: parseFloat(row.cost_price || row['Cost Price'] || row['Cost Price (AED)'] || row.costPrice || '0') || 0,
              vat: parseFloat(row.vat || row.VAT || row['VAT (%)'] || row.vatRate || '0') || 0,
              supplier: getVal(row.supplier || row.Supplier || ''),
              stock_quantity: parseInt(row.stock_quantity || row.Stock || row.Quantity || row['Stock Quantity'] || row.stock || '0', 10) || 0,
              description: getVal(row.description || row.Description || ''),
              status: getVal(row.status || row.Status || 'Active')
            };
          });

          processRawProducts(rawProducts, headers);
        },
        error: (err) => {
          setMessage({ type: 'error', text: 'CSV Parse error: ' + err.message });
          setImporting(false);
        }
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(mockEvent);
    }
  };

  // Submit parsed data in batches to keep browser super responsive and show progress
  const executeWizardImport = async () => {
    setImporting(true);
    setIsImportWizardOpen(false);
    setImportProgress(0);

    const batchSize = 300;
    const totalItems = parsedProducts.length;
    let processedCount = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let generated = 0;
    let skippedDetails: any[] = [];

    try {
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = parsedProducts.slice(i, i + batchSize);
        const result = await localBulkImportProducts(batch, overwriteOnImport, generateMissingOnImport);
        
        processedCount += result.count;
        inserted += result.inserted;
        updated += result.updated;
        skipped += result.skipped;
        generated += result.generated;
        if (result.skippedDetails) {
          skippedDetails = [...skippedDetails, ...result.skippedDetails];
        }

        // Update progress state
        const pct = Math.min(100, Math.round((processedCount / totalItems) * 100));
        setImportProgress(pct);

        // Yield to the main thread to ensure smooth UI animation
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      let statsText = `Successfully processed ${totalItems} items.`;
      if (inserted > 0) statsText += ` Added: ${inserted}.`;
      if (updated > 0) statsText += ` Overwritten: ${updated}.`;
      if (generated > 0) statsText += ` Barcodes Auto-Generated: ${generated}.`;
      if (skipped > 0) statsText += ` Skipped: ${skipped}.`;

      setMessage({ 
        type: 'success', 
        text: statsText 
      });
      fetchProducts();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Import failed: ' + err.message });
    } finally {
      setImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        .then(async res => {
          const isJson = res.headers.get('content-type')?.includes('application/json');
          const data = isJson ? await res.json() : null;
          if (!res.ok) {
            throw new Error(data?.error || `Server responded with status ${res.status}`);
          }
          return data;
        })
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
        .then(async res => {
          const isJson = res.headers.get('content-type')?.includes('application/json');
          const data = isJson ? await res.json() : null;
          if (!res.ok) {
            throw new Error(data?.error || `Server responded with status ${res.status}`);
          }
          return data;
        })
        .then(() => {
          setMessage({ type: 'success', text: 'Product inventory cleared completely.' });
          fetchProducts();
        })
        .catch(err => {
          setMessage({ type: 'error', text: 'Failed to clear data: ' + err.message });
        });
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div 
      className="flex flex-col h-full bg-brand-bg relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-brand-ink/90 border-4 border-dashed border-brand-accent z-50 flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-100">
          <Upload className="w-16 h-16 text-brand-accent animate-bounce mb-4" />
          <span className="font-bold uppercase tracking-wider text-lg">Drop your CSV or Excel file here</span>
          <p className="text-xs opacity-80 mt-1 font-mono">Process product lists completely in-browser with secure local indexing</p>
        </div>
      )}

      {importProgress !== null && (
        <div className="absolute inset-0 bg-[#00000075] backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white border-2 border-brand-line p-6 w-full max-w-md shadow-[10px_10px_0_rgba(0,0,0,0.15)] text-center flex flex-col gap-4">
            <RefreshCw className="w-8 h-8 text-brand-accent animate-spin mx-auto" />
            <span className="font-bold uppercase tracking-wider text-xs text-brand-ink">Client-Side High Performance Importing...</span>
            <div className="w-full bg-gray-100 border border-brand-line h-4 overflow-hidden relative">
              <div 
                className="bg-brand-accent h-full transition-all duration-150 ease-out" 
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <span className="font-mono font-bold text-sm text-brand-accent">{importProgress}% Completed</span>
            <p className="text-[10px] text-gray-500">Writing items asynchronously to client IndexedDB relational engine...</p>
          </div>
        </div>
      )}

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
            accept=".csv,.xlsx,.xls"
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
            + Import Excel/CSV
          </button>

          <button 
            onClick={handleExportExcel}
            className="bg-[#217346] text-white border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:opacity-90 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>

          <button 
            onClick={handleExportCSV}
            className="bg-brand-ink text-white border border-brand-line px-4 py-1.5 text-xs font-bold uppercase cursor-pointer hover:opacity-90 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
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
          <div className="bg-white border-2 border-brand-line w-full max-w-2xl shadow-[10px_10px_0_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-150">
            
            <div className="px-3 py-2 border-b-2 border-brand-line font-bold text-xs uppercase tracking-wider bg-brand-header text-brand-ink flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand-accent" />
                <span>CSV / Excel Pre-Import Advanced Audit & Validation</span>
              </div>
              <button onClick={() => setIsImportWizardOpen(false)} className="hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs">
              
              {/* Audit Stats Bento */}
              <div className="grid grid-cols-5 gap-2 text-center shrink-0">
                <div className="bg-brand-sidebar border border-brand-line p-1.5">
                  <div className="text-[8px] uppercase tracking-wider opacity-65 font-bold">Total Rows</div>
                  <div className="font-mono text-base font-black text-brand-ink">{wizardStats.total}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-1.5">
                  <div className="text-[8px] uppercase tracking-wider opacity-65 font-bold text-green-700">Ready</div>
                  <div className="font-mono text-base font-black text-green-600">{parsedProducts.length}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-1.5">
                  <div className="text-[8px] uppercase tracking-wider opacity-65 font-bold text-red-700">Skipped (Err)</div>
                  <div className="font-mono text-base font-black text-red-600">{wizardStats.skippedRows}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-1.5">
                  <div className="text-[8px] uppercase tracking-wider opacity-65 font-bold">Empty</div>
                  <div className="font-mono text-base font-black text-gray-500">{wizardStats.emptyRows}</div>
                </div>
                <div className="bg-brand-sidebar border border-brand-line p-1.5">
                  <div className="text-[8px] uppercase tracking-wider opacity-65 font-bold text-amber-700">No Barcode</div>
                  <div className="font-mono text-base font-black text-amber-600">{wizardStats.missingBarcodes}</div>
                </div>
              </div>

              {/* Column Mapping Details */}
              <div className="border border-brand-line p-2.5 bg-brand-bg shrink-0">
                <span className="block font-bold uppercase text-[9px] mb-1 opacity-75">Mapped Fields / Headers:</span>
                <div className="flex flex-wrap gap-1.5 text-[9px]">
                  {Object.entries(columnMapping).map(([field, fileHeader]) => (
                    <span key={field} className="bg-white border border-brand-line px-1.5 py-0.5 rounded font-mono">
                      <strong className="text-brand-accent">{field}</strong> → <span className="opacity-70">{fileHeader}</span>
                    </span>
                  ))}
                  {Object.keys(columnMapping).length === 0 && (
                    <span className="text-red-500 italic">No columns mapped. Please ensure SKU and Product Name are specified!</span>
                  )}
                </div>
              </div>

              {/* Duplicate/Generation Settings Panel */}
              <div className="border border-brand-line p-3 bg-brand-sidebar flex flex-col gap-2 shrink-0">
                <span className="font-bold uppercase text-[10px] text-brand-ink">Conflict & Auto-Generation Options:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer hover:bg-white p-1 rounded">
                    <input 
                      type="checkbox"
                      checked={overwriteOnImport}
                      onChange={(e) => setOverwriteOnImport(e.target.checked)}
                      className="mt-0.5 accent-brand-ink"
                    />
                    <div>
                      <span className="font-bold">Overwrite matching SKU</span>
                      <p className="text-[9px] opacity-70">If checked, records with existing SKUs in the DB will be updated.</p>
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
                      <span className="font-bold">Auto-generate Barcodes</span>
                      <p className="text-[9px] opacity-70">Generates unique EAN-13 barcodes for blank or duplicate barcode values.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Validation Results Table */}
              {validationErrors.length > 0 && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase text-[10px] opacity-70 flex items-center gap-1 text-brand-ink">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Validation Warnings & Errors ({validationErrors.length})
                    </span>
                  </div>
                  <div className="border border-brand-line bg-white max-h-[140px] overflow-y-auto font-mono text-[9px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-sidebar border-b border-brand-line text-[8px] font-bold uppercase sticky top-0 z-10">
                          <th className="p-1 border-r border-brand-line w-[45px]">Row</th>
                          <th className="p-1 border-r border-brand-line w-[80px]">SKU</th>
                          <th className="p-1 border-r border-brand-line w-[100px] truncate">Product Name</th>
                          <th className="p-1">Validation Audit Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationErrors.map((err, i) => (
                          <tr key={i} className={`border-b border-gray-100 last:border-0 ${err.severity === 'error' ? 'bg-red-50/75 text-red-900' : 'bg-amber-50/75 text-amber-900'}`}>
                            <td className="p-1 border-r border-brand-line text-center font-bold">#{err.row}</td>
                            <td className="p-1 border-r border-brand-line font-bold truncate">{err.sku}</td>
                            <td className="p-1 border-r border-brand-line truncate font-sans font-medium">{err.name}</td>
                            <td className="p-1 font-sans font-medium flex items-center gap-1 flex-wrap">
                              <span className={`px-1 rounded-[2px] font-bold text-[8px] uppercase text-white ${err.severity === 'error' ? 'bg-red-600' : 'bg-amber-600'}`}>
                                {err.severity}
                              </span>
                              <span>{err.message}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Preview Table (First 50 Rows) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="block font-bold uppercase text-[10px] opacity-70">
                  Data Audit Preview ({Math.min(50, parsedProducts.length)} of {parsedProducts.length} processable rows):
                </span>
                <div className="border border-brand-line bg-white max-h-[160px] overflow-y-auto font-mono text-[9px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-header border-b border-brand-line text-[8px] font-bold uppercase sticky top-0 z-10">
                        <th className="p-1 border-r border-brand-line w-[80px]">SKU</th>
                        <th className="p-1 border-r border-brand-line">Product Name</th>
                        <th className="p-1 border-r border-brand-line w-[90px]">Barcode</th>
                        <th className="p-1 border-r border-brand-line w-[65px] text-right">Price</th>
                        <th className="p-1 w-[50px] text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedProducts.slice(0, 50).map((p, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="p-1 border-r border-brand-line font-bold truncate">{p.sku}</td>
                          <td className="p-1 border-r border-brand-line font-sans font-medium truncate max-w-[200px]">{p.name}</td>
                          <td className="p-1 border-r border-brand-line truncate">
                            {p.barcode ? p.barcode : <span className="text-amber-600 font-bold font-sans text-[8px] uppercase">Auto-Gen</span>}
                          </td>
                          <td className="p-1 border-r border-brand-line text-right font-bold text-gray-700">${parseFloat(p.selling_price || '0').toFixed(2)}</td>
                          <td className="p-1 text-right text-gray-600">{p.stock_quantity}</td>
                        </tr>
                      ))}
                      {parsedProducts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-red-500 font-sans font-bold uppercase">
                            No processable records. Please fix the validation errors above to import.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 shrink-0">
                <button 
                  onClick={executeWizardImport}
                  disabled={parsedProducts.length === 0}
                  className="flex-1 bg-brand-accent text-white border border-brand-line py-2.5 text-xs uppercase font-bold cursor-pointer hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
