/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Tag, Printer, ScanBarcode, Settings, Search, Coins, Users } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import PrintLabels from './pages/PrintLabels';
import Scanner from './pages/Scanner';
import Billing from './pages/Billing';
import Partners from './pages/Partners';

function Sidebar() {
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

function AppContent() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-bg font-sans border-2 border-brand-line overflow-hidden m-0 box-border text-brand-ink print:h-auto print:overflow-visible print:border-none">
      <div className="h-[50px] border-b-2 border-brand-line bg-white flex items-center justify-between px-4 shrink-0 print:hidden">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-tighter text-xl">AZM ABLMS v1.0</span>
          <form onSubmit={handleSearch} className="flex ml-6 border border-brand-line bg-white hidden md:flex">
            <input 
              type="text" 
              placeholder="Quick Scan or Search Product..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1 text-sm w-80 outline-none" 
            />
            <button type="submit" className="bg-brand-ink text-white px-4 text-xs uppercase font-sans cursor-pointer hover:bg-opacity-90">Find</button>
          </form>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/products')} 
            className="bg-brand-accent text-white border border-brand-line px-4 py-1 text-xs cursor-pointer hover:opacity-90 font-bold uppercase"
          >
            + Import Excel
          </button>
          <button 
            onClick={() => navigate('/print')} 
            className="border border-brand-line px-4 py-1 text-xs uppercase bg-white cursor-pointer hover:bg-gray-100 font-bold"
          >
            Batch Print
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden print:block print:h-auto print:overflow-visible">
        <Sidebar />
        <main className="flex-1 overflow-auto flex flex-col bg-brand-bg print:block print:h-auto print:overflow-visible">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/print" element={<PrintLabels />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/scanner" element={<Scanner />} />
          </Routes>
        </main>
      </div>
      <div className="h-[28px] border-t-2 border-brand-line bg-brand-ink text-white flex items-center justify-between px-3 font-mono text-[10px] shrink-0 print:hidden">
        <div>SYSTEM: OPERATIONAL | DB: azm_inv.sqlite</div>
        <div className="flex gap-4">
          <span>SEARCH: 12ms</span>
          <span>GEN: 450ms/3k units</span>
          <span>PRINT QUEUE: IDLE</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
