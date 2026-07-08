import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { 
  Building2, Receipt, Printer, Database,
  Globe, Bell, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.settings.get(1).then(s => {
      setSettings(s || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (settings) {
      settings.id = 1;
      await db.settings.put(settings);
      alert('Settings saved successfully!');
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card sticky top-0 z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">Manage application preferences, company details, and system configurations.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button className="flex items-center gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="p-6 flex flex-col md:flex-row gap-8">
        
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          <SettingsNavButton active icon={<Building2 className="w-4 h-4" />} label="Company Profile" />
          <SettingsNavButton icon={<Receipt className="w-4 h-4" />} label="Tax & Billing" />
          <SettingsNavButton icon={<Printer className="w-4 h-4" />} label="Printing Preferences" />
          <SettingsNavButton icon={<Globe className="w-4 h-4" />} label="Localization" />
          <SettingsNavButton icon={<Bell className="w-4 h-4" />} label="Notifications" />
          <SettingsNavButton icon={<Database className="w-4 h-4" />} label="Database Backups" />
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 max-w-3xl flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Update your company details and logo for invoices and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input value={settings?.company_name || ''} onChange={e => updateField('company_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch / Location</label>
                <Input value={settings?.company_address || ''} onChange={e => updateField('company_address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input value={settings?.company_phone || ''} onChange={e => updateField('company_phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input value={settings?.company_email || ''} onChange={e => updateField('company_email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input value={settings?.company_website || ''} onChange={e => updateField('company_website', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">TRN / Tax Registration Number</label>
                <Input value={settings?.company_trn || ''} onChange={e => updateField('company_trn', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Defaults</CardTitle>
              <CardDescription>Set default values for operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Currency</label>
                  <select 
                    value={settings?.currency || 'AED'} 
                    onChange={e => updateField('currency', e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default VAT (%)</label>
                  <Input type="number" value={settings?.default_vat || 5} onChange={e => updateField('default_vat', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Prefix</label>
                  <Input value={settings?.invoice_prefix || 'INV-'} onChange={e => updateField('invoice_prefix', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quotation Prefix</label>
                  <Input value={settings?.quotation_prefix || 'QT-'} onChange={e => updateField('quotation_prefix', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function SettingsNavButton({ active, icon, label }: { active?: boolean, icon: React.ReactNode, label: string }) {
  return (
    <button className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
      active 
        ? 'bg-primary/10 text-primary' 
        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
    }`}>
      {icon}
      {label}
    </button>
  );
}
