import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, UserPlus, Search, Phone, Mail, FileText, 
  MapPin, Plus, Trash2, Edit, AlertCircle, RefreshCw, X, CircleDollarSign
} from 'lucide-react';
import { Customer, Supplier } from '../types';

export default function Partners() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State (Single shared form for create/edit)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formContactPerson, setFormContactPerson] = useState(''); // Suppliers only
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTrn, setFormTrn] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBalance, setFormBalance] = useState('0');
  const [errorMsg, setErrorMsg] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const [custsRes, supsRes] = await Promise.all([
        fetch('/api/customers').then(res => res.json()),
        fetch('/api/suppliers').then(res => res.json())
      ]);
      setCustomers(custsRes.customers || []);
      setSuppliers(supsRes.suppliers || []);
    } catch (err) {
      console.error('Error fetching partner lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormNameAr('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormTrn('');
    setFormAddress('');
    setFormBalance('0');
    setErrorMsg('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (partner: any) => {
    setEditingId(partner.id);
    setFormName(partner.name);
    setFormNameAr(partner.name_ar || '');
    setFormContactPerson(partner.contact_person || '');
    setFormPhone(partner.phone || '');
    setFormEmail(partner.email || '');
    setFormTrn(partner.trn || '');
    setFormAddress(partner.address || '');
    setFormBalance((partner.balance || 0).toString());
    setErrorMsg('');
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formName.trim()) {
      setErrorMsg('Name is a required field.');
      return;
    }

    const payload = {
      name: formName.trim(),
      name_ar: formNameAr.trim(),
      contact_person: formContactPerson.trim(), // API ignores if customer
      phone: formPhone.trim(),
      email: formEmail.trim(),
      trn: formTrn.trim(),
      address: formAddress.trim(),
      balance: parseFloat(formBalance) || 0
    };

    const endpoint = activeTab === 'customers' ? '/api/customers' : '/api/suppliers';
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${endpoint}/${editingId}` : endpoint;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Operation failed. Check name uniqueness.');
        return;
      }

      // Success
      setShowFormModal(false);
      fetchPartners();
    } catch (err: any) {
      setErrorMsg('Server connection error: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    const label = activeTab === 'customers' ? 'Customer' : 'Supplier';
    if (!confirm(`Are you sure you want to delete this ${label}?`)) return;

    const endpoint = activeTab === 'customers' ? `/api/customers/${id}` : `/api/suppliers/${id}`;
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchPartners();
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.name_ar && c.name_ar.includes(searchQuery)) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.trn && c.trn.includes(searchQuery))
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.name_ar && s.name_ar.includes(searchQuery)) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery)) ||
    (s.trn && s.trn.includes(searchQuery))
  );

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      
      {/* MODULE CONTROLLER */}
      <div className="px-4 py-2 border-b-2 border-brand-line bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-ink" />
          <h1 className="font-sans font-black text-sm uppercase tracking-wider text-brand-ink">Partners & CRM Directory</h1>
        </div>

        <div className="flex border-2 border-brand-line p-0.5 bg-brand-sidebar">
          <button 
            onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 ${activeTab === 'customers' ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-white'}`}
          >
            <Users className="w-3.5 h-3.5" />
            Customers CRM ({customers.length})
          </button>
          <button 
            onClick={() => { setActiveTab('suppliers'); setSearchQuery(''); }}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 ${activeTab === 'suppliers' ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-white'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Suppliers Ledger ({suppliers.length})
          </button>
        </div>
      </div>

      {/* FILTER SEARCH BOX & ACTIONS */}
      <div className="p-4 bg-white border-b border-brand-line flex flex-col sm:flex-row gap-2 items-center justify-between shrink-0">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'customers' ? 'customers' : 'suppliers'} by name, phone, TRN...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-brand-line pl-10 pr-4 py-1.5 text-xs bg-brand-sidebar"
          />
        </div>

        <button 
          onClick={handleOpenCreate}
          className="bg-brand-ink text-white border-2 border-brand-line px-4 py-1.5 text-xs uppercase font-bold hover:bg-opacity-95 cursor-pointer flex items-center gap-1.5 shadow-[4px_4px_0_rgba(0,0,0,0.15)] hover:shadow-none transition-all"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'customers' ? 'Customer' : 'Supplier'} Record
        </button>
      </div>

      {/* DIRECTORY DISPLAY LIST */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-xs font-bold text-gray-500 uppercase">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Synchronizing data files...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'customers' ? (
              filteredCustomers.length > 0 ? (
                filteredCustomers.map(c => (
                  <div key={c.id} className="bg-white border-2 border-brand-line shadow-[4px_4px_0_rgba(0,0,0,0.05)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.1)] transition-all p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start border-b border-dashed border-gray-100 pb-2 mb-2">
                        <div>
                          <h3 className="font-sans font-black text-sm text-brand-ink leading-tight">{c.name}</h3>
                          {c.name_ar && <span className="text-[10px] text-gray-500 font-sans">{c.name_ar}</span>}
                        </div>
                        <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[9px] px-1 font-mono uppercase">
                          CUST-{c.id}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 text-xs text-gray-600 mt-2 font-mono">
                        {c.trn && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>TRN: <strong className="text-blue-700">{c.trn}</strong></span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Phone: {c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">Email: {c.email}</span>
                          </div>
                        )}
                        {c.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span className="truncate">Addr: {c.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-gray-400 font-sans">Credit Balance Due</span>
                        <strong className={`font-mono text-sm ${c.balance > 0 ? 'text-red-600 font-black' : 'text-green-600 font-black'}`}>
                          {c.balance.toFixed(2)} AED
                        </strong>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEdit(c)}
                          className="border border-brand-line bg-gray-50 hover:bg-gray-100 text-[10px] font-bold uppercase p-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="border border-red-200 hover:bg-red-50 text-[10px] font-bold uppercase p-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center text-gray-400 italic">No customer files match your search.</div>
              )
            ) : (
              filteredSuppliers.length > 0 ? (
                filteredSuppliers.map(s => (
                  <div key={s.id} className="bg-white border-2 border-brand-line shadow-[4px_4px_0_rgba(0,0,0,0.05)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.1)] transition-all p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start border-b border-dashed border-gray-100 pb-2 mb-2">
                        <div>
                          <h3 className="font-sans font-black text-sm text-brand-ink leading-tight">{s.name}</h3>
                          {s.name_ar && <span className="text-[10px] text-gray-500 font-sans">{s.name_ar}</span>}
                        </div>
                        <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[9px] px-1 font-mono uppercase">
                          SUPP-{s.id}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 text-xs text-gray-600 mt-2 font-mono">
                        {s.contact_person && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Contact: {s.contact_person}</span>
                          </div>
                        )}
                        {s.trn && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span>TRN: <strong className="text-blue-700">{s.trn}</strong></span>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Phone: {s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">Email: {s.email}</span>
                          </div>
                        )}
                        {s.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span className="truncate">Addr: {s.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-gray-400 font-sans">Our Liabilities (Debt)</span>
                        <strong className={`font-mono text-sm ${s.balance < 0 ? 'text-red-600 font-black' : 'text-green-600 font-black'}`}>
                          {s.balance.toFixed(2)} AED
                        </strong>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEdit(s)}
                          className="border border-brand-line bg-gray-50 hover:bg-gray-100 text-[10px] font-bold uppercase p-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id)}
                          className="border border-red-200 hover:bg-red-50 text-[10px] font-bold uppercase p-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center text-gray-400 italic">No supplier files match your search.</div>
              )
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL FOR PARTNERS */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-brand-line shadow-[8px_8px_0_rgba(0,0,0,0.15)] flex flex-col">
            <div className="px-4 py-2.5 bg-brand-header border-b border-brand-line text-xs font-bold uppercase text-brand-ink flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-brand-accent animate-pulse" />
                {editingId ? 'Modify' : 'Create'} {activeTab === 'customers' ? 'Customer File' : 'Supplier Ledger'}
              </span>
              <button onClick={() => setShowFormModal(false)}>
                <X className="w-4 h-4 text-gray-500 hover:text-black cursor-pointer" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 text-xs">
              {errorMsg && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-150 p-2 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Company / Human Name (EN) *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Gulf Contracting Corp"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Arabic translation name (optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. مؤسسة الخليج للمقاولات"
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa] text-right"
                />
              </div>

              {activeTab === 'suppliers' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Primary Contact Person</label>
                  <input 
                    type="text"
                    placeholder="e.g. Eng. Robert Lin"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Contact Phone</label>
                  <input 
                    type="text"
                    placeholder="e.g. +971 5..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">VAT TRN Number (UAE)</label>
                  <input 
                    type="text"
                    placeholder="15-digit TRN"
                    value={formTrn}
                    onChange={(e) => setFormTrn(e.target.value)}
                    className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Email Address</label>
                <input 
                  type="email"
                  placeholder="e.g. contact@domain.ae"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    {activeTab === 'customers' ? 'Opening Balance Due (AED)' : 'Opening Debt balance (AED)'}
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa] font-mono"
                  />
                </div>
                <div className="col-span-1 flex flex-col justify-end">
                  <span className="text-[9px] text-gray-400 font-sans block mb-1">
                    {activeTab === 'customers' ? 'Positive: customer owes us. Negative: they are in credit.' : 'Negative: we owe vendor. Positive: pre-paid.'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Address Location</label>
                <input 
                  type="text"
                  placeholder="e.g. JAFZA, Dubai, UAE"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full border border-brand-line px-3 py-1.5 bg-[#fafafa]"
                />
              </div>

              <div className="mt-3.5 flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-brand-ink text-white border-2 border-brand-line py-2 text-xs font-bold uppercase cursor-pointer hover:bg-opacity-95 text-center"
                >
                  Save Partner Ledger Record
                </button>
                <button 
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="border border-brand-line px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
