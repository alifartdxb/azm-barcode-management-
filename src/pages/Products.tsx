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
import { ProductService } from '../services/ProductService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '../components/ui/table';

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
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newPrice, setNewPrice] = useState('0.00');
  const [newCost, setNewCost] = useState('0.00');
  const [newVat, setNewVat] = useState('5.0');
  const [newSupplier, setNewSupplier] = useState('');
  const [newStock, setNewStock] = useState('0');
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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await ProductService.getAll();
      setProducts(data);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load products: ' + err.message });
    } finally {
      setLoading(false);
    }
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
  const handleManualAddSubmit = async (e: React.FormEvent) => {
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
      brand: newBrand.trim(),
      category: newCategory.trim(),
      unit: newUnit,
      selling_price: parseFloat(newPrice) || 0,
      cost_price: parseFloat(newCost) || 0,
      vat: parseFloat(newVat) || 0,
      supplier: newSupplier.trim(),
      stock_quantity: parseInt(newStock, 10) || 0,
    };

    try {
      const data = await ProductService.save(payload);
      setMessage({ 
        type: 'success', 
        text: `Product '${newName}' created successfully! (Barcode: ${data.barcode})` 
      });
      setIsAddOpen(false);
      // Reset form
      setNewSku('');
      setNewName('');
      setNewBrand('');
      setNewCategory('');
      setNewPrice('0.00');
      setNewCost('0.00');
      setNewVat('5.0');
      setNewSupplier('');
      setNewStock('0');
      setNewBarcode('');
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message);
    }
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
      Brand: p.brand || '',
      Category: p.category || '',
      Unit: p.unit || 'pcs',
      'Selling Price (AED)': p.selling_price,
      'Cost Price (AED)': p.cost_price,
      'VAT (%)': p.vat,
      Supplier: p.supplier || '',
      'Stock Quantity': p.stock_quantity,
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
      Brand: p.brand || '',
      Category: p.category || '',
      Unit: p.unit || 'pcs',
      'Selling Price (AED)': p.selling_price,
      'Cost Price (AED)': p.cost_price,
      'VAT (%)': p.vat,
      Supplier: p.supplier || '',
      'Stock Quantity': p.stock_quantity,
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
              brand: getVal(row.brand || row.Brand || ''),
              category: getVal(row.category || row.Category || ''),
              unit: getVal(row.unit || row.Unit || 'pcs'),
              selling_price: parseFloat(row.selling_price || row['Selling Price'] || row['Selling Price (AED)'] || row.sellingPrice || '0') || 0,
              cost_price: parseFloat(row.cost_price || row['Cost Price'] || row['Cost Price (AED)'] || row.costPrice || '0') || 0,
              vat: parseFloat(row.vat || row.VAT || row['VAT (%)'] || row.vatRate || '0') || 0,
              supplier: getVal(row.supplier || row.Supplier || ''),
              stock_quantity: parseInt(row.stock_quantity || row.Stock || row.Quantity || row['Stock Quantity'] || row.stock || '0', 10) || 0,
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
              brand: getVal(row.brand || row.Brand || ''),
              category: getVal(row.category || row.Category || ''),
              unit: getVal(row.unit || row.Unit || 'pcs'),
              selling_price: parseFloat(row.selling_price || row['Selling Price'] || row['Selling Price (AED)'] || row.sellingPrice || '0') || 0,
              cost_price: parseFloat(row.cost_price || row['Cost Price'] || row['Cost Price (AED)'] || row.costPrice || '0') || 0,
              vat: parseFloat(row.vat || row.VAT || row['VAT (%)'] || row.vatRate || '0') || 0,
              supplier: getVal(row.supplier || row.Supplier || ''),
              stock_quantity: parseInt(row.stock_quantity || row.Stock || row.Quantity || row['Stock Quantity'] || row.stock || '0', 10) || 0,
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
        const result = await ProductService.bulkImport(batch, overwriteOnImport, generateMissingOnImport);
        
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
  const handleBulkGenerateBarcodes = async () => {
    const missingCount = products.filter(p => !p.barcode || p.barcode.trim() === '').length;
    if (missingCount === 0) {
      setMessage({ type: 'info', text: 'All products currently have a barcode associated. No action needed.' });
      return;
    }

    if (confirm(`Do you want to automatically generate EAN-13 barcodes for the ${missingCount} products with missing barcodes?`)) {
      setLoading(true);
      try {
        const generated = await ProductService.generateMissingBarcodes();
        setMessage({ type: 'success', text: `Successfully generated ${generated} barcodes.` });
        fetchProducts();
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Generation failed: ' + err.message });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all products? This action cannot be undone.')) {
      try {
        await ProductService.clearAll();
        setMessage({ type: 'success', text: 'Product inventory cleared completely.' });
        fetchProducts();
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Failed to clear data: ' + err.message });
      }
    }
  };


  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div 
      className="flex flex-col h-full relative bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/95 border-4 border-dashed border-primary z-50 flex flex-col items-center justify-center p-6 text-primary-foreground animate-in fade-in duration-200">
          <Upload className="w-16 h-16 mb-4 animate-bounce" />
          <span className="font-bold tracking-tight text-2xl">Drop your CSV or Excel file here</span>
          <p className="text-sm opacity-80 mt-2">Process product lists completely in-browser with secure local indexing</p>
        </div>
      )}

      {importProgress !== null && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-lg border">
            <CardContent className="pt-6 pb-6 text-center flex flex-col gap-4">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <span className="font-semibold tracking-tight text-sm">Importing Data...</span>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden relative">
                <div 
                  className="bg-primary h-full transition-all duration-150 ease-out" 
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <span className="font-medium text-sm text-primary">{importProgress}% Completed</span>
              <p className="text-xs text-muted-foreground">Writing items asynchronously to client IndexedDB relational engine...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Inventory & Products</h1>
          <p className="text-sm text-muted-foreground">Manage your product catalog, import bulk data, and view stock levels.</p>
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative max-w-sm mr-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search by SKU, Barcode, Name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 w-64 bg-background"
            />
          </div>

          <Button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
          
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button 
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2"
          >
            {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import Data
          </Button>

          <Button 
            variant="outline"
            onClick={handleExportExcel}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>

          <Button 
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </Button>

          <Button 
            variant="outline"
            onClick={handleBulkGenerateBarcodes}
            title="Auto-Generate barcodes for all existing products lacking a barcode"
            className="flex items-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:border-yellow-900/50 dark:hover:bg-yellow-900/20"
          >
            <Zap className="w-4 h-4 fill-current" />
            Auto Barcodes
          </Button>

          <Button 
            variant="destructive"
            onClick={handleClearAll} 
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Data
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mx-6 mt-6 p-4 rounded-md border text-sm flex items-center justify-between gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-100 dark:border-green-900' : 
          message.type === 'info' ? 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-900' : 
          'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-900'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMessage(null)} className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Product List Table Layout */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <div className="px-6 py-4 border-b flex justify-between items-center bg-card">
            <h3 className="font-semibold text-lg">Product Explorer Database</h3>
            <Badge variant="outline" className="font-normal text-muted-foreground">Showing {filteredProducts.length} items</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[180px]">Barcode & Validation</TableHead>
                <TableHead className="text-right w-[120px]">Price</TableHead>
                <TableHead className="text-right w-[100px]">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span>Fetching secure SQLite index...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <AlertTriangle className="w-10 h-10 text-yellow-500" />
                      <span className="font-medium text-foreground">No records on file</span>
                      <span className="text-sm">Import a CSV spreadsheet or click "Add Product" to get started.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map(p => {
                  const val = p.barcode ? validateBarcode(p.barcode) : null;
                  return (
                    <TableRow key={p.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.category || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {p.barcode ? (
                            <>
                              <span className="font-mono text-xs font-medium">{p.barcode}</span>
                              {val && val.isValid ? (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0 uppercase w-fit scale-90 -ml-1">
                                  {val.type} ✓
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 uppercase w-fit scale-90 -ml-1" title={val?.errorMessage}>
                                  INVALID
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 uppercase w-fit bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                              Missing Barcode
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-sm">
                        ${p.selling_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.stock_quantity > 10 ? 'success' : 'destructive'} className="font-mono text-xs">
                          {p.stock_quantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* SIDE DRAWER: Manual Add Product Form */}
      {isAddOpen && (
        <div className="absolute inset-y-0 right-0 w-[420px] bg-background border-l shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-card">
            <h3 className="font-semibold text-lg">Add New Product</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsAddOpen(false)} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleManualAddSubmit} className="flex-1 overflow-auto p-6 flex flex-col gap-5">
            {formError && (
              <div className="bg-red-50 text-red-900 border-red-200 border p-3 rounded-md text-sm font-medium flex gap-2 items-start dark:bg-red-900/30 dark:text-red-100 dark:border-red-900">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">SKU Code <span className="text-red-500">*</span></label>
                <Input 
                  type="text" 
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. AZ-4022"
                  className={`font-mono ${isSkuDuplicate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                />
                {isSkuDuplicate && <p className="text-red-500 text-xs mt-1">SKU already registered</p>}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Unit Type</label>
                <select 
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="pcs">Pcs (Each)</option>
                  <option value="box">Box</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="mtr">Meter (mtr)</option>
                  <option value="set">Set</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Product Name <span className="text-red-500">*</span></label>
              <Input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Stainless Steel Screws 4mm"
                required
              />
            </div>

            

            <div className="border rounded-md p-4 bg-muted/30 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Barcode (System/Custom)</label>
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={triggerFormBarcodeGen}
                  className="h-7 text-xs flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  Auto-Generate
                </Button>
              </div>
              
              <Input 
                type="text" 
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className={`font-mono ${isBarcodeDuplicate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />

              {isBarcodeDuplicate && (
                <p className="text-red-500 text-xs">Duplicate: Barcode already exists in DB!</p>
              )}

              {newBarcode && barcodeValidation && (
                <div className="flex items-center gap-1.5 text-xs">
                  {barcodeValidation.isValid ? (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid {barcodeValidation.type}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Format Warning: {barcodeValidation.errorMessage}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Retail Price ($)</label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cost Price ($)</label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">VAT (%)</label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={newVat}
                  onChange={(e) => setNewVat(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <Input 
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Fasteners"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Stock Level</label>
                <Input 
                  type="number" 
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Brand / Mfr</label>
                <Input 
                  type="text" 
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Supplier Account</label>
                <Input 
                  type="text" 
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                />
              </div>
            </div>

            

            <div className="mt-auto pt-4 flex gap-3 border-t">
              <Button 
                type="button" 
                variant="outline"
                className="flex-1"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
              >
                Save Product
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CSV IMPORT WIZARD / AUDIT DIALOG */}
      {isImportWizardOpen && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-card rounded-t-xl">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">CSV / Excel Import Audit & Validation</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsImportWizardOpen(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <CardContent className="p-6 overflow-y-auto flex flex-col gap-6">
              
              {/* Audit Stats Bento */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="border rounded-md p-3 text-center bg-card">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Total Rows</div>
                  <div className="font-mono text-2xl font-bold">{wizardStats.total}</div>
                </div>
                <div className="border rounded-md p-3 text-center bg-card border-green-200 dark:border-green-900">
                  <div className="text-xs uppercase tracking-wider text-green-600 dark:text-green-400 font-medium mb-1">Ready</div>
                  <div className="font-mono text-2xl font-bold text-green-600 dark:text-green-400">{parsedProducts.length}</div>
                </div>
                <div className="border rounded-md p-3 text-center bg-card border-red-200 dark:border-red-900">
                  <div className="text-xs uppercase tracking-wider text-red-600 dark:text-red-400 font-medium mb-1">Skipped (Err)</div>
                  <div className="font-mono text-2xl font-bold text-red-600 dark:text-red-400">{wizardStats.skippedRows}</div>
                </div>
                <div className="border rounded-md p-3 text-center bg-card">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Empty</div>
                  <div className="font-mono text-2xl font-bold text-muted-foreground">{wizardStats.emptyRows}</div>
                </div>
                <div className="border rounded-md p-3 text-center bg-card border-amber-200 dark:border-amber-900">
                  <div className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-1">No Barcode</div>
                  <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{wizardStats.missingBarcodes}</div>
                </div>
              </div>

              {/* Column Mapping Details */}
              <div className="border rounded-md p-4 bg-muted/30">
                <span className="block text-sm font-medium mb-2">Mapped Fields / Headers:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(columnMapping).map(([field, fileHeader], i) => (
                    <span key={i}>
                      <Badge variant="outline" className="font-mono bg-background">
                        <span className="text-primary font-semibold mr-1">{field}</span> → <span className="text-muted-foreground ml-1">{fileHeader}</span>
                      </Badge>
                    </span>
                  ))}
                  {Object.keys(columnMapping).length === 0 && (
                    <span className="text-red-500 italic">No columns mapped. Please ensure SKU and Product Name are specified!</span>
                  )}
                </div>
              </div>

              {/* Duplicate/Generation Settings Panel */}
              <div className="border rounded-md p-5 bg-card flex flex-col gap-4">
                <span className="text-sm font-medium">Conflict & Auto-Generation Options:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-muted transition-colors">
                    <input 
                      type="checkbox"
                      checked={overwriteOnImport}
                      onChange={(e) => setOverwriteOnImport(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-sm block">Overwrite matching SKU</span>
                      <p className="text-xs text-muted-foreground mt-0.5">If checked, records with existing SKUs in the DB will be updated.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-muted transition-colors">
                    <input 
                      type="checkbox"
                      checked={generateMissingOnImport}
                      onChange={(e) => setGenerateMissingOnImport(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-medium text-sm block">Auto-generate Barcodes</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Generates unique EAN-13 barcodes for blank or duplicate barcode values.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Validation Results Table */}
              {validationErrors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                      Validation Warnings & Errors ({validationErrors.length})
                    </span>
                  </div>
                  <div className="border rounded-md bg-background max-h-[160px] overflow-y-auto text-sm">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Row</TableHead>
                          <TableHead className="w-[120px]">SKU</TableHead>
                          <TableHead className="w-[180px]">Product Name</TableHead>
                          <TableHead>Validation Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationErrors.map((err, i) => (
                          <TableRow key={i} className={err.severity === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-amber-50/50 dark:bg-amber-900/10'}>
                            <TableCell className="font-mono text-xs">#{err.row}</TableCell>
                            <TableCell className="font-mono text-xs">{err.sku}</TableCell>
                            <TableCell className="truncate max-w-[180px]">{err.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant={err.severity === 'error' ? 'destructive' : 'warning'} className="text-[10px] px-1.5 py-0 uppercase">
                                  {err.severity}
                                </Badge>
                                <span>{err.message}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Data Preview Table (First 50 Rows) */}
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-sm">
                  Data Audit Preview ({Math.min(50, parsedProducts.length)} of {parsedProducts.length} processable rows):
                </span>
                <div className="border rounded-md bg-background max-h-[200px] overflow-y-auto text-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">SKU</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="w-[120px]">Barcode</TableHead>
                        <TableHead className="w-[100px] text-right">Price</TableHead>
                        <TableHead className="w-[80px] text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedProducts.slice(0, 50).map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-medium">{p.sku}</TableCell>
                          <TableCell className="truncate max-w-[300px]">{p.name}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.barcode ? p.barcode : <Badge variant="warning" className="text-[10px] px-1.5 py-0 uppercase">Auto-Gen</Badge>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">${parseFloat(p.selling_price || '0').toFixed(2)}</TableCell>
                          <TableCell className="text-right">{p.stock_quantity}</TableCell>
                        </TableRow>
                      ))}
                      {parsedProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-red-500 font-medium">
                            No processable records. Please fix the validation errors above to import.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t mt-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsImportWizardOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={executeWizardImport}
                  disabled={parsedProducts.length === 0}
                  className="flex-1"
                >
                  Confirm and Run Import
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
