import React, { useState, useEffect } from 'react';
import { 
  Users, Phone, Mail, MapPin, UserPlus, Search, FileText, Plus, Trash2, Edit, X, 
  Coins, MessageSquare, Calendar, TrendingUp, Sparkles, CheckCircle2, AlertTriangle, 
  Clock, BarChart4, DollarSign, Building2, Download, Upload, Printer, ExternalLink, 
  FileSpreadsheet, UserCheck, MoreVertical, Layers, Send, Share2, Paperclip, Copy, ArrowLeft, RefreshCw
} from 'lucide-react';
import { db } from '../db/db';
import { Customer, Invoice, Quotation } from '../types';
import { 
  CrmService, CustomerFollowup, CustomerNote, WhatsAppTemplate, WhatsAppCampaign 
} from '../services/CrmService';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function Crm() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'scheduler' | 'campaigns'>('dashboard');

  // Core Data Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [followups, setFollowups] = useState<CustomerFollowup[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [segments, setSegments] = useState<Record<string, Customer[]>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('All Customers');
  const [statusFilter, setStatusFilter] = useState('All');
  const [salesRepFilter, setSalesRepFilter] = useState('All');

  // Selection states
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [activeCustInvoices, setActiveCustInvoices] = useState<Invoice[]>([]);
  const [activeCustQuotations, setActiveCustQuotations] = useState<Quotation[]>([]);
  const [activeCustNotes, setActiveCustNotes] = useState<CustomerNote[]>([]);
  const [activeCustFollowups, setActiveCustFollowups] = useState<CustomerFollowup[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Modals & Drawer States
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Form states (Create/Edit Customer)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTrn, setFormTrn] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('Sharjah');
  const [formCountry, setFormCountry] = useState('UAE');
  const [formMapUrl, setFormMapUrl] = useState('');
  const [formType, setFormType] = useState<any>('Retail Customer');
  const [formCreditLimit, setFormCreditLimit] = useState('0');
  const [formOpeningBal, setFormOpeningBal] = useState('0');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Cash');
  const [formSalesRep, setFormSalesRep] = useState('');
  const [formSource, setFormSource] = useState('Walk-in');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formRemarks, setFormRemarks] = useState('');

  // Scheduler Form State
  const [schedulerCustId, setSchedulerCustId] = useState('');
  const [schedulerType, setSchedulerType] = useState<'Call' | 'WhatsApp' | 'Meeting' | 'Email' | 'Reminder' | 'Site Visit'>('Call');
  const [schedulerDate, setSchedulerDate] = useState('');
  const [schedulerPriority, setSchedulerPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [schedulerSalesRep, setSchedulerSalesRep] = useState('');
  const [schedulerNotes, setSchedulerNotes] = useState('');

  // Template Form State
  const [templateName, setTemplateName] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateType, setTemplateType] = useState<'Utility' | 'Marketing' | 'Alert'>('Marketing');

  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignTemplateId, setCampaignTemplateId] = useState<number | ''>('');
  const [campaignSegment, setCampaignSegment] = useState('All Customers');
  const [campaignNotes, setCampaignNotes] = useState('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Duplicate Merge States
  const [mergeSourceId, setMergeSourceId] = useState<number | ''>('');
  const [mergeTargetId, setMergeTargetId] = useState<number | ''>('');

  // Success/Error notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadCrmData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCrmData = async () => {
    setLoading(true);
    try {
      await CrmService.initDefaults();

      const custs = await db.customers.toArray();
      const invs = await db.invoices.toArray();
      const quots = await db.quotations.toArray();
      const flws = await CrmService.getFollowups();
      const tmpls = await db.whatsappTemplates.toArray();
      const camps = await CrmService.getCampaigns();
      const segs = await CrmService.getCustomerSegments(custs, invs);

      setCustomers(custs);
      setInvoices(invs);
      setQuotations(quots);
      setFollowups(flws);
      setTemplates(tmpls);
      setCampaigns(camps);
      setSegments(segs);
    } catch (err) {
      console.error('Error loading CRM data:', err);
      showToast('Error syncing CRM data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Automated Code and Open Drawer
  const handleOpenCreateCustomer = async () => {
    setEditingId(null);
    const code = await CrmService.generateCustomerCode();
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormTrn('');
    setFormAddress('');
    setFormCity('Sharjah');
    setFormCountry('UAE');
    setFormMapUrl('');
    setFormType('Retail Customer');
    setFormCreditLimit('0');
    setFormOpeningBal('0');
    setFormPaymentTerms('Cash');
    setFormSalesRep('');
    setFormSource('Walk-in');
    setFormStatus('Active');
    setFormRemarks('');
    setIsCustomerFormOpen(true);
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingId(cust.id || null);
    setFormName(cust.name);
    setFormContactPerson(cust.contact_person || '');
    setFormPhone(cust.phone || '');
    setFormWhatsapp(cust.whatsapp_number || '');
    setFormEmail(cust.email || '');
    setFormTrn(cust.trn || '');
    setFormAddress(cust.address || '');
    setFormCity(cust.city || 'Sharjah');
    setFormCountry(cust.country || 'UAE');
    setFormMapUrl(cust.google_map || '');
    setFormType(cust.customer_type || 'Retail Customer');
    setFormCreditLimit((cust.credit_limit || 0).toString());
    setFormOpeningBal((cust.opening_balance || 0).toString());
    setFormPaymentTerms(cust.payment_terms || 'Cash');
    setFormSalesRep(cust.sales_representative || '');
    setFormSource(cust.source || 'Walk-in');
    setFormStatus(cust.status || 'Active');
    setFormRemarks(cust.remarks || '');
    setIsCustomerFormOpen(true);
  };

  // Submit Customer CRUD
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Company/Customer Name is required', 'error');
      return;
    }

    const payload: Customer = {
      name: formName.trim(),
      contact_person: formContactPerson.trim(),
      phone: formPhone.trim(),
      whatsapp_number: formWhatsapp.trim() || formPhone.trim(),
      email: formEmail.trim(),
      trn: formTrn.trim(),
      address: formAddress.trim(),
      city: formCity,
      country: formCountry,
      google_map: formMapUrl.trim(),
      customer_type: formType,
      credit_limit: parseFloat(formCreditLimit) || 0,
      opening_balance: parseFloat(formOpeningBal) || 0,
      balance: editingId ? (customers.find(c => c.id === editingId)?.balance || 0) : parseFloat(formOpeningBal) || 0,
      payment_terms: formPaymentTerms,
      sales_representative: formSalesRep.trim(),
      source: formSource,
      status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId ? (customers.find(c => c.id === editingId)?.created_at) : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!editingId) {
      payload.customer_code = await CrmService.generateCustomerCode();
    } else {
      payload.id = editingId;
      payload.customer_code = customers.find(c => c.id === editingId)?.customer_code;
    }

    try {
      if (editingId) {
        await db.customers.update(editingId, payload);
        showToast('Customer Profile updated');
      } else {
        await db.customers.add(payload);
        showToast('New Customer successfully registered');
      }
      setIsCustomerFormOpen(false);
      loadCrmData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save customer', 'error');
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this customer? This action is irreversible.')) return;
    try {
      await db.customers.delete(id);
      showToast('Customer deleted successfully');
      loadCrmData();
    } catch (err) {
      console.error(err);
      showToast('Error deleting customer', 'error');
    }
  };

  // View Customer detail panel
  const handleViewCustomerDetails = async (cust: Customer) => {
    setActiveCustomer(cust);
    setLoading(true);
    setIsDetailsDrawerOpen(true);
    try {
      const custInvs = invoices.filter(inv => inv.customer_id === cust.id);
      const custQuots = quotations.filter(q => q.customer_id === cust.id);
      const custNotes = await CrmService.getNotes(cust.id!);
      const custFlws = await CrmService.getFollowups(cust.id!);

      setActiveCustInvoices(custInvs);
      setActiveCustQuotations(custQuots);
      setActiveCustNotes(custNotes);
      setActiveCustFollowups(custFlws);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Notes addition
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !activeCustomer) return;

    const notePayload: CustomerNote = {
      customer_id: activeCustomer.id!,
      text: newNoteText.trim(),
      created_at: new Date().toISOString(),
      author: 'Administrator'
    };

    try {
      await db.customerNotes.add(notePayload);
      setNewNoteText('');
      const updatedNotes = await CrmService.getNotes(activeCustomer.id!);
      setActiveCustNotes(updatedNotes);
      showToast('Note added');
    } catch (err) {
      console.error(err);
    }
  };

  // Scheduler actions
  const handleSchedulerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulerCustId || !schedulerDate) {
      showToast('Please select customer and date', 'error');
      return;
    }

    const payload: CustomerFollowup = {
      customer_id: parseInt(schedulerCustId),
      type: schedulerType,
      date: schedulerDate,
      status: 'Pending',
      priority: schedulerPriority,
      assigned_to: schedulerSalesRep.trim() || 'AdminDesk',
      notes: schedulerNotes.trim()
    };

    try {
      await db.customerFollowups.add(payload);
      showToast('Follow-up scheduled successfully');
      setSchedulerCustId('');
      setSchedulerNotes('');
      setSchedulerDate('');
      loadCrmData();
    } catch (err) {
      console.error(err);
      showToast('Error scheduling task', 'error');
    }
  };

  const handleToggleFollowupStatus = async (item: CustomerFollowup) => {
    const nextStatus = item.status === 'Pending' ? 'Completed' : 'Pending';
    const payload: Partial<CustomerFollowup> = {
      status: nextStatus,
      completed_date: nextStatus === 'Completed' ? new Date().toISOString() : undefined
    };

    try {
      await db.customerFollowups.update(item.id!, payload);
      showToast(`Task marked as ${nextStatus}`);
      loadCrmData();
      if (activeCustomer && activeCustomer.id === item.customer_id) {
        const updated = await CrmService.getFollowups(activeCustomer.id);
        setActiveCustFollowups(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp Templates Submit
  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) {
      showToast('Template name and body are required', 'error');
      return;
    }

    try {
      await db.whatsappTemplates.add({
        name: templateName.trim(),
        body: templateBody.trim(),
        type: templateType
      });
      showToast('Template created successfully');
      setTemplateName('');
      setTemplateBody('');
      setIsTemplateModalOpen(false);
      loadCrmData();
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp Campaigns Trigger/Schedule
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !campaignTemplateId) {
      showToast('Campaign Name and Template selection are required', 'error');
      return;
    }

    const selectedTempl = templates.find(t => t.id === Number(campaignTemplateId));
    if (!selectedTempl) return;

    // Recipients list calculation based on selected segment
    const audienceList = segments[campaignSegment] || [];
    if (audienceList.length === 0) {
      showToast('No customer records match this group segment', 'error');
      return;
    }

    const payload: WhatsAppCampaign = {
      name: campaignName.trim(),
      template_id: Number(campaignTemplateId),
      segment: campaignSegment,
      scheduled_date: new Date().toISOString(),
      status: 'Sent', // Auto fired in mock
      notes: campaignNotes.trim(),
      recipients_count: audienceList.length
    };

    try {
      await db.whatsappCampaigns.add(payload);
      showToast(`WhatsApp Campaign '${payload.name}' broadcasted to ${payload.recipients_count} customers!`);
      
      // Perform simulated WhatsApp Click to Chat redirections on the main recipient
      const firstCustomer = audienceList[0];
      if (firstCustomer && firstCustomer.phone) {
        const personalizedMsg = CrmService.replaceVariables(selectedTempl.body, firstCustomer);
        const url = CrmService.getWhatsAppClickUrl(firstCustomer.phone, personalizedMsg);
        window.open(url, '_blank');
      }

      setCampaignName('');
      setCampaignNotes('');
      setCampaignTemplateId('');
      setIsCampaignModalOpen(false);
      loadCrmData();
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Import CSV parser
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedRows = results.data;
        const validCustomers: Customer[] = [];
        const errors: string[] = [];

        for (let i = 0; i < parsedRows.length; i++) {
          const row: any = parsedRows[i];
          const name = row['Company Name'] || row['Name'];
          if (!name) {
            errors.push(`Row ${i + 1}: Company Name or Name is missing.`);
            continue;
          }

          const trn = row['TRN'] || '';
          const phone = row['Phone'] || row['Mobile'] || '';

          const custCode = await CrmService.generateCustomerCode();

          validCustomers.push({
            name: name.trim(),
            contact_person: row['Contact Person'] || '',
            phone: phone.toString().trim(),
            whatsapp_number: (row['WhatsApp'] || phone).toString().trim(),
            email: row['Email'] || '',
            trn: trn.toString().trim(),
            address: row['Address'] || '',
            city: row['City'] || 'Sharjah',
            country: row['Country'] || 'UAE',
            customer_type: row['Type'] || 'Retail Customer',
            credit_limit: parseFloat(row['Credit Limit']) || 0,
            opening_balance: parseFloat(row['Opening Balance']) || 0,
            balance: parseFloat(row['Opening Balance']) || 0,
            sales_representative: row['Sales Rep'] || '',
            status: 'Active',
            customer_code: custCode,
            created_at: new Date().toISOString()
          });
        }

        if (errors.length > 0) {
          setImportErrors(errors);
        } else {
          setImportPreview(validCustomers);
        }
      }
    });
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    try {
      await db.customers.bulkAdd(importPreview);
      showToast(`Successfully imported ${importPreview.length} customer records`);
      setIsImportModalOpen(false);
      setImportPreview([]);
      setImportErrors([]);
      loadCrmData();
    } catch (err) {
      console.error(err);
      showToast('Error executing bulk insert', 'error');
    }
  };

  // Duplicates Merger
  const handleMergeCustomers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) {
      showToast('Please select two distinct customer records', 'error');
      return;
    }

    const source = customers.find(c => c.id === Number(mergeSourceId));
    const target = customers.find(c => c.id === Number(mergeTargetId));

    if (!source || !target) return;

    if (!confirm(`Are you absolutely sure you want to MERGE '${source.name}' into '${target.name}'? All invoices, quotations, outstanding balances, and activity logs will move to '${target.name}' and '${source.name}' will be deleted.`)) return;

    try {
      // Begin transaction
      await db.transaction('rw', [db.customers, db.invoices, db.quotations, db.customerNotes, db.customerFollowups], async () => {
        // Move invoices
        await db.invoices.where('customer_id').equals(source.id!).modify({ customer_id: target.id!, customer_name: target.name });
        // Move quotations
        await db.quotations.where('customer_id').equals(source.id!).modify({ customer_id: target.id!, customer_name: target.name });
        // Move notes
        await db.customerNotes.where('customer_id').equals(source.id!).modify({ customer_id: target.id! });
        // Move follow-ups
        await db.customerFollowups.where('customer_id').equals(source.id!).modify({ customer_id: target.id! });

        // Update target balance
        const newBalance = (target.balance || 0) + (source.balance || 0);
        await db.customers.update(target.id!, { balance: newBalance });

        // Delete source
        await db.customers.delete(source.id!);
      });

      showToast('Customers merged successfully');
      setMergeSourceId('');
      setMergeTargetId('');
      setIsMergeModalOpen(false);
      loadCrmData();
    } catch (err) {
      console.error(err);
      showToast('Failed to merge records', 'error');
    }
  };

  // Filtering Customer Masters
  const filteredCustomers = customers.filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.trn && c.trn.includes(searchQuery));

    const matchSegment = selectedSegment === 'All Customers' ? true : (segments[selectedSegment]?.some(sc => sc.id === c.id) || false);
    const matchStatus = statusFilter === 'All' ? true : c.status === statusFilter;
    const matchRep = salesRepFilter === 'All' ? true : c.sales_representative === salesRepFilter;

    return matchSearch && matchSegment && matchStatus && matchRep;
  });

  // Chart preparation
  const getRepChartData = () => {
    const data: Record<string, number> = {};
    customers.forEach(c => {
      const rep = c.sales_representative || 'Unassigned';
      data[rep] = (data[rep] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  const getCityChartData = () => {
    const data: Record<string, number> = {};
    customers.forEach(c => {
      const city = c.city || 'Sharjah';
      data[city] = (data[city] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  // Trigger click whatsapp helper
  const handleLaunchWhatsApp = (phone: string, text: string) => {
    const url = CrmService.getWhatsAppClickUrl(phone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg relative overflow-hidden select-none">
      
      {/* HEADER SECTION */}
      <header className="px-6 py-4 border-b-2 border-brand-line bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center shrink-0 shadow-md">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-sans font-black text-sm uppercase tracking-wider text-brand-ink">
              Enterprise CRM & Directory
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-2 border-brand-line p-0.5 bg-brand-sidebar rounded">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'bg-brand-ink text-white shadow-sm' : 'text-brand-ink hover:bg-white'}`}
          >
            <BarChart4 className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all ${activeTab === 'directory' ? 'bg-brand-ink text-white shadow-sm' : 'text-brand-ink hover:bg-white'}`}
          >
            <Users className="w-3.5 h-3.5" />
            Directory
          </button>
          <button 
            onClick={() => setActiveTab('scheduler')}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all ${activeTab === 'scheduler' ? 'bg-brand-ink text-white shadow-sm' : 'text-brand-ink hover:bg-white'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Scheduler
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-1.5 text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all ${activeTab === 'campaigns' ? 'bg-brand-ink text-white shadow-sm' : 'text-brand-ink hover:bg-white'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp marketing
          </button>
        </div>
      </header>

      {/* BODY CONTENT SCROLLER */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-brand-line p-4 rounded-xl flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono font-bold">Total Customers</div>
                  <div className="text-xl font-black text-brand-ink">{customers.length}</div>
                </div>
              </div>

              <div className="bg-white border-2 border-brand-line p-4 rounded-xl flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono font-bold">Active CRM Accounts</div>
                  <div className="text-xl font-black text-brand-ink">
                    {customers.filter(c => c.status !== 'Inactive').length}
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-brand-line p-4 rounded-xl flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono font-bold">Receivables/Outstanding</div>
                  <div className="text-xl font-black text-brand-ink">
                    AED {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-brand-line p-4 rounded-xl flex items-center gap-4 shadow-sm hover:scale-[1.01] transition-transform">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono font-bold">WhatsApp Campaigns Run</div>
                  <div className="text-xl font-black text-brand-ink">{campaigns.length}</div>
                </div>
              </div>
            </div>

            {/* DASHBOARD CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Representatives Chart */}
              <div className="bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm">
                <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink mb-4 flex items-center gap-2">
                  <BarChart4 className="w-4 h-4 text-brand-accent" />
                  Customers by Sales Representative
                </h3>
                <div className="h-64">
                  {getRepChartData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getRepChartData()}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" fill="#0F466B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data to display</div>
                  )}
                </div>
              </div>

              {/* Geographic Cities Chart */}
              <div className="bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm">
                <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-accent" />
                  Geographical Distribution (UAE Cities)
                </h3>
                <div className="h-64">
                  {getCityChartData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getCityChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getCityChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#319BA4' : '#0F466B'} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data to display</div>
                  )}
                </div>
              </div>
            </div>

            {/* UPCOMING FOLLOW-UPS & RECENT ACTIONS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Follow-ups */}
              <div className="bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm xl:col-span-2">
                <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-accent" />
                    Today's Pending Follow-ups & Reminders
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-mono font-bold uppercase rounded">
                    Action Required
                  </span>
                </h3>
                <div className="divide-y divide-brand-line max-h-72 overflow-auto">
                  {followups.filter(f => f.status === 'Pending').length > 0 ? (
                    followups.filter(f => f.status === 'Pending').map(f => {
                      const cust = customers.find(c => c.id === f.customer_id);
                      return (
                        <div key={f.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-brand-ink truncate flex items-center gap-2">
                              <span>{cust?.name || 'Unlinked Customer'}</span>
                              <span className={`px-1.5 py-0.5 text-[9px] uppercase font-mono rounded ${
                                f.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
                                f.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                {f.priority}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-1.5 font-mono">
                              <span className="bg-brand-sidebar px-1.5 py-0.5 border border-brand-line rounded">{f.type}</span>
                              <span>Due: {new Date(f.date).toLocaleDateString()}</span>
                              <span>Agent: {f.assigned_to}</span>
                            </div>
                            {f.notes && <div className="text-[11px] text-gray-500 italic mt-1 font-sans">{f.notes}</div>}
                          </div>
                          
                          <button
                            onClick={() => handleToggleFollowupStatus(f)}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer shrink-0 transition-colors"
                          >
                            Mark Done
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">All follow-ups cleared! Great job!</div>
                  )}
                </div>
              </div>

              {/* Dynamic Customer Segments Breakdown */}
              <div className="bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm">
                <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-accent" />
                  Target Customer Groups
                </h3>
                <div className="space-y-3">
                  {Object.entries(segments).map(([segName, segCusts]) => {
                    const custs = segCusts as Customer[];
                    return (
                      <div 
                        key={segName} 
                        onClick={() => { setActiveTab('directory'); setSelectedSegment(segName); }}
                        className="p-2.5 bg-brand-sidebar hover:bg-muted border border-brand-line rounded-lg cursor-pointer transition-colors flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-brand-ink">{segName}</span>
                        <span className="font-mono bg-white text-brand-ink border border-brand-line font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {custs.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CUSTOMER DIRECTORY TAB */}
        {activeTab === 'directory' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* DIRECTORY ACTIONS TOOLBAR */}
            <div className="bg-white border-2 border-brand-line p-4 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search input */}
                <div className="relative min-w-[280px] flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Code, Name, Phone, TRN..."
                    className="w-full pl-9 pr-4 py-2 border border-brand-line rounded-md text-xs bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Group segment selector */}
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-bold bg-white text-brand-ink"
                >
                  <option value="All Customers">Segment: All Groups</option>
                  {Object.keys(segments).filter(k => k !== 'All Customers').map(seg => (
                    <option key={seg} value={seg}>{seg}</option>
                  ))}
                </select>

                {/* Status Selector */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-bold bg-white text-brand-ink"
                >
                  <option value="All">Status: All</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
              </div>

              {/* Utility buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenCreateCustomer}
                  className="bg-brand-ink text-white hover:bg-opacity-95 text-xs font-bold px-3.5 py-2 uppercase flex items-center gap-1.5 shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Customer
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-white hover:bg-muted border border-brand-line text-brand-ink text-xs font-bold px-3 py-2 uppercase flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>

                <button
                  onClick={() => CrmService.exportToExcel(filteredCustomers)}
                  className="bg-white hover:bg-muted border border-brand-line text-brand-ink text-xs font-bold px-3 py-2 uppercase flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel
                </button>

                <button
                  onClick={() => CrmService.exportToPDF(filteredCustomers, `Customers List - ${selectedSegment}`)}
                  className="bg-white hover:bg-muted border border-brand-line text-brand-ink text-xs font-bold px-3 py-2 uppercase flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>

                <button
                  onClick={() => setIsMergeModalOpen(true)}
                  className="bg-brand-sidebar hover:bg-muted border border-dashed border-brand-line text-brand-ink text-xs font-bold px-3 py-2 uppercase flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Merge Duplicates
                </button>
              </div>
            </div>

            {/* CUSTOMER MASTER DIRECTORY TABLE */}
            <div className="bg-white border-2 border-brand-line rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-header border-b border-brand-line text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      <th className="px-5 py-3 w-32">Customer Code</th>
                      <th className="px-5 py-3">Company / Customer Name</th>
                      <th className="px-5 py-3">Contact Person</th>
                      <th className="px-5 py-3">Mobile & WhatsApp</th>
                      <th className="px-5 py-3">TRN</th>
                      <th className="px-5 py-3 text-right">Outstanding Balance</th>
                      <th className="px-5 py-3 w-28 text-center">Status</th>
                      <th className="px-5 py-3 w-28 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line text-xs font-medium">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(cust => (
                        <tr 
                          key={cust.id} 
                          onClick={() => handleViewCustomerDetails(cust)}
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5 font-mono font-bold text-brand-ink">
                            {cust.customer_code || `CUST-${cust.id}`}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-foreground">{cust.name}</div>
                            {cust.city && <div className="text-[10px] text-muted-foreground font-mono">{cust.city}, {cust.country || 'UAE'}</div>}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">{cust.contact_person || '-'}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-0.5">
                              {cust.phone && <span className="font-mono text-foreground font-semibold">{cust.phone}</span>}
                              {cust.whatsapp_number && <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-bold">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                {cust.whatsapp_number}
                              </span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-muted-foreground">{cust.trn || '-'}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-black text-brand-ink">
                            AED {(cust.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${cust.status === 'Inactive' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                              {cust.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditCustomer(cust)}
                                className="p-1 hover:bg-muted text-brand-ink rounded border border-brand-line cursor-pointer"
                                title="Edit Customer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(cust.id!)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded border border-red-200 cursor-pointer"
                                title="Delete Customer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground font-bold">
                          No matching customer records found in the directory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. SCHEDULER TAB */}
        {activeTab === 'scheduler' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* SCHEDULER LOG FORM */}
            <div className="bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm h-fit">
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-accent" />
                Schedule New CRM Activity
              </h3>
              <form onSubmit={handleSchedulerSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Select Customer Account *</label>
                  <select
                    value={schedulerCustId}
                    onChange={(e) => setSchedulerCustId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium bg-white"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customer_code || `CUST-${c.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Activity Type</label>
                    <select
                      value={schedulerType}
                      onChange={(e) => setSchedulerType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium bg-white"
                    >
                      <option value="Call">📞 Call</option>
                      <option value="WhatsApp">💬 WhatsApp Follow-up</option>
                      <option value="Meeting">🤝 In-Person Meeting</option>
                      <option value="Email">📧 Email Dispatch</option>
                      <option value="Reminder">⏰ Internal Task</option>
                      <option value="Site Visit">🏗️ Site Visit</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Priority</label>
                    <select
                      value={schedulerPriority}
                      onChange={(e) => setSchedulerPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium bg-white"
                    >
                      <option value="Low">🟢 Low</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="High">🔴 High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Follow-up Date *</label>
                    <input
                      type="datetime-local"
                      value={schedulerDate}
                      onChange={(e) => setSchedulerDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Sales Rep / Agent</label>
                    <input
                      type="text"
                      value={schedulerSalesRep}
                      onChange={(e) => setSchedulerSalesRep(e.target.value)}
                      placeholder="e.g. Sales Manager"
                      className="w-full px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Remarks / Briefing</label>
                  <textarea
                    rows={3}
                    value={schedulerNotes}
                    onChange={(e) => setSchedulerNotes(e.target.value)}
                    placeholder="Describe specific items, payment collections, or product interests..."
                    className="w-full px-3 py-2 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-ink text-white hover:bg-opacity-95 text-xs font-bold py-2.5 uppercase cursor-pointer"
                >
                  Confirm CRM Activity
                </button>
              </form>
            </div>

            {/* OUTSTANDING / TIMELINE OF TASKS */}
            <div className="bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm xl:col-span-2 flex flex-col h-[520px]">
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink mb-4 flex items-center justify-between">
                <span>All Active CRM Tasks & Reminder Registry</span>
                <span className="font-mono text-[10px] font-bold text-muted-foreground">COUNT: {followups.length}</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto divide-y divide-brand-line pr-2">
                {followups.length > 0 ? (
                  followups.map(item => {
                    const cust = customers.find(c => c.id === item.customer_id);
                    return (
                      <div key={item.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-brand-ink text-sm">{cust?.name || 'Unassigned Customer'}</span>
                            <span className={`px-2 py-0.5 font-mono text-[9px] font-bold uppercase rounded border ${
                              item.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                              item.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground font-mono mt-1.5">
                            <span className="bg-brand-sidebar border border-brand-line px-1.5 py-0.5 rounded text-brand-ink font-bold">
                              {item.type}
                            </span>
                            <span>📅 Due: {new Date(item.date).toLocaleString()}</span>
                            <span>👤 Agent: {item.assigned_to}</span>
                            <span>🟢 Status: <span className={item.status === 'Completed' ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>{item.status}</span></span>
                          </div>

                          {item.notes && <div className="mt-2 text-xs text-gray-600 italic bg-brand-sidebar p-2 border border-brand-line rounded">{item.notes}</div>}
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleFollowupStatus(item)}
                            className={`px-2.5 py-1.5 text-[9px] font-bold uppercase border rounded cursor-pointer ${
                              item.status === 'Completed' 
                                ? 'bg-amber-55 text-amber-800 border-amber-200 hover:bg-amber-100' 
                                : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {item.status === 'Completed' ? 'Reopen' : 'Complete'}
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (confirm('Delete this task?')) {
                                await db.customerFollowups.delete(item.id!);
                                showToast('Task deleted');
                                loadCrmData();
                              }
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 border border-brand-line rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                    No active CRM reminders have been registered yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. WHATSAPP MARKETING TAB */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* WHATSAPP ACTION CORES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* MESSAGE TEMPLATES BUILDER */}
              <div className="lg:col-span-4 bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm flex flex-col h-[520px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent" />
                    WhatsApp Reusable Templates
                  </h3>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="p-1.5 bg-brand-sidebar hover:bg-muted border border-brand-line rounded text-brand-ink cursor-pointer"
                    title="Add Template"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                  {templates.map(tmpl => (
                    <div key={tmpl.id} className="p-3 bg-brand-sidebar border border-brand-line rounded-lg text-xs relative group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-brand-ink uppercase font-mono tracking-tight">{tmpl.name}</span>
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-white border border-brand-line text-muted-foreground uppercase">
                          {tmpl.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed italic bg-white p-2.5 border border-gray-100 rounded">
                        {tmpl.body}
                      </p>
                      
                      {/* Copy, edit or delete template in offline sandbox */}
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tmpl.body);
                            showToast('Template body copied to clipboard');
                          }}
                          className="p-1 hover:bg-muted text-gray-500 rounded bg-white border border-brand-line cursor-pointer"
                          title="Copy Body"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete template?')) {
                              await db.whatsappTemplates.delete(tmpl.id!);
                              showToast('Template deleted');
                              loadCrmData();
                            }
                          }}
                          className="p-1 hover:bg-red-50 text-red-600 rounded bg-white border border-red-200 cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LIVE CAMPAIGN BROADCASTER */}
              <div className="lg:col-span-8 bg-white border-2 border-brand-line p-5 rounded-xl shadow-sm flex flex-col h-[520px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-sans font-black text-xs uppercase tracking-wider text-brand-ink flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-accent" />
                    Active Broadcast Campaigns & History
                  </h3>
                  <button
                    onClick={() => setIsCampaignModalOpen(true)}
                    className="bg-brand-ink text-white hover:bg-opacity-95 text-xs font-bold px-4 py-2 uppercase flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    New Campaign Broadcast
                  </button>
                </div>

                {/* History list */}
                <div className="flex-1 overflow-y-auto divide-y divide-brand-line pr-2">
                  {campaigns.length > 0 ? (
                    campaigns.map(camp => {
                      const tmpl = templates.find(t => t.id === camp.template_id);
                      return (
                        <div key={camp.id} className="py-4 text-xs flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-brand-ink text-sm flex items-center gap-2">
                              <span>{camp.name}</span>
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 rounded uppercase">
                                {camp.status}
                              </span>
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] text-muted-foreground mt-1.5">
                              <span>Group Target: <span className="font-bold text-foreground">{camp.segment}</span></span>
                              <span>Broadcast Size: <span className="font-bold text-foreground">{camp.recipients_count} Customers</span></span>
                              <span>Fired At: {new Date(camp.scheduled_date).toLocaleString()}</span>
                            </div>

                            {tmpl && (
                              <div className="mt-2 p-3 bg-muted/40 border border-brand-line rounded text-[11px] font-sans text-gray-600 italic">
                                <span className="font-bold font-mono text-[9px] block text-brand-accent uppercase mb-1">USED TEMPLATE: {tmpl.name}</span>
                                "{tmpl.body}"
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              showToast(`Resending campaign statistics summary of '${camp.name}'...`);
                            }}
                            className="bg-white hover:bg-muted border border-brand-line text-brand-ink px-3 py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer shrink-0"
                          >
                            Analyze
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <MessageSquare className="w-8 h-8 opacity-40 text-brand-ink" />
                      <p className="text-xs font-bold">No WhatsApp Broadcast campaigns triggered yet.</p>
                      <p className="text-[10px]">Create a campaign to automatically format personalization tags and reach targets.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* 5. SIDE DRAWER: ADD/EDIT CUSTOMER MASTER */}
      {isCustomerFormOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity" onClick={() => setIsCustomerFormOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-background border-l-2 border-brand-line shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 select-none">
            
            <div className="px-6 py-4 border-b border-brand-line flex justify-between items-center bg-white shadow-sm">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-brand-ink">
                {editingId ? 'Modify Customer Profile' : 'Register New ERP Customer'}
              </h3>
              <button onClick={() => setIsCustomerFormOpen(false)} className="h-8 w-8 hover:bg-muted border border-brand-line rounded flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4 text-brand-ink" />
              </button>
            </div>

            <form onSubmit={handleCustomerSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs bg-white">
              
              {/* Company Details */}
              <div className="space-y-3">
                <h4 className="font-mono text-[10px] font-extrabold text-brand-accent uppercase border-b pb-1 tracking-wider">Company / Personal Details</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Company Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Al Sahel Contracting LLC"
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Contact Person</label>
                    <input
                      type="text"
                      value={formContactPerson}
                      onChange={(e) => setFormContactPerson(e.target.value)}
                      placeholder="e.g. Mr. Robert Chen"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Tax Registration No. (TRN)</label>
                    <input
                      type="text"
                      value={formTrn}
                      onChange={(e) => setFormTrn(e.target.value)}
                      placeholder="e.g. 100234567800003"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-3">
                <h4 className="font-mono text-[10px] font-extrabold text-brand-accent uppercase border-b pb-1 tracking-wider">Contact & Communications</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Mobile Phone</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. 0501234567"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">WhatsApp Number</label>
                    <input
                      type="text"
                      value={formWhatsapp}
                      onChange={(e) => setFormWhatsapp(e.target.value)}
                      placeholder="e.g. 0501234567"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. client@domain.com"
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono"
                  />
                </div>
              </div>

              {/* Physical address */}
              <div className="space-y-3">
                <h4 className="font-mono text-[10px] font-extrabold text-brand-accent uppercase border-b pb-1 tracking-wider">Geography & Mapping</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">City (UAE)</label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="e.g. Sharjah"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Country</label>
                    <input
                      type="text"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Warehouse / Office Address</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Al Sajaa, Industrial Area, Sharjah"
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Google Maps Location Link</label>
                  <input
                    type="url"
                    value={formMapUrl}
                    onChange={(e) => setFormMapUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Financial master */}
              <div className="space-y-3">
                <h4 className="font-mono text-[10px] font-extrabold text-brand-accent uppercase border-b pb-1 tracking-wider">Financial & CRM Class</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Customer Category Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-bold bg-white"
                    >
                      <option value="Contractor">Contractor</option>
                      <option value="Builder">Builder</option>
                      <option value="Consultant">Consultant</option>
                      <option value="Retail Customer">Retail Customer</option>
                      <option value="Walk-in">Walk-in Account</option>
                      <option value="Architect">Architect</option>
                      <option value="Interior Designer">Interior Designer</option>
                      <option value="Supplier">Supplier Partner</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Credit Limit (AED)</label>
                    <input
                      type="number"
                      value={formCreditLimit}
                      onChange={(e) => setFormCreditLimit(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Opening Balance (AED)</label>
                    <input
                      type="number"
                      value={formOpeningBal}
                      onChange={(e) => setFormOpeningBal(e.target.value)}
                      disabled={!!editingId}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-mono disabled:bg-muted"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Payment Terms</label>
                    <select
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-bold bg-white"
                    >
                      <option value="Cash">Cash Only</option>
                      <option value="Credit 30 Days">Credit 30 Days</option>
                      <option value="Credit 45 Days">Credit 45 Days</option>
                      <option value="Credit 60 Days">Credit 60 Days</option>
                      <option value="PDC Check">PDC Check Required</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Sales Representative</label>
                    <input
                      type="text"
                      value={formSalesRep}
                      onChange={(e) => setFormSalesRep(e.target.value)}
                      placeholder="e.g. Sales Director"
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Lead Source</label>
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-bold bg-white"
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="Google Search">Google Search</option>
                      <option value="WhatsApp Business">WhatsApp Business</option>
                      <option value="Word of Mouth">Word of Mouth</option>
                      <option value="Supplier Referral">Supplier Referral</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">CRM Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="crmStatus"
                        checked={formStatus === 'Active'}
                        onChange={() => setFormStatus('Active')}
                      />
                      Active Account
                    </label>
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="crmStatus"
                        checked={formStatus === 'Inactive'}
                        onChange={() => setFormStatus('Inactive')}
                      />
                      Inactive / Suspended
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Remarks & Bio</label>
                  <textarea
                    rows={2}
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-brand-line flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerFormOpen(false)}
                  className="w-1/2 bg-white hover:bg-muted border border-brand-line text-brand-ink py-2.5 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-brand-ink text-white hover:bg-opacity-95 py-2.5 font-bold uppercase cursor-pointer shadow"
                >
                  Confirm Save
                </button>
              </div>

            </form>
          </div>
        </>
      )}

      {/* 6. SIDE DRAWER: CUSTOMER DETAILED TIMELINE & LEDGER PORTAL */}
      {isDetailsDrawerOpen && activeCustomer && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-45 transition-opacity" onClick={() => setIsDetailsDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full lg:w-[840px] bg-background border-l-2 border-brand-line shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 select-none">
            
            <div className="px-6 py-4 border-b border-brand-line flex justify-between items-center bg-white shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-brand-sidebar border border-brand-line flex items-center justify-center font-black text-brand-ink">
                  {activeCustomer.customer_code || 'AZ'}
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm uppercase text-brand-ink">
                    {activeCustomer.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Category: {activeCustomer.customer_type || 'Retail'} • TRN: {activeCustomer.trn || 'Unregistered'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDetailsDrawerOpen(false)} className="h-8 w-8 hover:bg-muted border border-brand-line rounded flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4 text-brand-ink" />
              </button>
            </div>

            {/* Main view scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-brand-bg text-xs">
              
              {/* LEDGER SNAPSHOT CARDS */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-brand-line p-3 rounded-lg text-center">
                  <div className="text-[9px] uppercase font-mono font-bold text-muted-foreground">Outstanding AED</div>
                  <div className="text-sm font-black text-red-600 mt-1">
                    AED {(activeCustomer.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-white border border-brand-line p-3 rounded-lg text-center">
                  <div className="text-[9px] uppercase font-mono font-bold text-muted-foreground">Invoices Sent</div>
                  <div className="text-sm font-black text-brand-ink mt-1">
                    {activeCustInvoices.length} Invoices
                  </div>
                </div>
                <div className="bg-white border border-brand-line p-3 rounded-lg text-center">
                  <div className="text-[9px] uppercase font-mono font-bold text-muted-foreground">Active Quotations</div>
                  <div className="text-sm font-black text-brand-ink mt-1">
                    {activeCustQuotations.length} Quotes
                  </div>
                </div>
              </div>

              {/* CORE DETAILS ACCORDION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Basic profile info */}
                <div className="bg-white border border-brand-line rounded-lg p-4 space-y-3.5">
                  <h4 className="font-sans font-bold text-brand-ink uppercase text-[10px] tracking-wider border-b pb-1 flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-brand-accent" />
                    Account Master Info
                  </h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-bold text-foreground">{activeCustomer.customer_code || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Contact:</span>
                      <span className="font-bold text-foreground">{activeCustomer.contact_person || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Phone / Mobile:</span>
                      <span className="font-bold text-foreground">{activeCustomer.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">WhatsApp:</span>
                      <span className="font-bold text-emerald-600 font-bold">{activeCustomer.whatsapp_number || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Email Address:</span>
                      <span className="font-bold text-foreground underline">{activeCustomer.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City (UAE):</span>
                      <span className="font-bold text-foreground">{activeCustomer.city || 'Sharjah'}</span>
                    </div>
                  </div>
                </div>

                {/* Logistics info */}
                <div className="bg-white border border-brand-line rounded-lg p-4 space-y-3.5">
                  <h4 className="font-sans font-bold text-brand-ink uppercase text-[10px] tracking-wider border-b pb-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                    Logistics & Credit Details
                  </h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Credit Limit:</span>
                      <span className="font-bold text-foreground">AED {(activeCustomer.credit_limit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Payment Terms:</span>
                      <span className="font-bold text-foreground">{activeCustomer.payment_terms || 'Cash'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Sales Rep:</span>
                      <span className="font-bold text-foreground">{activeCustomer.sales_representative || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 border-gray-50">
                      <span className="text-muted-foreground">Source Channel:</span>
                      <span className="font-bold text-foreground">{activeCustomer.source || 'Walk-in'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TRN Registration:</span>
                      <span className="font-bold text-brand-ink">{activeCustomer.trn || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* INTEGRATED SALES & QUOTATION TRANSACTION LEDGER */}
              <div className="bg-white border border-brand-line rounded-lg p-4">
                <h4 className="font-sans font-bold text-brand-ink uppercase text-[10px] tracking-wider border-b pb-2 mb-3">
                  Linked Financial ERP Ledger
                </h4>
                
                <div className="space-y-4">
                  {/* Invoices list */}
                  <div>
                    <h5 className="font-mono text-[10px] font-extrabold text-brand-accent uppercase mb-2">Invoices ({activeCustInvoices.length})</h5>
                    {activeCustInvoices.length > 0 ? (
                      <div className="border border-brand-line rounded overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-brand-header text-[9px] font-bold uppercase font-mono border-b border-brand-line">
                            <tr>
                              <th className="p-2">Inv No</th>
                              <th className="p-2">Date</th>
                              <th className="p-2">Status</th>
                              <th className="p-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-line font-mono text-[11px]">
                            {activeCustInvoices.map(inv => (
                              <tr key={inv.id} className="hover:bg-brand-sidebar">
                                <td className="p-2 font-bold text-brand-ink">{inv.invoice_number}</td>
                                <td className="p-2 text-muted-foreground">{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${inv.payment_status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {inv.payment_status}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-bold">AED {inv.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">No invoice records found for this account.</p>
                    )}
                  </div>

                  {/* Quotations list */}
                  <div>
                    <h5 className="font-mono text-[10px] font-extrabold text-brand-accent uppercase mb-2">Quotations ({activeCustQuotations.length})</h5>
                    {activeCustQuotations.length > 0 ? (
                      <div className="border border-brand-line rounded overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-brand-header text-[9px] font-bold uppercase font-mono border-b border-brand-line">
                            <tr>
                              <th className="p-2">Quote No</th>
                              <th className="p-2">Date</th>
                              <th className="p-2">Status</th>
                              <th className="p-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-line font-mono text-[11px]">
                            {activeCustQuotations.map(q => (
                              <tr key={q.id} className="hover:bg-brand-sidebar">
                                <td className="p-2 font-bold text-brand-ink">{q.quotation_number}</td>
                                <td className="p-2 text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    q.status === 'Accepted' ? 'bg-green-50 text-green-700' :
                                    q.status === 'Sent' ? 'bg-blue-50 text-blue-700' :
                                    'bg-gray-50 text-gray-700'
                                  }`}>
                                    {q.status}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-bold">AED {q.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">No quotation history found for this account.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* CRM CONTEXTUAL TIMELINE ACTIVITIES */}
              <div className="bg-white border border-brand-line rounded-lg p-4 space-y-4">
                <h4 className="font-sans font-bold text-brand-ink uppercase text-[10px] tracking-wider border-b pb-2 flex justify-between items-center">
                  <span>Interactive CRM Interaction logs</span>
                  <span className="font-mono text-[9px] text-brand-accent uppercase">History Feed</span>
                </h4>

                {/* Scheduled followups checklist */}
                <div className="space-y-2">
                  <h5 className="font-mono text-[10px] font-extrabold text-muted-foreground uppercase">Scheduled Follow-up Tasks</h5>
                  {activeCustFollowups.length > 0 ? (
                    <div className="divide-y divide-brand-line border border-brand-line rounded-md bg-brand-sidebar/30">
                      {activeCustFollowups.map(flw => (
                        <div key={flw.id} className="p-2.5 flex items-center justify-between gap-4 text-[11px]">
                          <div>
                            <div className="font-bold text-brand-ink flex items-center gap-1.5">
                              <span>{flw.type}</span>
                              <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border ${flw.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {flw.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">Due: {new Date(flw.date).toLocaleDateString()} • Assigned: {flw.assigned_to}</div>
                            {flw.notes && <div className="text-gray-500 italic mt-1 font-sans">{flw.notes}</div>}
                          </div>
                          
                          <button
                            onClick={() => handleToggleFollowupStatus(flw)}
                            className="bg-white hover:bg-muted border border-brand-line px-2 py-1 text-[9px] font-bold uppercase rounded cursor-pointer shrink-0"
                          >
                            Toggle Status
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No active schedules recorded.</p>
                  )}
                </div>

                {/* Custom notes section */}
                <div className="space-y-3.5 pt-2">
                  <h5 className="font-mono text-[10px] font-extrabold text-muted-foreground uppercase">Account Diary & Logs</h5>
                  
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add custom activity log, transaction briefing, or payment promise..."
                      className="flex-1 px-3 py-1.5 border border-brand-line rounded text-xs focus:ring-2 focus:ring-primary font-medium bg-muted/40"
                    />
                    <button
                      type="submit"
                      className="bg-brand-ink text-white hover:bg-opacity-95 text-xs font-bold px-4 rounded cursor-pointer"
                    >
                      Log
                    </button>
                  </form>

                  <div className="space-y-2 max-h-48 overflow-auto">
                    {activeCustNotes.length > 0 ? (
                      activeCustNotes.map(note => (
                        <div key={note.id} className="p-2.5 bg-brand-sidebar border border-brand-line rounded text-[11px]">
                          <p className="text-foreground whitespace-pre-wrap">{note.text}</p>
                          <div className="flex justify-between items-center text-[9px] text-muted-foreground font-mono mt-1.5 border-t pt-1 border-gray-100">
                            <span>Author: {note.author}</span>
                            <span>{new Date(note.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic text-center py-4">No custom diary notes added.</p>
                    )}
                  </div>
                </div>

              </div>

            </div>

            <div className="px-6 py-4 border-t border-brand-line bg-white flex justify-between shrink-0">
              <div className="flex gap-1.5">
                {activeCustomer.phone && (
                  <button
                    onClick={() => handleLaunchWhatsApp(activeCustomer.phone!, `Hello ${activeCustomer.name}, this is AL Zahra Building Materials following up regarding our services.`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </button>
                )}
                {activeCustomer.google_map && (
                  <a
                    href={activeCustomer.google_map}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded flex items-center gap-1.5 shadow text-center"
                  >
                    <MapPin className="w-4 h-4" />
                    Navigate GPS
                  </a>
                )}
              </div>

              <button
                onClick={() => setIsDetailsDrawerOpen(false)}
                className="bg-brand-sidebar hover:bg-muted border border-brand-line text-brand-ink text-xs font-bold py-2 px-5 rounded cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </>
      )}

      {/* 7. MODAL: IMPORT WIZARD */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-brand-line shadow-2xl rounded-xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 text-xs">
            
            <div className="px-5 py-4 border-b border-brand-line bg-brand-header flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase text-brand-ink">
                Bulk Customer Import Wizard
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-brand-sidebar border border-brand-line p-3 rounded-lg leading-relaxed text-muted-foreground">
                <span className="font-bold text-brand-ink block mb-1">Spreadsheet Template Format Rules:</span>
                Upload a CSV or Excel spreadsheet containing column headers: <code className="font-mono font-bold text-brand-ink bg-white px-1">Company Name</code>, <code className="font-mono font-bold text-brand-ink bg-white px-1">Contact Person</code>, <code className="font-mono font-bold text-brand-ink bg-white px-1">Phone</code>, <code className="font-mono font-bold text-brand-ink bg-white px-1">Type</code>, <code className="font-mono font-bold text-brand-ink bg-white px-1">TRN</code>, <code className="font-mono font-bold text-brand-ink bg-white px-1">Opening Balance</code>. Duplicate checking and dynamic customer codes will be computed dynamically.
              </div>

              <div className="border-2 border-dashed border-brand-line rounded-lg p-6 flex flex-col items-center justify-center bg-muted/20 relative">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="font-bold text-brand-ink mb-1">Click to browse or Drag spreadsheet</span>
                <span className="text-[10px] text-muted-foreground">CSV, XLS, XLSX formats supported</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleImportCSV}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Import Errors list */}
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg space-y-1">
                  <span className="font-bold">Parsing Validation Warnings:</span>
                  <div className="max-h-24 overflow-auto text-[11px] font-mono">
                    {importErrors.map((err, i) => <div key={i}>• {err}</div>)}
                  </div>
                </div>
              )}

              {/* Preview Rows */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-brand-ink block">Preview Data Records ({importPreview.length} found):</span>
                  <div className="border border-brand-line rounded overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead className="bg-brand-header border-b border-brand-line">
                        <tr>
                          <th className="p-2">Company Name</th>
                          <th className="p-2">Phone</th>
                          <th className="p-2">Category</th>
                          <th className="p-2 text-right">Opening Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-line">
                        {importPreview.map((r, i) => (
                          <tr key={i} className="bg-white">
                            <td className="p-2 font-sans font-bold">{r.name}</td>
                            <td className="p-2">{r.phone}</td>
                            <td className="p-2">{r.customer_type}</td>
                            <td className="p-2 text-right">AED {r.opening_balance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-brand-header border-t border-brand-line flex justify-end gap-2">
              <button
                onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportErrors([]); }}
                className="bg-white border border-brand-line px-4 py-2 font-bold uppercase rounded cursor-pointer"
              >
                Close Portal
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importPreview.length === 0}
                className="bg-brand-ink text-white hover:bg-opacity-95 px-5 py-2 font-bold uppercase rounded disabled:opacity-50 cursor-pointer"
              >
                Execute Import
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8. MODAL: MERGE DUPLICATES */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-brand-line shadow-2xl rounded-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-xs">
            
            <div className="px-5 py-4 border-b border-brand-line bg-brand-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-ink" />
                <h3 className="font-extrabold text-sm uppercase text-brand-ink">
                  CRM Deduplication Merger
                </h3>
              </div>
              <button onClick={() => setIsMergeModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMergeCustomers} className="p-5 space-y-4">
              <div className="bg-brand-sidebar border border-brand-line p-3 rounded-lg text-muted-foreground leading-relaxed">
                Select the duplicate customer record and the main surviving master record. This utility links all historic quotations, sales invoices, ledger balances and deletes the duplicate seamlessly.
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Duplicate Customer Account (To Delete) *</label>
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3 py-2 border border-brand-line rounded text-xs bg-white"
                >
                  <option value="">-- Choose Duplicate --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.customer_code || `CUST-${c.id}`})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Surviving Customer Account (Survives) *</label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3 py-2 border border-brand-line rounded text-xs bg-white"
                >
                  <option value="">-- Choose Surviving Master --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.customer_code || `CUST-${c.id}`})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-brand-line flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="w-1/2 bg-white border border-brand-line py-2.5 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-brand-ink text-white hover:bg-opacity-95 py-2.5 font-bold uppercase cursor-pointer shadow"
                >
                  Merge Records
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 9. MODAL: ADD WHATSAPP TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-brand-line shadow-2xl rounded-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-xs text-brand-ink">
            
            <div className="px-5 py-4 border-b border-brand-line bg-brand-header flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase">Create Reusable Template</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Template Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Eid Mubarak Greetings"
                  required
                  className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Category Classification</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-bold bg-white"
                >
                  <option value="Marketing">Marketing Campaign</option>
                  <option value="Utility">General Utility</option>
                  <option value="Alert">Payment Outstanding Alert</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Template Body Content *</label>
                <textarea
                  rows={6}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Hello {{CustomerName}},\n\nWrite message body with placeholders:\n- {{Company}}\n- {{CustomerCode}}\n- {{Outstanding}}\n- {{SalesPerson}}"
                  required
                  className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium font-sans"
                />
              </div>

              <div className="bg-brand-sidebar border border-brand-line p-3 rounded-lg text-muted-foreground leading-relaxed text-[11px]">
                Supported personalization variables are auto-substituted on click-to-dispatch: <code className="font-mono text-brand-ink font-bold font-xs">&#123;&#123;CustomerName&#125;&#125;</code>, <code className="font-mono text-brand-ink font-bold font-xs">&#123;&#123;CustomerCode&#125;&#125;</code>, <code className="font-mono text-brand-ink font-bold font-xs">&#123;&#123;Outstanding&#125;&#125;</code>.
              </div>

              <div className="pt-4 border-t border-brand-line flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="w-1/2 bg-white border border-brand-line py-2.5 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-brand-ink text-white hover:bg-opacity-95 py-2.5 font-bold uppercase cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 10. MODAL: BROADCAST NEW WHATSAPP CAMPAIGN */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-brand-line shadow-2xl rounded-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 text-xs text-brand-ink">
            
            <div className="px-5 py-4 border-b border-brand-line bg-brand-header flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase">Configure WhatsApp Broadcast Campaign</h3>
              <button onClick={() => setIsCampaignModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCampaignSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Eid Mubarak Greetings - Sharjah Segment"
                  required
                  className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Message Template *</label>
                  <select
                    value={campaignTemplateId}
                    onChange={(e) => setCampaignTemplateId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-bold bg-white"
                  >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Target Group Segment</label>
                  <select
                    value={campaignSegment}
                    onChange={(e) => setCampaignSegment(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-bold bg-white"
                  >
                    {Object.keys(segments).map(seg => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Internal Notes</label>
                <textarea
                  rows={2}
                  value={campaignNotes}
                  onChange={(e) => setCampaignNotes(e.target.value)}
                  placeholder="Add details, target conversions, or agent notes..."
                  className="w-full px-3 py-2 border border-brand-line rounded focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="bg-brand-sidebar border border-brand-line p-3 rounded-lg leading-relaxed text-muted-foreground">
                <span className="font-bold text-brand-ink block mb-0.5">Mock Campaign Automation Action:</span>
                Clicking broadcast calculates target variables, schedules recipient timelines, logs analytics and launches a WhatsApp click-to-chat window on the first recipient for instant dispatch.
              </div>

              <div className="pt-4 border-t border-brand-line flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="w-1/2 bg-white border border-brand-line py-2.5 font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-brand-ink text-white hover:bg-opacity-95 py-2.5 font-bold uppercase cursor-pointer shadow"
                >
                  Launch Broadcast
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 11. TOAST NOTIFICATION CONTAINER */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-55 max-w-sm bg-brand-ink text-white border-2 border-brand-line px-4 py-3 shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_#319ba4] shrink-0" />
          <span className="text-xs font-mono font-bold tracking-tight">{toast.text}</span>
        </div>
      )}

    </div>
  );
}


