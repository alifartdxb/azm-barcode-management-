/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

function AppContent() {
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

