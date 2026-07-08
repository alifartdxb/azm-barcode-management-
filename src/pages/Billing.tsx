import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Minus, Trash2, Search, Scan, Printer, CreditCard, 
  UserPlus, FileText, AlertCircle, CheckCircle2, RefreshCw, 
  Coins, FileSpreadsheet, Sparkles, ArrowRight, UserCheck, Eye, X, Calendar
} from 'lucide-react';
import { Product, Customer, Invoice, InvoiceItem } from '../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { InvoiceService } from '../services/InvoiceService';

export default function Billing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Invoice Form State
  const [cart, setCart] = useState<{ product: Product; quantity: number; price: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [customCustomerName, setCustomCustomerName] = useState('Cash Customer');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  // Scanning State
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);
  
  // Product Search State (for manual additions)
  const [prodSearch, setProdSearch] = useState('');
  
  // Quick-Add Customer Dialog
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustNameAr, setNewCustNameAr] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustTrn, setNewCustTrn] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [custModalError, setCustModalError] = useState('');

  // Selected invoice for detail view & printing modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<InvoiceItem[]>([]);
  const [printLayout, setPrintLayout] = useState<'A4' | 'thermal'>('A4');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsRes, custsRes, invsRes] = await Promise.all([
        ProductService.getAll(),
        CustomerService.getAll(),
        InvoiceService.getAll()
      ]);

      setProducts(prodsRes || []);
      setCustomers(custsRes || []);
      setInvoices(invsRes || []);

      // Default to "Cash Customer" if found
      const cashCust = (custsRes || []).find((c: any) => c.name.toLowerCase().includes('cash'));
      if (cashCust && cashCust.id !== undefined) {
        setSelectedCustomerId(cashCust.id);
      }
    } catch (err) {
      console.error('Error loading billing dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handles fast barcode scan submission
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const trimmed = scanInput.trim();
    const foundProduct = products.find(p => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase());

    if (foundProduct) {
      addToCart(foundProduct);
      setScanSuccess(`Added ${foundProduct.name} to cart.`);
      setScanError('');
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(100);
    } else {
      setScanError(`No product matches barcode/SKU: "${trimmed}"`);
      setScanSuccess('');
    }
    setScanInput('');
    
    // Auto clear feedback after 3s
    setTimeout(() => {
      setScanSuccess('');
      setScanError('');
    }, 3000);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1, price: product.selling_price }];
    });
  };

  const updateCartQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQty } 
        : item
    ));
  };

  const updateCartPrice = (productId: number, newPrice: number) => {
    const cleanPrice = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, price: cleanPrice } 
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustModalError('');
    if (!newCustName.trim()) {
      setCustModalError('Customer Name is required.');
      return;
    }

    try {
      await CustomerService.save({
        name: newCustName.trim(),
        
        phone: newCustPhone.trim(),
        trn: newCustTrn.trim(),
        address: newCustAddress.trim(),
        balance: 0
      });

      // Reload Customers list
      const updatedCusts = await CustomerService.getAll();
      setCustomers(updatedCusts);
      
      const newCust = updatedCusts.find(c => c.name === newCustName.trim());
      
      // Auto select the newly created customer
      if (newCust && newCust.id !== undefined) {
         setSelectedCustomerId(newCust.id);
      }
      
      // Reset & Hide Modal
      setNewCustName('');
      setNewCustNameAr('');
      setNewCustPhone('');
      setNewCustTrn('');
      setNewCustAddress('');
      setShowAddCustModal(false);
    } catch (err: any) {
      setCustModalError('Error connection to server: ' + err.message);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  // Calculate VAT based on item profile or standard UAE 5% if not defined.
  const vatAmount = cart.reduce((acc, item) => {
    const vatRate = item.product.vat !== undefined ? item.product.vat : 5;
    const itemSubtotal = item.price * item.quantity;
    // VAT is calculated from the selling price: (VAT / 100) * Base Price
    const lineVat = (vatRate / 100) * itemSubtotal;
    return acc + lineVat;
  }, 0);

  const grandTotal = Math.max(0, subtotal + vatAmount - discount);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart Empty: Add items to invoice before compiling.');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    const clientName = customer ? customer.name : customCustomerName;
    const clientTrn = customer ? customer.trn : '';

    const payload = {
      customer_id: selectedCustomerId || null,
      customer_name: clientName,
      customer_trn: clientTrn,
      date: new Date().toISOString().slice(0, 10),
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
      grand_total: Math.round(grandTotal * 100) / 100,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      notes: notes,
      items: cart.map(item => {
        const vatRate = item.product.vat !== undefined ? item.product.vat : 5;
        const lineSub = item.price * item.quantity;
        const lineVat = (vatRate / 100) * lineSub;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          quantity: item.quantity,
          unit_price: item.price,
          vat_rate: vatRate,
          vat_amount: Math.round(lineVat * 100) / 100,
          total_amount: Math.round((lineSub + lineVat) * 100) / 100
        };
      })
    };

    try {
      const savedInvoice = await InvoiceService.save(payload);

      // Success
      alert(`Invoice created successfully! Number: ${savedInvoice.invoice_number}`);
      
      // Clear cart & state
      setCart([]);
      setDiscount(0);
      setNotes('');
      setScanInput('');
      
      // Re-fetch invoices and products (to update product stock counts!)
      loadData();
      
      // Fetch details of newly compiled invoice to auto show printing modal
      if (savedInvoice.id !== undefined) {
         fetchInvoiceDetails(savedInvoice.id);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Network Error during invoice processing.');
    }
  };

  const fetchInvoiceDetails = async (id: number) => {
    try {
      const data = await InvoiceService.getById(id);
      if (data) {
        setSelectedInvoice(data);
        setSelectedInvoiceItems(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching invoice items:', err);
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Are you absolutely sure you want to void this invoice? This will restore product stock levels and revert customer outstanding balances.')) return;
    try {
      await InvoiceService.delete(id);
      alert('Invoice deleted successfully');
      loadData();
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice(null);
      }
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice');
    }
  };


  const handleExportSalesReportCSV = () => {
    if (invoices.length === 0) {
      alert("No sales records to export.");
      return;
    }
    const cleanData = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Date': inv.date,
      'Customer Name': inv.customer_name,
      'Customer TRN': inv.customer_trn || '',
      'Payment Status': inv.payment_status,
      'Payment Method': inv.payment_method,
      'Subtotal (AED)': inv.subtotal,
      'VAT Amount (AED)': inv.vat_amount,
      'Discount (AED)': inv.discount,
      'Grand Total (AED)': inv.grand_total,
      'Notes': inv.notes || ''
    }));

    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesReportExcel = () => {
    if (invoices.length === 0) {
      alert("No sales records to export.");
      return;
    }
    const cleanData = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Date': inv.date,
      'Customer Name': inv.customer_name,
      'Customer TRN': inv.customer_trn || '',
      'Payment Status': inv.payment_status,
      'Payment Method': inv.payment_method,
      'Subtotal (AED)': inv.subtotal,
      'VAT Amount (AED)': inv.vat_amount,
      'Discount (AED)': inv.discount,
      'Grand Total (AED)': inv.grand_total,
      'Notes': inv.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales_Report');
    XLSX.writeFile(workbook, `sales_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredProdSearchResults = products.filter(p => 
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(prodSearch))
  ).slice(0, 8); // top 8 results for space reasons

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="flex flex-col h-full bg-brand-bg relative overflow-hidden">
      
      {/* HEADER CONTROLS */}
      <div className="px-4 py-2 border-b-2 border-brand-line bg-white flex justify-between items-center shrink-0 print:hidden">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-brand-ink" />
          <h1 className="font-sans font-black text-sm uppercase tracking-wider text-brand-ink">POS & Billing Center</h1>
        </div>

        <div className="flex border-2 border-brand-line p-0.5 bg-brand-sidebar">
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer ${activeTab === 'create' ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-white'}`}
          >
            New Sale (Scanner Mode)
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer ${activeTab === 'history' ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-white'}`}
          >
            Invoice Registry ({invoices.length})
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        /* CREATE NEW INVOICE VIEW */
        <div className="flex-1 flex overflow-hidden print:hidden">
          
          {/* CART AND SCANNER PANEL */}
          <div className="flex-1 flex flex-col p-4 overflow-auto gap-4">
            
            {/* USB BARCODE SCANNER EMULATOR INPUT BAR */}
            <div className="bg-white border-2 border-brand-line p-4 shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-sans font-black text-xs uppercase text-brand-ink">
                  <Scan className="w-4 h-4 text-brand-accent animate-pulse" />
                  Live USB Barcode Scanner Ingress
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5">READY FOR BEAM SCAN</span>
              </div>
              
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <input 
                  type="text"
                  ref={scannerInputRef}
                  placeholder="Focus here & scan barcode or type SKU and press Enter..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="flex-1 border-2 border-brand-line px-3 py-2 text-sm outline-none font-mono bg-[#fdfdfd] focus:bg-amber-50/20"
                />
                <button 
                  type="submit"
                  className="bg-brand-ink text-white px-5 text-xs font-bold uppercase cursor-pointer hover:bg-opacity-95"
                >
                  Simulate Scan
                </button>
              </form>

              {/* Feedback messages */}
              {scanError && (
                <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
              {scanSuccess && (
                <div className="mt-2 text-xs font-bold text-green-600 bg-green-50 border border-green-200 p-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scanSuccess}</span>
                </div>
              )}
            </div>

            {/* MANUAL PRODUCT SELECTOR BENTO BOX */}
            <div className="bg-white border-2 border-brand-line p-4 shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
              <span className="font-sans font-black text-xs uppercase text-brand-ink block mb-2">Manual Search & Add</span>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  type="text"
                  placeholder="Type product name, SKU, category to select..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  className="w-full border border-brand-line pl-10 pr-4 py-2 text-xs bg-brand-sidebar"
                />
              </div>

              {/* Instant Search Results */}
              {prodSearch && (
                <div className="mt-2 border border-brand-line divide-y divide-gray-100 bg-white max-h-60 overflow-auto text-xs z-10 relative">
                  {filteredProdSearchResults.length > 0 ? (
                    filteredProdSearchResults.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          addToCart(p);
                          setProdSearch('');
                        }}
                        className="p-2 hover:bg-brand-bg flex justify-between items-center cursor-pointer"
                      >
                        <div>
                          <strong className="text-brand-ink">{p.name}</strong>
                          
                          <div className="text-[10px] font-mono text-gray-400">SKU: {p.sku} | Barcode: {p.barcode || 'N/A'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono bg-blue-50 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 border border-blue-100">
                            Stock: {p.stock_quantity}
                          </span>
                          <strong className="font-mono text-brand-ink">{p.selling_price.toFixed(2)} AED</strong>
                          <Plus className="w-4 h-4 text-brand-accent shrink-0" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 italic">No products found matching query.</div>
                  )}
                </div>
              )}
            </div>

            {/* LIVE SHOPPING CART LIST TABLE */}
            <div className="bg-white border-2 border-brand-line flex-1 flex flex-col shadow-[4px_4px_0_rgba(0,0,0,0.1)] overflow-hidden min-h-[250px]">
              <div className="px-3 py-2 bg-brand-header border-b border-brand-line text-[10px] font-bold uppercase flex justify-between items-center shrink-0">
                <span>ITEMS ADDED TO INVOICE ({cart.length})</span>
                <button 
                  onClick={() => setCart([])} 
                  disabled={cart.length === 0}
                  className="text-red-600 underline font-bold text-[9px] cursor-pointer hover:opacity-80 disabled:opacity-40"
                >
                  Empty Cart
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {cart.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-sidebar border-b border-brand-line text-[9px] font-bold uppercase text-gray-500 font-mono">
                        <th className="p-2 pl-3">Item Details</th>
                        <th className="p-2 text-center w-24">Unit Price</th>
                        <th className="p-2 text-center w-24">VAT Rate</th>
                        <th className="p-2 text-center w-36">Quantity</th>
                        <th className="p-2 text-right w-28 pr-3">Total (Excl. VAT)</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {cart.map(item => {
                        const isLowStock = item.product.stock_quantity < item.quantity;
                        const vatRate = item.product.vat !== undefined ? item.product.vat : 5;
                        const lineTotal = item.price * item.quantity;
                        
                        return (
                          <tr key={item.product.id} className="hover:bg-brand-bg group">
                            <td className="p-2 pl-3">
                              <div className="font-bold text-brand-ink truncate max-w-[200px] sm:max-w-xs">{item.product.name}</div>
                              
                              <div className="text-[9px] font-mono text-gray-400">
                                SKU: {item.product.sku} | Barcode: {item.product.barcode || 'N/A'}
                              </div>
                              <div className="mt-1 flex gap-2">
                                <span className={`text-[8px] font-bold font-mono px-1 py-0.5 border ${
                                  isLowStock 
                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                    : 'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                  Ava. Stock: {item.product.stock_quantity}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <input 
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateCartPrice(item.product.id, parseFloat(e.target.value))}
                                className="w-20 border border-brand-line font-mono text-center text-xs p-1 bg-brand-sidebar"
                              />
                            </td>
                            <td className="p-2 text-center text-gray-500 font-mono text-[10px]">
                              {vatRate}%
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                                  className="w-5 h-5 border border-brand-line flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-xs font-bold"
                                >
                                  -
                                </button>
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateCartQty(item.product.id, parseInt(e.target.value, 10) || 0)}
                                  className="w-10 border border-brand-line text-center text-xs p-1 font-mono"
                                />
                                <button 
                                  onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                                  className="w-5 h-5 border border-brand-line flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2 text-right pr-3 font-mono font-bold text-brand-ink">
                              {lineTotal.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                    <Scan className="w-8 h-8 text-gray-300 stroke-[1.5] animate-pulse" />
                    <span className="text-xs uppercase font-bold text-gray-400">Cart is Empty</span>
                    <p className="text-[10px] max-w-xs mt-1">Scan a physical label barcode or search products using the tools above to compile an invoice.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* CHECKOUT CONFIGURATION AND CHECKOUT SUMMARY */}
          <div className="w-[360px] bg-white border-l-2 border-brand-line flex flex-col overflow-auto bg-brand-bg shrink-0">
            
            <div className="px-3 py-2 border-b border-brand-line font-bold text-[10px] uppercase tracking-wider bg-brand-header text-brand-ink flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1 font-sans font-black">
                <CreditCard className="w-4 h-4" />
                CUSTOMER & SETTLEMENT
              </span>
              <span className="bg-brand-accent text-white font-mono text-[9px] px-1">INVOICE PREP</span>
            </div>

            <div className="p-4 flex flex-col gap-4">
              
              {/* CUSTOMER SELECTOR */}
              <div className="bg-white border border-brand-line p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold uppercase text-brand-ink">Invoice Customer</label>
                  <button 
                    onClick={() => setShowAddCustModal(true)}
                    className="text-[9px] font-bold uppercase text-brand-ink underline flex items-center gap-0.5 hover:opacity-80"
                  >
                    <UserPlus className="w-3 h-3 text-brand-accent" />
                    New Customer
                  </button>
                </div>

                <select 
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCustomerId(val ? parseInt(val, 10) : '');
                  }}
                  className="w-full border border-brand-line p-1.5 text-xs outline-none bg-brand-sidebar cursor-pointer font-bold"
                >
                  <option value="">-- Guest Cash Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.trn ? `(TRN: ${c.trn})` : ''}</option>
                  ))}
                </select>

                {/* Inline custom name for guest customer */}
                {selectedCustomerId === '' && (
                  <div className="mt-2.5">
                    <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Guest Customer Name</label>
                    <input 
                      type="text"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      placeholder="e.g. Walk-in Customer"
                      className="w-full border border-brand-line px-2 py-1 text-xs"
                    />
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-2.5 bg-gray-50 border border-gray-100 p-2 text-[10px] font-mono text-gray-600">
                    <div className="font-bold text-brand-ink">CRM File: #{selectedCustomer.id}</div>
                    
                    {selectedCustomer.phone && <div>Phone: {selectedCustomer.phone}</div>}
                    {selectedCustomer.trn && <div>TRN: <span className="font-bold text-blue-700">{selectedCustomer.trn}</span></div>}
                    {selectedCustomer.address && <div className="truncate">Addr: {selectedCustomer.address}</div>}
                    <div className="mt-1 border-t border-dashed border-gray-200 pt-1 flex justify-between">
                      <span>Credit Balance:</span>
                      <strong className={selectedCustomer.balance > 0 ? 'text-red-600 font-extrabold' : 'text-green-600 font-extrabold'}>
                        {selectedCustomer.balance.toFixed(2)} AED
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* PAYMENT CONFIG */}
              <div className="bg-white border border-brand-line p-3 flex flex-col gap-3">
                <span className="font-bold text-[10px] uppercase block text-brand-ink">Settlement Configurations</span>
                
                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Payment Method</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Cash', 'Card', 'Bank Transfer'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 text-[10px] font-bold uppercase border cursor-pointer ${
                          paymentMethod === m 
                            ? 'bg-brand-ink text-white border-brand-ink' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Payment Status</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Paid', 'Unpaid', 'Partial'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPaymentStatus(s)}
                        className={`py-1.5 text-[10px] font-bold uppercase border cursor-pointer ${
                          paymentStatus === s 
                            ? 'bg-brand-ink text-white border-brand-ink' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {paymentStatus !== 'Paid' && selectedCustomerId === '' && (
                    <div className="mt-1 text-[9px] text-amber-700 font-bold bg-amber-50 p-1 border border-amber-200 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Warning: Select a CRM Customer to register credit outstanding, otherwise it cannot be audited.</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Custom Discount (AED)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-brand-line px-2 py-1 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-500 mb-0.5">Invoice Notes</label>
                  <textarea 
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. LPO number or project site references..."
                    className="w-full border border-brand-line p-1.5 text-xs outline-none"
                  />
                </div>

              </div>

              {/* FINAL FINANCIAL SUMMARY */}
              <div className="bg-brand-ink text-white border-2 border-brand-line p-4 shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
                <span className="font-bold text-[10px] uppercase tracking-wider block border-b border-[#333] pb-1.5 mb-2.5">
                  BILLING BREAKDOWN
                </span>

                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="opacity-75">Subtotal (Excl. VAT):</span>
                    <span>{subtotal.toFixed(2)} AED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-75">UAE Standard VAT (5%):</span>
                    <span>{vatAmount.toFixed(2)} AED</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-yellow-300">
                      <span className="opacity-75">Discount Adjustment:</span>
                      <span>-{discount.toFixed(2)} AED</span>
                    </div>
                  )}
                  <div className="border-t border-[#333] pt-2 mt-2 flex justify-between items-baseline">
                    <strong className="text-xs uppercase font-sans font-extrabold text-white">Total Amount Due:</strong>
                    <strong className="text-xl font-bold font-mono text-brand-accent">
                      {grandTotal.toFixed(2)} <span className="text-xs">AED</span>
                    </strong>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-white text-brand-ink border-2 border-brand-line py-2.5 mt-4 text-xs uppercase font-extrabold cursor-pointer hover:bg-brand-accent hover:text-white disabled:opacity-50 transition-all text-center flex items-center justify-center gap-1"
                >
                  <span>COMPILE & SIGN INVOICE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

        </div>
      ) : (
        /* INVOICE REGISTRY / HISTORY VIEW */
        <div className="flex-1 flex flex-col p-4 overflow-auto gap-4 print:hidden">
          
          <div className="bg-white border-2 border-brand-line p-4 shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 border-b-2 border-brand-line pb-3">
              <h2 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink">Enterprise Sales Ledger</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportSalesReportExcel}
                  className="bg-[#217346] text-white border border-brand-line px-3 py-1.5 text-[10px] font-bold uppercase cursor-pointer hover:opacity-90 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Excel Report
                </button>
                <button 
                  onClick={handleExportSalesReportCSV}
                  className="bg-brand-ink text-white border border-brand-line px-3 py-1.5 text-[10px] font-bold uppercase cursor-pointer hover:opacity-90 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export CSV Report
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-brand-sidebar border-b border-brand-line text-[10px] font-bold uppercase text-gray-500 font-mono">
                    <th className="p-2.5">Invoice Serial No.</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Customer Name</th>
                    <th className="p-2.5 text-center">Payment Status</th>
                    <th className="p-2.5 text-center">Settlement</th>
                    <th className="p-2.5 text-right">VAT (5%)</th>
                    <th className="p-2.5 text-right">Grand Total</th>
                    <th className="p-2.5 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length > 0 ? (
                    invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-brand-bg">
                        <td className="p-2.5 font-mono font-bold text-brand-ink">{inv.invoice_number}</td>
                        <td className="p-2.5 font-mono text-gray-500">{inv.date}</td>
                        <td className="p-2.5 font-bold">{inv.customer_name}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${
                            inv.payment_status === 'Paid' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : inv.payment_status === 'Unpaid' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono text-[10px] text-gray-500">{inv.payment_method}</td>
                        <td className="p-2.5 text-right font-mono text-gray-600">{inv.vat_amount.toFixed(2)} AED</td>
                        <td className="p-2.5 text-right font-mono font-black text-brand-ink">{inv.grand_total.toFixed(2)} AED</td>
                        <td className="p-2.5">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => fetchInvoiceDetails(inv.id)}
                              className="bg-brand-ink text-white border border-brand-line px-2 py-1 text-[10px] font-bold uppercase cursor-pointer hover:bg-opacity-90 flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                            <button 
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="border border-red-200 hover:bg-red-50 text-red-600 px-2 py-1 text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Void
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400 italic">No invoices are currently registered in SQLite database. Complete a sale above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL DIALOG (inline) */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="w-full max-w-md bg-white border-2 border-brand-line shadow-[8px_8px_0_rgba(0,0,0,0.15)] flex flex-col">
            <div className="px-4 py-2.5 bg-brand-header border-b border-brand-line text-xs font-bold uppercase text-brand-ink flex justify-between items-center">
              <span className="flex items-center gap-1">
                <UserPlus className="w-4 h-4 text-brand-accent" />
                Add New Customer to Ledger
              </span>
              <button onClick={() => setShowAddCustModal(false)}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-4 flex flex-col gap-3 text-xs">
              {custModalError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-2 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{custModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Customer Name (English) *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Al Habtoor Projects"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-brand-sidebar"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Arabic Name (for billing)</label>
                <input 
                  type="text"
                  placeholder="e.g. مشاريع الحبتور"
                  value={newCustNameAr}
                  onChange={(e) => setNewCustNameAr(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-brand-sidebar text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Phone Number</label>
                  <input 
                    type="text"
                    placeholder="e.g. +971 50..."
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full border border-brand-line px-3 py-1.5 bg-brand-sidebar"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">TRN No. (UAE 15-digit)</label>
                  <input 
                    type="text"
                    placeholder="100XXXXXXXXXXXX"
                    value={newCustTrn}
                    onChange={(e) => setNewCustTrn(e.target.value)}
                    className="w-full border border-brand-line px-3 py-1.5 bg-brand-sidebar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Address Location</label>
                <input 
                  type="text"
                  placeholder="e.g. Industrial Area 3, Sharjah"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-brand-sidebar"
                />
              </div>

              <div className="mt-2.5 flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-brand-ink text-white border-2 border-brand-line py-2 text-xs font-bold uppercase cursor-pointer hover:bg-opacity-95 text-center"
                >
                  Save CRM Ledger File
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className="border border-brand-line px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPILATION AND TAX INVOICE PRINTING MODAL SCREEN (TRIGGERS STANDARD PRINT DIALOG) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 overflow-auto flex justify-center p-4 print:p-0 print:bg-white print:static print:h-auto print:overflow-visible">
          <div className="w-full max-w-3xl bg-[#fafafa] border-2 border-brand-line shadow-[10px_10px_0_rgba(0,0,0,0.15)] h-fit my-4 flex flex-col print:border-none print:shadow-none print:my-0 print:max-w-none print:w-full print:bg-white">
            
            {/* Modal Controls Bar */}
            <div className="px-4 py-2.5 bg-brand-header border-b border-brand-line text-xs font-bold uppercase text-brand-ink flex justify-between items-center print:hidden">
              <span className="flex items-center gap-1.5 font-sans font-black">
                <FileText className="w-4 h-4 text-brand-accent animate-pulse" />
                TAX INVOICE VIEWPORT: {selectedInvoice.invoice_number}
              </span>
              <div className="flex gap-2">
                <div className="flex border border-brand-line bg-white p-0.5">
                  <button 
                    onClick={() => setPrintLayout('A4')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase ${printLayout === 'A4' ? 'bg-brand-ink text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Standard A4 Sheet
                  </button>
                  <button 
                    onClick={() => setPrintLayout('thermal')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase ${printLayout === 'thermal' ? 'bg-brand-ink text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Thermal Slip 80mm
                  </button>
                </div>
                <button 
                  onClick={() => window.print()}
                  className="bg-brand-ink text-white border border-brand-line px-3 py-1 text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer hover:opacity-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Document
                </button>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="border border-brand-line px-3 py-1 text-[10px] font-bold uppercase bg-white hover:bg-gray-100"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* PRINTABLE AREA CONTAINER */}
            <div className="p-8 bg-white text-black font-sans leading-normal print:p-0">
              
              {printLayout === 'A4' ? (
                /* A4 PORTRAIT TAX INVOICE TEMPLATE */
                <div className="flex flex-col min-h-[297mm] box-border A4-print-element">
                  
                  {/* Store Header bar */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                    <div>
                      <h1 className="text-xl font-black font-sans tracking-tight text-brand-ink m-0">AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)</h1>
                      <div className="text-[11px] text-gray-600 font-sans mt-0.5">
                        Industrial Area, Al Sajaa, Sharjah, U.A.E.<br />
                        Phone: +971 52 684 3809 | Email: sales@alzahrabm.com<br />
                        <strong>TRN: 100259942900003</strong> (Tax Registration Number)
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-black tracking-tight text-brand-ink m-0 uppercase font-mono">TAX INVOICE</h2>
                      <div className="text-[11px] font-mono mt-1 text-gray-600">
                        فاتورة ضريبية
                      </div>
                    </div>
                  </div>

                  {/* Customer and Invoice Details Grid */}
                  <div className="grid grid-cols-2 gap-6 border border-black p-3.5 bg-[#fafafa] text-xs font-mono mb-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[10px] uppercase font-bold text-gray-500 font-sans">BILL TO / العميل:</div>
                      <div className="font-sans font-black text-sm text-brand-ink">{selectedInvoice.customer_name}</div>
                      {selectedInvoice.customer_trn && <div>TRN: <strong>{selectedInvoice.customer_trn}</strong></div>}
                      {selectedCustomer && (
                        <>
                          {selectedCustomer.phone && <div>Phone: {selectedCustomer.phone}</div>}
                          {selectedCustomer.address && <div>Addr: {selectedCustomer.address}</div>}
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      <div className="text-[10px] uppercase font-bold text-gray-500 font-sans">LEDGER METRIC / التفاصيل:</div>
                      <div>Invoice Serial: <strong className="font-sans font-extrabold text-brand-ink">{selectedInvoice.invoice_number}</strong></div>
                      <div>Date Issued: <strong>{selectedInvoice.date}</strong></div>
                      <div>Settlement: <strong className="uppercase">{selectedInvoice.payment_method}</strong></div>
                      <div>Payment Status: <strong className="uppercase">{selectedInvoice.payment_status}</strong></div>
                    </div>
                  </div>

                  {/* Items List Table */}
                  <table className="w-full text-left border-collapse text-xs mb-6">
                    <thead>
                      <tr className="border-y-2 border-black bg-brand-sidebar text-[10px] font-bold uppercase font-mono">
                        <th className="p-2 w-8">#</th>
                        <th className="p-2">Description / البيان</th>
                        <th className="p-2 text-center w-20">Unit Price</th>
                        <th className="p-2 text-center w-16">Qty</th>
                        <th className="p-2 text-right w-24">Vat Rate</th>
                        <th className="p-2 text-right w-24">Vat Amount</th>
                        <th className="p-2 text-right w-28 pl-4">Total (Excl. VAT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoiceItems.map((item, idx) => (
                        <tr key={idx} className="font-mono text-[11px]">
                          <td className="p-2 text-gray-500">{idx + 1}</td>
                          <td className="p-2 font-sans">
                            <strong className="text-brand-ink">{item.product_name}</strong>
                            <div className="text-[9px] font-mono text-gray-400">SKU: {item.sku} {item.barcode ? `| Barcode: ${item.barcode}` : ''}</div>
                          </td>
                          <td className="p-2 text-center">{(item.unit_price).toFixed(2)}</td>
                          <td className="p-2 text-center font-bold">{item.quantity}</td>
                          <td className="p-2 text-right">{item.vat_rate}%</td>
                          <td className="p-2 text-right">{item.vat_amount.toFixed(2)}</td>
                          <td className="p-2 text-right font-bold pr-2">{(item.unit_price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Footer Alignment */}
                  <div className="mt-auto flex justify-between items-start gap-12 border-t border-dashed border-gray-300 pt-4">
                    <div className="text-[10px] text-gray-500 flex-1 font-mono">
                      <strong className="text-gray-700 block mb-0.5">TERMS AND CONDITIONS:</strong>
                      1. All goods are subject to standard UAE tax laws.<br />
                      2. Received goods in perfectly good, usable condition.<br />
                      3. Warranty is only applicable based on manufacturer policies.<br />
                      <div className="mt-4 border border-brand-line p-2 bg-[#fdfdfd] text-brand-ink">
                        <strong>Invoice Memo:</strong> {selectedInvoice.notes || 'N/A'}
                      </div>
                    </div>

                    <div className="w-80 font-mono text-xs flex flex-col gap-1.5 border border-black p-3 bg-brand-sidebar">
                      <div className="flex justify-between">
                        <span>Subtotal (Excl. VAT):</span>
                        <span>{selectedInvoice.subtotal.toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount Adjustment:</span>
                        <span>-{selectedInvoice.discount.toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-300 pb-1.5 mb-1.5">
                        <span>UAE VAT Standard 5%:</span>
                        <span>{selectedInvoice.vat_amount.toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between items-baseline font-sans text-brand-ink">
                        <strong className="text-[11px] uppercase font-bold">Grand Total Due:</strong>
                        <strong className="text-lg font-mono font-black text-brand-ink">
                          {selectedInvoice.grand_total.toFixed(2)} AED
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Arabic Translation Signatures Footer */}
                  <div className="grid grid-cols-2 text-center mt-12 pt-8 border-t border-dashed border-gray-200 text-[10px] font-bold font-sans">
                    <div>
                      <div className="h-12 border-b border-gray-300 w-48 mx-auto"></div>
                      <div className="mt-1.5 text-gray-500 uppercase tracking-wider">Customer Signature / توقيع المستلم</div>
                    </div>
                    <div>
                      <div className="h-12 border-b border-gray-300 w-48 mx-auto"></div>
                      <div className="mt-1.5 text-gray-500 uppercase tracking-wider">Authorized Officer / توقيع الموظف</div>
                    </div>
                  </div>

                </div>
              ) : (
                /* THERMAL SLIP 80MM TEMPLATE */
                <div className="mx-auto w-[80mm] max-w-full font-mono text-[11px] text-black bg-white select-text box-border pb-8">
                  
                  {/* Store info header */}
                  <div className="text-center flex flex-col items-center border-b border-dashed border-black pb-3 mb-3">
                    <strong className="text-xs uppercase tracking-tight block">AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)</strong>
                    <span className="text-[9px] block">Industrial Area, Al Sajaa, Sharjah, U.A.E.</span>
                    <span className="text-[9px] block">Phone: +971 4 223 3445</span>
                    <strong className="text-[9px] block">TRN: 100259942900003</strong>
                    
                    <strong className="text-xs tracking-widest block uppercase mt-2.5 font-bold">--- TAX INVOICE ---</strong>
                    <span className="text-[9px] text-gray-500">فاتورة ضريبية مبسطة</span>
                  </div>

                  {/* Metadata labels */}
                  <div className="flex flex-col gap-0.5 border-b border-dashed border-black pb-2 mb-2">
                    <div>INVOICE: <strong className="font-sans">{selectedInvoice.invoice_number}</strong></div>
                    <div>DATE: {selectedInvoice.date}</div>
                    <div>CUSTOMER: {selectedInvoice.customer_name}</div>
                    {selectedInvoice.customer_trn && <div>TRN: {selectedInvoice.customer_trn}</div>}
                    <div>SETTLED BY: {selectedInvoice.payment_method.toUpperCase()}</div>
                    <div>STATUS: {selectedInvoice.payment_status.toUpperCase()}</div>
                  </div>

                  {/* Items list inline receipt */}
                  <div className="border-b border-dashed border-black pb-2 mb-2">
                    <div className="flex justify-between text-[9px] uppercase font-bold text-gray-500 pb-1">
                      <span>Item Description</span>
                      <span>Qty x Price = Total</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {selectedInvoiceItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                          <div className="font-sans font-bold leading-tight">{item.product_name}</div>
                          <div className="flex justify-between text-[10px]">
                            <span>{item.quantity} x {item.unit_price.toFixed(2)} AED</span>
                            <span>{item.total_amount.toFixed(2)} AED</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary list */}
                  <div className="flex flex-col gap-1 text-right border-b border-dashed border-black pb-2 mb-2">
                    <div className="flex justify-between">
                      <span>Subtotal (Excl. VAT):</span>
                      <span>{selectedInvoice.subtotal.toFixed(2)} AED</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount Adjustment:</span>
                        <span>-{selectedInvoice.discount.toFixed(2)} AED</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Standard UAE VAT 5%:</span>
                      <span>{selectedInvoice.vat_amount.toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-gray-300">
                      <span>GRAND TOTAL DUE:</span>
                      <span>{selectedInvoice.grand_total.toFixed(2)} AED</span>
                    </div>
                  </div>

                  {/* Footer message */}
                  <div className="text-center text-[9px] pt-2 flex flex-col gap-0.5">
                    <span>* Thank You For Visiting *</span>
                    <span>AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)</span>
                    <span>E-Invoice generated in database</span>
                    <span>sqlite3 ID: {selectedInvoice.id}</span>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
