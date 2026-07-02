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
import { Layout } from './components/Layout';
import { Footer } from './components/Footer';

function AppContent() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/print" element={<PrintLabels />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/scanner" element={<Scanner />} />
      </Route>
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

