import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Upload, Plus, Search, RefreshCw, Trash2, CheckCircle2, 
  AlertTriangle, X, Zap, Check, FileSpreadsheet, ShieldAlert 
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { formatCurrency } from '../utils/currency';
import { validateBarcode, generateLocalEan13 } from '../utils/barcode';
import { ProductService } from '../services/ProductService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '../components/ui/table';
import { normalizeProductName, previewNextSku, previewNextBarcode } from '../utils/localDb';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
}

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
  
  // New pricing and warehouse/notes fields
  const [newPriceCode, setNewPriceCode] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newMinStock, setNewMinStock] = useState('10');
  const [newWarehouse, setNewWarehouse] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  const [saveAndNewFlag, setSaveAndNewFlag] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Column customization & sorting states
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'sku', label: 'SKU', visible: true, width: 90 },
    { id: 'barcode', label: 'Barcode', visible: true, width: 150 },
    { id: 'name', label: 'Product Name', visible: true, width: 230 },
    { id: 'unit', label: 'Unit', visible: true, width: 80 },
    { id: 'price_code', label: 'Price Code', visible: true, width: 110 },
    { id: 'retail_price', label: 'Retail Price (AED)', visible: true, width: 130 },
    { id: 'cost_price', label: 'Cost Price (AED)', visible: true, width: 130 },
    { id: 'brand', label: 'Brand', visible: true, width: 100 },
    { id: 'category', label: 'Category', visible: true, width: 110 },
    { id: 'supplier', label: 'Supplier', visible: true, width: 130 },
    { id: 'stock', label: 'Stock', visible: true, width: 85 },
    { id: 'actions', label: 'Actions', visible: true, width: 100 }
  ]);

  const unitSelectRef = useRef<HTMLSelectElement>(null);

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

  // Auto-generate SKU/Barcode on open
  useEffect(() => {
    if (isAddOpen) {
      const initSeqs = async () => {
        try {
          const nextSku = await previewNextSku();
          const nextBarcode = await previewNextBarcode();
          setNewSku(nextSku);
          setNewBarcode(nextBarcode);
        } catch (e) {
          console.error(e);
        }
      };
      initSeqs();

      setTimeout(() => {
        if (unitSelectRef.current) {
          unitSelectRef.current.focus();
        }
      }, 100);
    }
  }, [isAddOpen]);

  const handleClearForm = () => {
    setNewName('');
    setNewBrand('');
    setNewCategory('');
    setNewPrice('0.00');
    setNewCost('0.00');
    setNewVat('5.0');
    setNewSupplier('');
    setNewStock('0');
    setNewPriceCode('');
    setNewImageUrl('');
    setNewMinStock('10');
    setNewWarehouse('');
    setNewNotes('');
    
    const resetSeqs = async () => {
      try {
        const nextSku = await previewNextSku();
        const nextBarcode = await previewNextBarcode();
        setNewSku(nextSku);
        setNewBarcode(nextBarcode);
      } catch (e) {
        console.error(e);
      }
    };
    resetSeqs();
    
    setTimeout(() => {
      if (unitSelectRef.current) {
        unitSelectRef.current.focus();
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.currentTarget.tagName.toLowerCase() === 'textarea') return;
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;
      
      const focusableSelector = 'input:not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled])';
      const elements = Array.from(form.querySelectorAll(focusableSelector)) as HTMLElement[];
      const index = elements.indexOf(e.currentTarget);
      if (index > -1 && index < elements.length - 1) {
        elements[index + 1].focus();
      }
    }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSku = newSku.trim();
    const cleanName = newName.trim();
    const cleanBarcode = newBarcode.trim();

    if (!cleanSku || !cleanName) {
      setFormError('SKU and Product Name are required fields.');
      return;
    }

    if (isSkuDuplicate) {
      setFormError(`SKU '${cleanSku}' is already assigned to a product.`);
      return;
    }

    if (isBarcodeDuplicate) {
      setFormError(`Barcode '${cleanBarcode}' is already assigned to a product.`);
      return;
    }

    if (cleanBarcode && barcodeValidation && !barcodeValidation.isValid) {
      setFormError(`Barcode format issue: ${barcodeValidation.errorMessage}`);
      return;
    }

    // Duplicate Product Name validation (case-insensitive, space-agnostic)
    const normName = normalizeProductName(cleanName);
    const hasNameDuplicate = products.some(p => normalizeProductName(p.name) === normName);
    if (hasNameDuplicate) {
      setFormError(`Product already exists.`);
      return;
    }

    const payload = {
      sku: cleanSku,
      barcode: cleanBarcode,
      name: cleanName,
      brand: newBrand.trim(),
      category: newCategory.trim(),
      unit: newUnit,
      selling_price: parseFloat(newPrice) || 0,
      cost_price: parseFloat(newCost) || 0,
      vat: parseFloat(newVat) || 0,
      supplier: newSupplier.trim(),
      stock_quantity: parseInt(newStock, 10) || 0,
      price_code: newPriceCode.trim(),
      image_url: newImageUrl.trim(),
      minimum_stock: parseInt(newMinStock, 10) || 10,
      warehouse_location: newWarehouse.trim(),
      notes: newNotes.trim()
    };

    try {
      const saved = await ProductService.save(payload);
      setMessage({ 
        type: 'success', 
        text: `Product '${cleanName}' created successfully!` 
      });
      fetchProducts();

      if (saveAndNewFlag) {
        // Reset inputs, keeping drawer open
        setNewName('');
        setNewBrand('');
        setNewCategory('');
        setNewPrice('0.00');
        setNewCost('0.00');
        setNewVat('5.0');
        setNewSupplier('');
        setNewStock('0');
        setNewPriceCode('');
        setNewImageUrl('');
        setNewMinStock('10');
        setNewWarehouse('');
        setNewNotes('');
        
        // Auto generate next SKU and Barcode for high-speed entry flow
        const nextSku = await previewNextSku();
        const nextBarcode = await previewNextBarcode();
        setNewSku(nextSku);
        setNewBarcode(nextBarcode);

        // Reset focus
        setTimeout(() => {
          if (unitSelectRef.current) {
            unitSelectRef.current.focus();
          }
        }, 100);
      } else {
        setIsAddOpen(false);
        // Clear all
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
        setNewPriceCode('');
        setNewImageUrl('');
        setNewMinStock('10');
        setNewWarehouse('');
        setNewNotes('');
      }
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      alert("No inventory data to export.");
      return;
    }
    const cleanData = products.map((p) => ({
      SKU: p.sku,
      Barcode: p.barcode || '',
      'Product Name': p.name,
      Unit: p.unit || 'pcs',
      'Price Code': p.price_code || '',
      'Retail Price': p.selling_price,
      'Cost Price': p.cost_price,
      Brand: p.brand || '',
      Category: p.category || '',
      Supplier: p.supplier || '',
      Stock: p.stock_quantity,
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
    if (products.length === 0) {
      alert("No inventory data to export.");
      return;
    }
    const cleanData = products.map((p) => ({
      SKU: p.sku,
      Barcode: p.barcode || '',
      'Product Name': p.name,
      Unit: p.unit || 'pcs',
      'Price Code': p.price_code || '',
      'Retail Price': p.selling_price,
      'Cost Price': p.cost_price,
      Brand: p.brand || '',
      Category: p.category || '',
      Supplier: p.supplier || '',
      Stock: p.stock_quantity,
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
      { field: 'Price Code', keys: ['price_code', 'Price Code', 'PriceCode', 'priceCode'] },
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
    const fileNames = new Set<string>();

    const dbSkuMap = new Set(products.map(p => p.sku.toLowerCase()));
    const dbBarcodeMap = new Set(products.map(p => p.barcode ? p.barcode.toLowerCase() : '').filter(Boolean));
    const dbNamesSet = new Set(products.map(p => normalizeProductName(p.name)));

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

      // 1. Validate Product Name
      if (!cleanName || cleanName.toLowerCase() === 'unknown product') {
        errorsList.push({
          row: rowNum,
          sku: cleanSku || 'N/A',
          name: 'MISSING',
          message: 'Missing Product Name: Product title is a required field.',
          severity: 'error'
        });
        hasRowErr = true;
      } else {
        const normName = normalizeProductName(cleanName);
        
        // If Product Name already exists (case-insensitive, space-agnostic), reject and include in report
        const isUpdateOfSameSku = cleanSku && dbSkuMap.has(cleanSku.toLowerCase()) && 
                                  products.find(x => x.sku.toLowerCase() === cleanSku.toLowerCase())?.name.toLowerCase().trim() === cleanName.toLowerCase().trim();

        if ((dbNamesSet.has(normName) || fileNames.has(normName)) && !isUpdateOfSameSku) {
          errorsList.push({
            row: rowNum,
            sku: cleanSku || 'N/A',
            name: cleanName,
            message: 'Product already exists.',
            severity: 'error'
          });
          hasRowErr = true;
        } else {
          fileNames.add(normName);
        }
      }

      // 2. Validate SKU
      if (!cleanSku) {
        errorsList.push({
          row: rowNum,
          sku: 'AUTO-GEN',
          name: cleanName,
          message: 'Missing SKU: System will auto-generate an auto-incrementing SKU code.',
          severity: 'warning'
        });
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

      // 3. Validate Barcode
      if (!cleanBarcode) {
        blankBarcodes++;
        errorsList.push({
          row: rowNum,
          sku: cleanSku || 'N/A',
          name: cleanName,
          message: 'Missing Barcode: System will auto-generate an EAN-style barcode on import.',
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

        // Validate barcode format if present and not a standard generated template
        if (!cleanBarcode.startsWith('AZM-5253')) {
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
              price_code: getVal(row.price_code || row.priceCode || row['Price Code'] || row.PriceCode || row.Price_Code || ''),
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
              price_code: getVal(row.price_code || row.priceCode || row['Price Code'] || row.PriceCode || row.Price_Code || ''),
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


  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const newCols = [...columns];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newCols.length) {
      const temp = newCols[index];
      newCols[index] = newCols[targetIndex];
      newCols[targetIndex] = temp;
      setColumns(newCols);
    }
  };

  const [resizingColIndex, setResizingColIndex] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

  const startResize = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColIndex(index);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columns[index].width || 100);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColIndex !== null) {
        const deltaX = e.clientX - resizeStartX;
        const newWidth = Math.max(50, resizeStartWidth + deltaX);
        setColumns(cols => cols.map((col, idx) => 
          idx === resizingColIndex ? { ...col, width: newWidth } : col
        ));
      }
    };

    const handleMouseUp = () => {
      setResizingColIndex(null);
    };

    if (resizingColIndex !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColIndex, resizeStartX, resizeStartWidth]);

  const sortedAndFilteredProducts = React.useMemo(() => {
    let result = products.filter(p => {
      const query = searchTerm.toLowerCase();
      return (
        p.sku.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.price_code && p.price_code.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.supplier && p.supplier.toLowerCase().includes(query))
      );
    });

    if (sortField) {
      result.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'retail_price') {
          valA = a.selling_price || 0;
          valB = b.selling_price || 0;
        } else if (sortField === 'cost_price') {
          valA = a.cost_price || 0;
          valB = b.cost_price || 0;
        } else if (sortField === 'stock') {
          valA = a.stock_quantity || 0;
          valB = b.stock_quantity || 0;
        }

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, sortField, sortDirection]);

  const handleDeleteProduct = async (id: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete product '${name}'?`)) {
      try {
        await ProductService.delete(id);
        setMessage({ type: 'success', text: `Product '${name}' deleted successfully.` });
        fetchProducts();
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Failed to delete product: ' + err.message });
      }
    }
  };

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

      {/* Column Visibility and Configuration Panel */}
      <div className="mx-6 mt-4 p-4 rounded-lg border bg-card/50 flex flex-wrap gap-2 items-center text-xs shrink-0">
        <span className="font-semibold text-muted-foreground mr-2">Toggle Visible Columns:</span>
        {columns.map((col, idx) => (
          <button
            key={col.id}
            onClick={() => {
              setColumns(columns.map((c) => c.id === col.id ? { ...c, visible: !c.visible } : c));
            }}
            className={`px-2 py-1 rounded border font-medium flex items-center gap-1 transition-all ${
              col.visible 
                ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' 
                : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
            }`}
          >
            {col.visible ? '✓' : '✗'} {col.label}
          </button>
        ))}
      </div>

      {/* Product List Table Layout */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="min-w-full overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-card shrink-0">
            <h3 className="font-semibold text-lg">Product Explorer Database</h3>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Showing {sortedAndFilteredProducts.length} of {products.length} items
            </Badge>
          </div>

          <div className="overflow-x-auto w-full">
            <Table style={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHeader>
                <TableRow>
                  {columns.filter(col => col.visible).map((col, colIdx) => {
                    const isSorted = sortField === col.id;
                    return (
                      <TableHead 
                        key={col.id} 
                        style={{ width: `${col.width || 120}px` }} 
                        className="relative group select-none py-3"
                      >
                        <div className="flex items-center justify-between">
                          <span 
                            onClick={() => {
                              if (sortField === col.id) {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField(col.id);
                                setSortDirection('asc');
                              }
                            }}
                            className="cursor-pointer font-semibold hover:text-primary flex items-center gap-1 shrink-0"
                          >
                            {col.label}
                            {isSorted && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                          </span>

                          {/* Reordering indicators */}
                          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 ml-2 transition-opacity duration-200">
                            {colIdx > 0 && (
                              <button 
                                onClick={() => moveColumn(columns.indexOf(col), 'left')} 
                                title="Move Column Left"
                                className="p-0.5 bg-muted rounded hover:bg-primary/20 text-[10px]"
                              >
                                ◀
                              </button>
                            )}
                            {colIdx < columns.filter(c => c.visible).length - 1 && (
                              <button 
                                onClick={() => moveColumn(columns.indexOf(col), 'right')} 
                                title="Move Column Right"
                                className="p-0.5 bg-muted rounded hover:bg-primary/20 text-[10px]"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Draggable resize handler handles */}
                        <div 
                          onMouseDown={(e) => startResize(columns.indexOf(col), e)}
                          className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-primary/40 z-10 transition-colors"
                        />
                      </TableHead>
                    );
                  })}
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.filter(c => c.visible).length + 1} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>Fetching secure SQLite index...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedAndFilteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.filter(c => c.visible).length + 1} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <AlertTriangle className="w-10 h-10 text-yellow-500" />
                        <span className="font-medium text-foreground">No records match the query</span>
                        <span className="text-sm">Adjust filters, import a CSV, or click "Add Product".</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndFilteredProducts.map(p => {
                    const barcodeVal = p.barcode ? validateBarcode(p.barcode) : null;
                    return (
                      <TableRow key={p.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                        {columns.filter(col => col.visible).map((col) => {
                          switch (col.id) {
                            case 'sku':
                              return (
                                <TableCell key={col.id} className="font-medium font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                  {p.sku}
                                </TableCell>
                              );
                            case 'barcode':
                              return (
                                <TableCell key={col.id} className="overflow-hidden text-ellipsis whitespace-nowrap">
                                  <div className="flex flex-col gap-0.5">
                                    {p.barcode ? (
                                      <>
                                        <span className="font-mono text-xs font-medium">{p.barcode}</span>
                                        {barcodeVal && barcodeVal.isValid ? (
                                          <Badge variant="success" className="text-[9px] px-1 py-0 uppercase w-fit scale-90 -ml-1">
                                            {barcodeVal.type} ✓
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive" className="text-[9px] px-1 py-0 uppercase w-fit scale-90 -ml-1" title={barcodeVal?.errorMessage}>
                                            INVALID
                                          </Badge>
                                        )}
                                      </>
                                    ) : (
                                      <Badge variant="destructive" className="text-[9px] px-1 py-0 uppercase w-fit bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                                        Missing
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            case 'name':
                              return (
                                <TableCell key={col.id} className="font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={p.name}>
                                  {p.name}
                                </TableCell>
                              );
                            case 'unit':
                              return (
                                <TableCell key={col.id} className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                  {p.unit || 'pcs'}
                                </TableCell>
                              );
                            case 'price_code':
                              return (
                                <TableCell key={col.id} className="font-mono font-medium text-xs text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                                  {p.price_code || '-'}
                                </TableCell>
                              );
                            case 'retail_price':
                              return (
                                <TableCell key={col.id} className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                  {formatCurrency(p.selling_price)}
                                </TableCell>
                              );
                            case 'cost_price':
                              return (
                                <TableCell key={col.id} className="font-mono text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                  {formatCurrency(p.cost_price)}
                                </TableCell>
                              );
                            case 'brand':
                              return (
                                <TableCell key={col.id} className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                  {p.brand || '-'}
                                </TableCell>
                              );
                            case 'category':
                              return (
                                <TableCell key={col.id} className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                  {p.category || '-'}
                                </TableCell>
                              );
                            case 'supplier':
                              return (
                                <TableCell key={col.id} className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                  {p.supplier || '-'}
                                </TableCell>
                              );
                            case 'stock':
                              const isLow = p.stock_quantity <= (p.minimum_stock || 10);
                              return (
                                <TableCell key={col.id} className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                  <Badge variant={isLow ? 'destructive' : 'success'} className="font-mono text-xs">
                                    {p.stock_quantity} {isLow && '⚠️'}
                                  </Badge>
                                </TableCell>
                              );
                            default:
                              return <TableCell key={col.id}>-</TableCell>;
                          }
                        })}
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                            onClick={(e) => handleDeleteProduct(p.id!, p.name, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* SIDE DRAWER: Manual Add Product Form */}
      {isAddOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity" onClick={() => setIsAddOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-card">
              <h3 className="font-semibold text-lg">Add New Product</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsAddOpen(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

          <form onSubmit={handleManualAddSubmit} className="flex-1 overflow-auto p-6 flex flex-col gap-6">
            {formError && (
              <div className="bg-red-50 text-red-900 border-red-200 border p-3 rounded-md text-sm font-medium flex gap-2 items-start dark:bg-red-900/30 dark:text-red-100 dark:border-red-900">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. Identification Group */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">1. Identification</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Unit Type <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-muted-foreground italic">(Autofocused first)</span>
                </label>
                <select 
                  ref={unitSelectRef}
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="pcs">Pcs (Each)</option>
                  <option value="box">Box</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="mtr">Meter (mtr)</option>
                  <option value="set">Set</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Product Name <span className="text-red-500">*</span></label>
                <Input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Arabescato Vagli Marble Slab"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">SKU Code (Auto-Generated)</label>
                  <Input 
                    type="text" 
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Auto-generating..."
                    className={`font-mono ${isSkuDuplicate ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                  {isSkuDuplicate && <p className="text-red-500 text-xs mt-1">SKU already registered</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Brand / Manufacturer</label>
                  <Input 
                    type="text" 
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Antolini"
                  />
                </div>
              </div>

              <div className="border rounded-md p-3.5 bg-muted/30 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Barcode Identification</label>
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const existingCodes = products.map(p => p.barcode || '').filter(Boolean);
                      const generated = generateLocalEan13(existingCodes);
                      setNewBarcode(generated);
                    }}
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
                  onKeyDown={handleKeyDown}
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
                        <AlertTriangle className="w-3.5 h-3.5" /> Warning: {barcodeValidation.errorMessage}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Pricing Group */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">2. Pricing</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Price Code</label>
                  <Input 
                    type="text" 
                    value={newPriceCode}
                    onChange={(e) => setNewPriceCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. GR-01"
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
                    onKeyDown={handleKeyDown}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Retail Price (AED)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cost Price (AED)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Classification Group */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">3. Classification</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Input 
                    type="text" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Granite slabs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Supplier Account</label>
                  <Input 
                    type="text" 
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Carrara Quarry Corp"
                  />
                </div>
              </div>
            </div>

            {/* 4. Inventory Group */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">4. Inventory & Warehouse</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Stock Qty</label>
                  <Input 
                    type="number" 
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Min Stock</label>
                  <Input 
                    type="number" 
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Location</label>
                  <Input 
                    type="text" 
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Row-4B"
                  />
                </div>
              </div>
            </div>

            {/* 5. Additional Information Group */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">5. Additional Specifications</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Product Image URL</label>
                <Input 
                  type="url" 
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes / Custom Specs</label>
                <textarea 
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Thickness, polished status, quality grade specifications..."
                  className="w-full flex min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            {/* High speed data entry checkbox (Save & New) */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/20">
              <input 
                id="saveAndNewCheckbox"
                type="checkbox" 
                checked={saveAndNewFlag}
                onChange={(e) => setSaveAndNewFlag(e.target.checked)}
                className="rounded border-input text-primary focus:ring-ring h-4 w-4 mt-0.5"
              />
              <div className="grid gap-1.5 leading-none">
                <label 
                  htmlFor="saveAndNewCheckbox"
                  className="text-xs font-semibold leading-none cursor-pointer select-none"
                >
                  Save & New (Continuous Entry)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Keeps the sidebar open and automatically updates the next SKU/Barcode sequence for high-speed catalog creation.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 flex flex-col gap-2 mt-auto border-t shrink-0">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  className="flex-1"
                  onClick={handleClearForm}
                  title="Clear all fields and reset SKU / Barcode auto counters"
                >
                  Clear Form
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  className="flex-1 border"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
              </div>
              <Button 
                type="submit" 
                className="w-full font-semibold"
              >
                Save & Register Product
              </Button>
            </div>
          </form>
        </div>
        </>
      )}

      {/* CSV IMPORT WIZARD / AUDIT DIALOG */}
      {isImportWizardOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                          <TableCell className="text-right font-mono text-xs">{formatCurrency(p.selling_price)}</TableCell>
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
