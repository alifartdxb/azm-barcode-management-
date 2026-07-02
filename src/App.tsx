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

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

function AppContent() {
  return (
    <div className="flex flex-col h-screen bg-brand-bg font-sans border-2 border-brand-line overflow-hidden m-0 box-border text-brand-ink print:h-auto print:overflow-visible print:border-none">
      <Header />
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
      <Footer />
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

