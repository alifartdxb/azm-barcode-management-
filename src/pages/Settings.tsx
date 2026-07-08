import React from 'react';
import { 
  Settings as SettingsIcon, Building2, Receipt, Printer, Database,
  Globe, Shield, Bell, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function Settings() {
  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card sticky top-0 z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">Manage application preferences, company details, and system configurations.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button className="flex items-center gap-2">
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
                <Input defaultValue="Al Zahra Al Malakia Building Materials Trading LLC" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch / Location</label>
                <Input defaultValue="Sharjah Branch" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input defaultValue="+971 6 123 4567" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input defaultValue="info@alzahra.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">TRN / Tax Registration Number</label>
                <Input defaultValue="100234567890003" />
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
                  <select className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default VAT (%)</label>
                  <Input type="number" defaultValue="5.0" />
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
