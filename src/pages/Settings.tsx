import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { logActivity } from '../utils/logger';
import { 
  Building2, Receipt, Printer, Database, ShieldAlert,
  Globe, Bell, Save, ShieldCheck, Key, Lock, CheckCircle2, 
  Trash2, RefreshCw, Eye, EyeOff, FileText, Download, Upload, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'company' | 'tax' | 'print' | 'security' | 'database'>('company');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    db.settings.get(1).then(s => {
      setSettings(s || {
        company_name: 'AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)',
        company_address: 'Industrial Area, Al Sajaa, Sharjah, United Arab Emirates',
        company_phone: '+971 52 684 3809',
        company_email: 'sales@alzahrabm.com',
        company_website: 'www.alzahrabm.com',
        company_trn: '100259942900003',
        currency: 'AED',
        default_vat: 5,
        invoice_prefix: 'INV-',
        quotation_prefix: 'QT-',
        invoice_terms: '1. Goods sold are non-refundable.\n2. Payment terms are strictly net cash on delivery.',
        barcode_width: 50,
        barcode_height: 25,
        barcode_density: 300,
        session_timeout: 15,
        lockout_attempts: 5,
        strict_password: true
      });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaveLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      if (settings) {
        settings.id = 1;
        await db.settings.put(settings);
        
        // Write action to secure audit log
        const currentUserStr = localStorage.getItem('currentUser');
        const username = currentUserStr ? JSON.parse(currentUserStr).username : 'Admin';
        await logActivity(username, 'Updated system core settings and configuration preferences', 'Settings', 'info');

        setSuccessMsg('All configuration preferences saved and active successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save system settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  // Database Backup Utility: Exports IndexedDB tables as JSON
  const handleExportBackup = async () => {
    try {
      const data: Record<string, any> = {};
      const tables = ['products', 'customers', 'suppliers', 'invoices', 'quotations', 'purchaseOrders', 'users', 'settings', 'auditLogs'];
      
      for (const table of tables) {
        data[table] = await (db as any)[table].toArray();
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `Al_Zahra_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      const currentUserStr = localStorage.getItem('currentUser');
      const username = currentUserStr ? JSON.parse(currentUserStr).username : 'Admin';
      await logActivity(username, 'Created and downloaded physical database JSON backup', 'Security', 'info');
      alert('Physical system backup generated and downloaded successfully!');
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    }
  };

  // Database Restore Utility: Imports JSON backup safely
  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (confirm('Importing this file will overwrite existing ERP data. Do you want to proceed?')) {
          const tables = ['products', 'customers', 'suppliers', 'invoices', 'quotations', 'purchaseOrders', 'users', 'settings', 'auditLogs'];
          
          for (const table of tables) {
            if (data[table]) {
              await (db as any)[table].clear();
              await (db as any)[table].bulkAdd(data[table]);
            }
          }

          const currentUserStr = localStorage.getItem('currentUser');
          const username = currentUserStr ? JSON.parse(currentUserStr).username : 'Admin';
          await logActivity(username, 'Successfully imported physical database backup JSON', 'Security', 'critical');

          alert('Database restored successfully! Re-opening the session...');
          window.location.reload();
        }
      } catch (err: any) {
        alert('Restore failed. Invalid backup file format: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear the system security logs? This action is irreversible.')) {
      await db.auditLogs.clear();
      const currentUserStr = localStorage.getItem('currentUser');
      const username = currentUserStr ? JSON.parse(currentUserStr).username : 'Admin';
      await logActivity(username, 'Cleared all historic security audit logs', 'Security', 'critical');
      alert('Audit logs cleared successfully!');
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background text-muted-foreground font-mono text-xs">
        LOADING CONFIGURATIONS...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      
      {/* Header Panel */}
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card sticky top-0 z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Configurations</h1>
          <p className="text-sm text-muted-foreground">Manage organizational data, VAT taxation, direct thermal printer drivers, and cyber defense controls.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button 
            disabled={saveLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-bold" 
            onClick={handleSave}
          >
            {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Dynamic Settings
          </Button>
        </div>
      </div>

      {/* Alerts banner */}
      {(successMsg || errorMsg) && (
        <div className="px-6 pt-6 shrink-0">
          {successMsg && (
            <div className="p-3 bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Configurations Grid */}
      <div className="p-6 flex flex-col md:flex-row gap-8 flex-1 items-start">
        
        {/* Tab Side Navigation Buttons */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1.5 bg-card p-3 border rounded-xl">
          <SettingsNavButton 
            active={activeTab === 'company'} 
            onClick={() => setActiveTab('company')}
            icon={<Building2 className="w-4 h-4" />} 
            label="Corporate Profile" 
          />
          <SettingsNavButton 
            active={activeTab === 'tax'} 
            onClick={() => setActiveTab('tax')}
            icon={<Receipt className="w-4 h-4" />} 
            label="Taxation & Billing" 
          />
          <SettingsNavButton 
            active={activeTab === 'print'} 
            onClick={() => setActiveTab('print')}
            icon={<Printer className="w-4 h-4" />} 
            label="Printer Label Preferences" 
          />
          <SettingsNavButton 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')}
            icon={<ShieldAlert className="w-4 h-4" />} 
            label="Cyber Security & Timeout" 
          />
          <SettingsNavButton 
            active={activeTab === 'database'} 
            onClick={() => setActiveTab('database')}
            icon={<Database className="w-4 h-4" />} 
            label="Database Backups" 
          />
        </div>

        {/* Dynamic Card Area */}
        <div className="flex-1 max-w-3xl flex flex-col gap-6">

          {/* TAB: CORPORATE PROFILE */}
          {activeTab === 'company' && (
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Al Zahra Corporate Profile</CardTitle>
                <CardDescription>Configure physical address and tax records for legal documentation headers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
                  <Input 
                    value={settings?.company_name || ''} 
                    onChange={e => updateField('company_name', e.target.value)} 
                    className="font-medium text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Registered TRN / Tax Reg Number</label>
                  <Input 
                    value={settings?.company_trn || ''} 
                    onChange={e => updateField('company_trn', e.target.value)} 
                    placeholder="100259942900003"
                    className="font-mono text-sm tracking-wider"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Corporate Physical Address</label>
                  <Input 
                    value={settings?.company_address || ''} 
                    onChange={e => updateField('company_address', e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Contact</label>
                    <Input 
                      value={settings?.company_phone || ''} 
                      onChange={e => updateField('company_phone', e.target.value)} 
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                    <Input 
                      type="email" 
                      value={settings?.company_email || ''} 
                      onChange={e => updateField('company_email', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Corporate Web Portal URL</label>
                  <Input 
                    value={settings?.company_website || ''} 
                    onChange={e => updateField('company_website', e.target.value)} 
                    placeholder="www.alzahrabm.com"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB: TAXATION & BILLING */}
          {activeTab === 'tax' && (
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Taxation, Currency & Custom Prefixes</CardTitle>
                <CardDescription>Fine-tune invoice identifiers, VAT tax percentages, and default billing conditions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Corporate Currency</label>
                    <select 
                      value={settings?.currency || 'AED'} 
                      onChange={e => updateField('currency', e.target.value)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="AED">AED (United Arab Emirates Dirham)</option>
                      <option value="USD">USD (United States Dollar)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Standard UAE VAT Rate (%)</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={settings?.default_vat || 5} 
                      onChange={e => updateField('default_vat', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Invoice Prefix ID</label>
                    <Input 
                      value={settings?.invoice_prefix || 'INV-'} 
                      onChange={e => updateField('invoice_prefix', e.target.value)} 
                      className="font-mono text-sm font-bold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quotation Prefix ID</label>
                    <Input 
                      value={settings?.quotation_prefix || 'QT-'} 
                      onChange={e => updateField('quotation_prefix', e.target.value)} 
                      className="font-mono text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Invoice Standard Terms & Conditions</label>
                  <textarea 
                    value={settings?.invoice_terms || ''} 
                    onChange={e => updateField('invoice_terms', e.target.value)} 
                    rows={4}
                    className="w-full flex rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Enter legal invoice footer note"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB: PRINTER PREFERENCES */}
          {activeTab === 'print' && (
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Direct Thermal Label Printer Settings</CardTitle>
                <CardDescription>Configure physical sizes for bulk barcode generation and direct terminal printers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Label Width (mm)</label>
                    <Input 
                      type="number" 
                      value={settings?.barcode_width || 50} 
                      onChange={e => updateField('barcode_width', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Label Height (mm)</label>
                    <Input 
                      type="number" 
                      value={settings?.barcode_height || 25} 
                      onChange={e => updateField('barcode_height', parseInt(e.target.value) || 0)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Predefined Industry Layout</label>
                  <select 
                    value={`${settings?.barcode_width || 50}x${settings?.barcode_height || 25}`}
                    onChange={e => {
                      const [w, h] = e.target.value.split('x').map(Number);
                      updateField('barcode_width', w);
                      updateField('barcode_height', h);
                    }}
                    className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none"
                  >
                    <option value="50x25">Standard Thermal Label Size (50mm x 25mm)</option>
                    <option value="38x25">Compact Price Tag Layout (38mm x 25mm)</option>
                    <option value="75x50">Large Storage Bin Layout (75mm x 50mm)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Direct Hardware Print Density</span>
                    <span className="font-mono">{settings?.barcode_density || 300} DPI</span>
                  </div>
                  <input 
                    type="range" 
                    min="150" 
                    max="600" 
                    step="50"
                    value={settings?.barcode_density || 300} 
                    onChange={e => updateField('barcode_density', parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>150 DPI (Draft)</span>
                    <span>300 DPI (Standard Thermal)</span>
                    <span>600 DPI (High Contrast Ribbon)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB: SECURITY & CONSTRAINTS */}
          {activeTab === 'security' && (
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">ERP Security Policies & Access Controls</CardTitle>
                <CardDescription>Configure automatic timeouts, login lockout triggers, and password requirements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inactivity Auto-Logout Timeout</label>
                    <select 
                      value={settings?.session_timeout || 15} 
                      onChange={e => updateField('session_timeout', parseInt(e.target.value) || 15)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none"
                    >
                      <option value="5">5 Minutes (Strict Security)</option>
                      <option value="15">15 Minutes (Recommended)</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">60 Minutes (Office Clerk)</option>
                      <option value="0">Never Timeout (Insecure)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Maximum Failed Logins Lockout</label>
                    <select 
                      value={settings?.lockout_attempts || 5} 
                      onChange={e => updateField('lockout_attempts', parseInt(e.target.value) || 5)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none"
                    >
                      <option value="3">3 Attempts (Highly Defensive)</option>
                      <option value="5">5 Attempts (Recommended)</option>
                      <option value="10">10 Attempts</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-3 border-t">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">Enforce Complex Password Credentials</p>
                      <p className="text-xs text-muted-foreground">Force newly created staff passwords to have at least 5 characters and contain a digit or custom symbol.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!settings?.strict_password}
                      onChange={e => updateField('strict_password', e.target.checked)}
                      className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer h-4 w-4 mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB: DATABASE ADMIN / BACKUP */}
          {activeTab === 'database' && (
            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Database Backups & physical Exports</CardTitle>
                <CardDescription>Export your complete offline ERP data state to a secure JSON file, or restore a backup.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                
                <div className="p-4 bg-muted/40 border border-dashed rounded-xl flex items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-cyan-600" />
                      Create Secure System Backup
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">Compile all inventories, active user credentials, suppliers list, quotations, and security audit logs into a lightweight portable encrypted backup.</p>
                  </div>
                  <Button onClick={handleExportBackup} size="sm" className="bg-cyan-600 hover:bg-cyan-500 font-bold shrink-0 text-white">
                    Export Backup
                  </Button>
                </div>

                <div className="p-4 bg-amber-500/5 border border-dashed border-amber-600/30 rounded-xl flex items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-600" />
                      Restore Dynamic State Backup
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">WARNING: Restoring will completely clear all local tables and overwrite active states with those in your selected `.json` backup file.</p>
                  </div>
                  <div className="relative shrink-0">
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBackup} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <Button size="sm" variant="outline" className="border-amber-600/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold">
                      Select JSON
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Clear Security Logs</p>
                    <p className="text-xs text-muted-foreground">Clear historic user audit entries. Use this sparingly as part of physical maintenance.</p>
                  </div>
                  <Button onClick={handleClearLogs} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-500 font-bold text-white">
                    Clear Security Logs
                  </Button>
                </div>

              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

interface SettingsNavButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function SettingsNavButton({ active, onClick, icon, label }: SettingsNavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
        active 
          ? 'bg-primary/10 text-primary border-l-2 border-primary pl-3.5' 
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
