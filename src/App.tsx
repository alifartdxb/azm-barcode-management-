/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import PrintLabels from './pages/PrintLabels';
import Scanner from './pages/Scanner';
import Billing from './pages/Billing';
import Partners from './pages/Partners';
import Crm from './pages/Crm';
import Inventory from './pages/Inventory';
import Quotations from './pages/Quotations';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import Logs from './pages/Logs';
import { Layout } from './components/Layout';
import { Footer } from './components/Footer';
import NotFound from './pages/NotFound';
import Auth from './pages/Auth';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const active = localStorage.getItem('currentUser');
    const remembered = localStorage.getItem('rememberedUser');
    if (active) {
      setCurrentUser(JSON.parse(active));
    } else if (remembered) {
      setCurrentUser(JSON.parse(remembered));
      localStorage.setItem('currentUser', remembered);
    }
    setChecking(false);

    const handleUserChange = () => {
      const activeUser = localStorage.getItem('currentUser');
      setCurrentUser(activeUser ? JSON.parse(activeUser) : null);
    };

    window.addEventListener('storage', handleUserChange);
    window.addEventListener('user-login-change', handleUserChange);
    return () => {
      window.removeEventListener('storage', handleUserChange);
      window.removeEventListener('user-login-change', handleUserChange);
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Loading Al Zahra ERP...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/print" element={<PrintLabels />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/crm" element={<Crm />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="/logs" element={<Logs />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

