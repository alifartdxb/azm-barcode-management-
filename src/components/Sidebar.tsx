import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Printer, ScanBarcode, Coins, Users } from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Product Database', icon: Package },
    { to: '/print', label: 'Bulk Printing Engine', icon: Printer },
    { to: '/billing', label: 'POS & Billing', icon: Coins },
    { to: '/partners', label: 'CRM & Partners', icon: Users },
    { to: '/scanner', label: 'Scanner Status', icon: ScanBarcode },
  ];

  return (
    <div className="w-[220px] bg-brand-sidebar border-r-2 border-brand-line flex flex-col font-sans print:hidden">
      <nav className="flex-1 flex flex-col">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 text-[13px] border-b border-[#ddd] transition-none ${
                isActive ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-brand-ink hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 border-t border-brand-line bg-white">
        <div className="text-[10px] uppercase font-bold mb-1 text-brand-ink">Scanner Status</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <div className="text-[11px] font-mono text-brand-ink">USB HID: READY</div>
        </div>
      </div>
    </div>
  );
}
