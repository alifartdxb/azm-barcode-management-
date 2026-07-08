import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Printer, ScanBarcode, Coins, Users,
  ChevronLeft, ChevronRight, Settings, HelpCircle, LogOut, Heart, Clock,
  FileText, ShoppingCart, Truck, Activity, Database, Shield, BarChart4, MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();

  const primaryLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Product Management', icon: Package },
    { to: '/print', label: 'Barcode & Labels', icon: Printer },
    { to: '/inventory', label: 'Inventory', icon: Database },
    { to: '/billing', label: 'Sales & POS', icon: Coins },
    { to: '/quotations', label: 'Quotations', icon: FileText },
    { to: '/purchases', label: 'Purchase Orders', icon: ShoppingCart },
    { to: '/crm', label: 'CRM & WhatsApp', icon: MessageSquare },
    { to: '/partners', label: 'Customers', icon: Users },
    { to: '/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/reports', label: 'Reports', icon: BarChart4 },
  ];

  const secondaryLinks = [
    { to: '/users', label: 'Users & Roles', icon: Shield },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/backup', label: 'Backup & Restore', icon: Database },
    { to: '/logs', label: 'Activity Logs', icon: Activity },
  ];

  return (
    <aside 
      className={cn(
        "flex flex-col bg-card border-r transition-all duration-300 ease-in-out print:hidden z-20 shrink-0",
        isOpen ? "w-64" : "w-[72px]"
      )}
    >
      <div className="h-16 flex items-center px-4 border-b shrink-0 justify-between">
        <div className={cn("flex items-center gap-3 overflow-hidden", !isOpen && "justify-center w-full")}>
          {/* Logo placeholder - text based for now, you can replace with img later */}
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-black tracking-tighter text-sm">AZM</span>
          </div>
          {isOpen && (
            <span className="font-bold text-lg tracking-tight truncate">AL Zahra Al Malakia</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col gap-6">
        
        {isOpen && (
          <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Main Menu
          </div>
        )}

        <nav className="flex flex-col gap-1 px-2">
          {primaryLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                title={!isOpen ? link.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors relative group",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {isOpen && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {isOpen && (
          <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
            System
          </div>
        )}

        <nav className="flex flex-col gap-1 px-2 mt-auto">
          {secondaryLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to}
                title={!isOpen ? link.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors relative group",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {isOpen && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
          {isOpen && <div className="text-xs font-mono text-muted-foreground truncate">USB HID: READY</div>}
        </div>
        
        {isOpen && (
          <Button variant="outline" className="w-full justify-start text-muted-foreground gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        )}
      </div>
    </aside>
  );
}
