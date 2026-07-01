import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import Database from "better-sqlite3";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Initialize SQLite Database
  let db: any;
  try {
    db = new Database('./database.sqlite');
    console.log('Connected to the SQLite database.');
    
    // 1. Products Table
    db.exec(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      barcode TEXT UNIQUE,
      name TEXT,
      name_ar TEXT,
      brand TEXT,
      category TEXT,
      subcategory TEXT,
      unit TEXT,
      selling_price REAL,
      cost_price REAL,
      vat REAL,
      supplier TEXT,
      stock_quantity INTEGER,
      description TEXT,
      status TEXT
    )`);

    // 2. Customers Table
    db.exec(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      name_ar TEXT,
      phone TEXT,
      email TEXT,
      trn TEXT,
      address TEXT,
      balance REAL DEFAULT 0.0
    )`);

    // 3. Suppliers Table
    db.exec(`CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      name_ar TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      trn TEXT,
      address TEXT,
      balance REAL DEFAULT 0.0
    )`);

    // 4. Invoices Table
    db.exec(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      customer_id INTEGER,
      customer_name TEXT,
      customer_trn TEXT,
      date TEXT,
      subtotal REAL,
      discount REAL,
      vat_amount REAL,
      grand_total REAL,
      payment_status TEXT,
      payment_method TEXT,
      notes TEXT
    )`);

    // 5. Invoice Items Table
    db.exec(`CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      product_id INTEGER,
      product_name TEXT,
      sku TEXT,
      barcode TEXT,
      quantity INTEGER,
      unit_price REAL,
      vat_rate REAL,
      vat_amount REAL,
      total_amount REAL
    )`);

    // Seed default customers if empty
    const customerCount = db.prepare("SELECT count(*) as count FROM customers").get() as any;
    if (customerCount.count === 0) {
      db.prepare(`INSERT INTO customers (name, name_ar, phone, email, trn, address, balance) VALUES 
        ('Cash Customer', 'عميل نقدي', '0501234567', 'cash@alrehab.com', '', 'Deira, Dubai, UAE', 0.0),
        ('Al Sahel Contracting LLC', 'شركة الساحل للمقاولات ذ.م.م', '042233445', 'info@alsahel.ae', '100234567800003', 'Al Quoz, Dubai, UAE', 5420.50),
        ('Emirates Heights Builders', 'بناة مرتفعات الإمارات', '0569876543', 'contact@ehbuilders.ae', '100456789100003', 'Sharjah, UAE', 0.0)
      `).run();
    }

    // Seed default suppliers if empty
    const supplierCount = db.prepare("SELECT count(*) as count FROM suppliers").get() as any;
    if (supplierCount.count === 0) {
      db.prepare(`INSERT INTO suppliers (name, name_ar, contact_person, phone, email, trn, address, balance) VALUES 
        ('Steel & Rebar Gulf Corp', 'مؤسسة الخليج للحديد والصلب', 'Mr. Robert Chen', '0528889991', 'sales@gulfsteel.com', '100999888700003', 'Jebel Ali Free Zone, Dubai', -12500.00),
        ('Universal Cement Factory', 'مصنع الاسمنت العالمي', 'Ahmad Al Mansoori', '037776665', 'orders@unicement.ae', '100345112200003', 'Al Ain, UAE', 0.0),
        ('National Pipes & Fittings', 'الوطنية للأنابيب والتجهيزات', 'Sanjay Kumar', '065554433', 'sanjay@nationalpipes.com', '100888111200003', 'Industrial Area 5, Sharjah', -4350.00)
      `).run();
    }

  } catch (err: any) {
    console.error('Error opening database', err.message);
  }

  // API Routes
  
  // Get all products
  app.get("/api/products", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
      res.json({ products: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper: Calculate EAN-13 Check Digit
  function getEan13CheckDigit(code12: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const val = parseInt(code12[i], 10);
      sum += (i % 2 === 0) ? val : val * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum.toString();
  }

  // Helper: Generate unique EAN-13 barcode
  function generateUniqueEan13(existingBarcodes: Set<string>): string {
    let attempt = 0;
    while (attempt < 1000) {
      // Custom prefix '201' for internal store distribution
      const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
      const code12 = '201' + random9;
      const checkDigit = getEan13CheckDigit(code12);
      const barcode = code12 + checkDigit;
      if (!existingBarcodes.has(barcode)) {
        return barcode;
      }
      attempt++;
    }
    return '201' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  // Helper: Validate EAN-13 structure & checksum
  function isValidEan13(barcode: string): boolean {
    if (!/^\d{13}$/.test(barcode)) return false;
    const digits12 = barcode.slice(0, 12);
    const checkDigit = barcode[12];
    return getEan13CheckDigit(digits12) === checkDigit;
  }

  // Helper: Validate Code 128 (ASCII characters)
  function isValidCode128(barcode: string): boolean {
    return /^[\x20-\x7E]{1,80}$/.test(barcode);
  }

  // Get dashboard stats
  app.get("/api/dashboard", (req, res) => {
    try {
      let stats = {
        totalProducts: 0,
        noBarcode: 0,
        lowStock: 0,
        totalSales: 0,
        totalInvoices: 0
      };
      
      const totalRow = db.prepare("SELECT count(*) as count FROM products").get() as any;
      if (totalRow) stats.totalProducts = totalRow.count;
      
      const noBarcodeRow = db.prepare("SELECT count(*) as count FROM products WHERE barcode IS NULL OR barcode = ''").get() as any;
      if (noBarcodeRow) stats.noBarcode = noBarcodeRow.count;
      
      const lowStockRow = db.prepare("SELECT count(*) as count FROM products WHERE stock_quantity < 10").get() as any;
      if (lowStockRow) stats.lowStock = lowStockRow.count;

      try {
        const salesRow = db.prepare("SELECT SUM(grand_total) as total FROM invoices").get() as any;
        if (salesRow && salesRow.total) stats.totalSales = Math.round(salesRow.total * 100) / 100;

        const invoicesCountRow = db.prepare("SELECT count(*) as count FROM invoices").get() as any;
        if (invoicesCountRow) stats.totalInvoices = invoicesCountRow.count;
      } catch (err) {
        // Table may be empty
      }
      
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Add a single product with full verification and duplicate detection
  app.post("/api/products", (req, res) => {
    const p = req.body;
    if (!p.sku || !p.name) {
      return res.status(400).json({ error: "SKU and Product Name are required fields." });
    }

    try {
      // Validate SKU uniqueness
      const existingSku = db.prepare("SELECT id FROM products WHERE LOWER(sku) = LOWER(?)").get(p.sku.trim());
      if (existingSku) {
        return res.status(400).json({ error: `Duplicate SKU: '${p.sku}' is already assigned to a product.` });
      }

      let barcode = p.barcode ? p.barcode.trim() : "";
      const allBarcodesRows = db.prepare("SELECT barcode FROM products WHERE barcode IS NOT NULL AND barcode != ''").all() as any[];
      const existingBarcodes = new Set(allBarcodesRows.map(r => r.barcode.toLowerCase()));

      if (!barcode) {
        // Auto-generate EAN-13 if missing
        barcode = generateUniqueEan13(new Set(allBarcodesRows.map(r => r.barcode)));
      } else {
        // Validate uniqueness of custom barcode
        if (existingBarcodes.has(barcode.toLowerCase())) {
          return res.status(400).json({ error: `Duplicate Barcode: '${barcode}' is already in use.` });
        }
        // General format check (at least Code128 valid)
        if (!isValidCode128(barcode)) {
          return res.status(400).json({ error: "Invalid Barcode format. Only printable ASCII characters are allowed." });
        }
      }

      const stmt = db.prepare(`INSERT INTO products (
        sku, barcode, name, name_ar, brand, category, subcategory, unit, selling_price, cost_price, vat, supplier, stock_quantity, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      const result = stmt.run(
        p.sku.trim(),
        barcode,
        p.name.trim(),
        p.name_ar || '',
        p.brand || '',
        p.category || '',
        p.subcategory || '',
        p.unit || 'pcs',
        parseFloat(p.selling_price || '0'),
        parseFloat(p.cost_price || '0'),
        parseFloat(p.vat || '0'),
        p.supplier || '',
        parseInt(p.stock_quantity || '0', 10),
        p.description || '',
        p.status || 'Active'
      );

      res.status(201).json({
        message: "Product created successfully",
        id: result.lastInsertRowid,
        barcode
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk add/import products with smart duplicate detection and customizable options
  app.post("/api/products/import", (req, res) => {
    const { products, overwrite = true, autoGenerateMissing = true } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid products array" });
    }

    try {
      const allDbProducts = db.prepare("SELECT id, sku, barcode FROM products").all() as any[];
      const dbSkus = new Map(allDbProducts.map(p => [p.sku.toLowerCase(), p]));
      const dbBarcodes = new Set(allDbProducts.map(p => p.barcode ? p.barcode.toLowerCase() : "").filter(Boolean));

      const processedProducts: any[] = [];
      const skippedList: any[] = [];
      
      const duplicateSkusInPayload = new Set<string>();
      const duplicateBarcodesInPayload = new Set<string>();

      // Active registry of barcodes we will commit (to prevent collisions during bulk assignment)
      const activeBarcodesRegistry = new Set(allDbProducts.map(p => p.barcode).filter(Boolean));

      let generatedCount = 0;
      let updatedCount = 0;
      let insertedCount = 0;
      let skippedCount = 0;

      for (const p of products) {
        const skuKey = p.sku ? p.sku.trim() : "";
        if (!skuKey) {
          skippedList.push({ sku: "", name: p.name, reason: "Missing SKU value" });
          skippedCount++;
          continue;
        }

        // Inner payload SKU check
        if (duplicateSkusInPayload.has(skuKey.toLowerCase())) {
          skippedList.push({ sku: skuKey, name: p.name, reason: `Duplicate SKU '${skuKey}' within import file` });
          skippedCount++;
          continue;
        }
        duplicateSkusInPayload.add(skuKey.toLowerCase());

        let barcode = p.barcode ? p.barcode.trim() : "";
        if (barcode) {
          // Inner payload Barcode check
          if (duplicateBarcodesInPayload.has(barcode.toLowerCase())) {
            skippedList.push({ sku: skuKey, name: p.name, reason: `Duplicate Barcode '${barcode}' within import file` });
            skippedCount++;
            continue;
          }
          duplicateBarcodesInPayload.add(barcode.toLowerCase());
        }

        const existingDbProduct = dbSkus.get(skuKey.toLowerCase());

        if (existingDbProduct) {
          if (!overwrite) {
            skippedList.push({ sku: skuKey, name: p.name, reason: `SKU '${skuKey}' already exists in DB (overwrite disabled)` });
            skippedCount++;
            continue;
          }
          p.id = existingDbProduct.id;
          updatedCount++;
        } else {
          insertedCount++;
        }

        // Auto generation flow for blanks or missing
        if (!barcode) {
          if (autoGenerateMissing) {
            barcode = generateUniqueEan13(activeBarcodesRegistry);
            activeBarcodesRegistry.add(barcode);
            generatedCount++;
          } else {
            barcode = "";
          }
        } else {
          // Verify if barcode is already taken by some OTHER item
          const isOwnBarcode = existingDbProduct && existingDbProduct.barcode === barcode;
          if (!isOwnBarcode && activeBarcodesRegistry.has(barcode)) {
            if (autoGenerateMissing) {
              const oldBarcode = barcode;
              barcode = generateUniqueEan13(activeBarcodesRegistry);
              activeBarcodesRegistry.add(barcode);
              generatedCount++;
              console.log(`Auto-resolved barcode conflict for SKU ${skuKey}: '${oldBarcode}' -> '${barcode}'`);
            } else {
              skippedList.push({ sku: skuKey, name: p.name, reason: `Barcode '${barcode}' already registered to another item` });
              skippedCount++;
              if (existingDbProduct) updatedCount--; else insertedCount--;
              continue;
            }
          } else {
            activeBarcodesRegistry.add(barcode);
          }
        }

        p.finalBarcode = barcode;
        processedProducts.push(p);
      }

      // SQLite transaction for high speed bulk operation
      const insertOrUpdate = db.prepare(`INSERT OR REPLACE INTO products (
        id, sku, barcode, name, name_ar, brand, category, subcategory, unit, selling_price, cost_price, vat, supplier, stock_quantity, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      const doImport = db.transaction((list) => {
        for (const p of list) {
          const safeSku = String(p.sku || '').trim();
          const safeName = String(p.name || 'Unknown Product').trim();
          const safeBarcode = String(p.finalBarcode || p.barcode || '').trim();
          
          insertOrUpdate.run(
            p.id || null,
            safeSku,
            safeBarcode || null,
            safeName,
            p.name_ar || '',
            p.brand || '',
            p.category || '',
            p.subcategory || '',
            p.unit || 'pcs',
            parseFloat(p.selling_price) || 0,
            parseFloat(p.cost_price) || 0,
            parseFloat(p.vat) || 0,
            p.supplier || '',
            parseInt(p.stock_quantity, 10) || 0,
            p.description || '',
            p.status || 'Active'
          );
        }
      });

      doImport(processedProducts);

      res.json({
        message: "Import execution completed successfully",
        count: processedProducts.length,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        generated: generatedCount,
        skippedDetails: skippedList
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk scan and auto-generate barcodes for all products missing a barcode
  app.post("/api/products/generate-missing", (req, res) => {
    try {
      const allProducts = db.prepare("SELECT id, sku, barcode FROM products").all() as any[];
      const existingBarcodes = new Set(allProducts.map(p => p.barcode).filter(Boolean));
      
      const missing = allProducts.filter(p => !p.barcode || p.barcode.trim() === "");
      let generated = 0;

      const updateStmt = db.prepare("UPDATE products SET barcode = ? WHERE id = ?");
      const doUpdates = db.transaction((items) => {
        for (const item of items) {
          const newBarcode = generateUniqueEan13(existingBarcodes);
          existingBarcodes.add(newBarcode);
          updateStmt.run(newBarcode, item.id);
          generated++;
        }
      });

      doUpdates(missing);
      res.json({ message: `Successfully generated barcodes for ${generated} products.`, count: generated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Clear all products
  app.delete("/api/products", (req, res) => {
    try {
      db.prepare("DELETE FROM products").run();
      res.json({ message: "All products deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get product by barcode (Scanner)
  app.get("/api/products/scan/:barcode", (req, res) => {
    const barcode = req.params.barcode;
    try {
      const row = db.prepare("SELECT * FROM products WHERE barcode = ? OR sku = ?").get(barcode, barcode);
      if (!row) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CUSTOMER MODULE ENDPOINTS
  app.get("/api/customers", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM customers ORDER BY name ASC").all();
      res.json({ customers: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers", (req, res) => {
    const { name, name_ar, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Customer name is required" });
    try {
      const existing = db.prepare("SELECT id FROM customers WHERE LOWER(name) = LOWER(?)").get(name.trim());
      if (existing) return res.status(400).json({ error: "Customer name already exists" });

      const stmt = db.prepare(`INSERT INTO customers (name, name_ar, phone, email, trn, address, balance) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      const result = stmt.run(name.trim(), name_ar || "", phone || "", email || "", trn || "", address || "", parseFloat(balance || "0"));
      res.status(201).json({ id: result.lastInsertRowid, message: "Customer created successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/customers/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, name_ar, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Customer name is required" });
    try {
      const stmt = db.prepare(`UPDATE customers SET name = ?, name_ar = ?, phone = ?, email = ?, trn = ?, address = ?, balance = ? WHERE id = ?`);
      const result = stmt.run(name.trim(), name_ar || "", phone || "", email || "", trn || "", address || "", parseFloat(balance || "0"), id);
      if (result.changes === 0) return res.status(404).json({ error: "Customer not found" });
      res.json({ message: "Customer updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/customers/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const result = db.prepare("DELETE FROM customers WHERE id = ?").run(id);
      if (result.changes === 0) return res.status(404).json({ error: "Customer not found" });
      res.json({ message: "Customer deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SUPPLIER MODULE ENDPOINTS
  app.get("/api/suppliers", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
      res.json({ suppliers: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/suppliers", (req, res) => {
    const { name, name_ar, contact_person, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Supplier name is required" });
    try {
      const existing = db.prepare("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(?)").get(name.trim());
      if (existing) return res.status(400).json({ error: "Supplier name already exists" });

      const stmt = db.prepare(`INSERT INTO suppliers (name, name_ar, contact_person, phone, email, trn, address, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const result = stmt.run(name.trim(), name_ar || "", contact_person || "", phone || "", email || "", trn || "", address || "", parseFloat(balance || "0"));
      res.status(201).json({ id: result.lastInsertRowid, message: "Supplier created successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/suppliers/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, name_ar, contact_person, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Supplier name is required" });
    try {
      const stmt = db.prepare(`UPDATE suppliers SET name = ?, name_ar = ?, contact_person = ?, phone = ?, email = ?, trn = ?, address = ?, balance = ? WHERE id = ?`);
      const result = stmt.run(name.trim(), name_ar || "", contact_person || "", phone || "", email || "", trn || "", address || "", parseFloat(balance || "0"), id);
      if (result.changes === 0) return res.status(404).json({ error: "Supplier not found" });
      res.json({ message: "Supplier updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/suppliers/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const result = db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
      if (result.changes === 0) return res.status(404).json({ error: "Supplier not found" });
      res.json({ message: "Supplier deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // INVOICING WORKFLOW WITH STOCK REDUCTION & CREDIT MANAGER
  app.get("/api/invoices", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM invoices ORDER BY id DESC").all();
      res.json({ invoices: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/invoices/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as any;
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      
      const items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(id) as any[];
      invoice.items = items;
      
      res.json(invoice);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/invoices", (req, res) => {
    const {
      customer_id,
      customer_name,
      customer_trn,
      date,
      subtotal,
      discount,
      vat_amount,
      grand_total,
      payment_status,
      payment_method,
      notes,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invoice must contain at least one item." });
    }

    try {
      // Create unique serial Invoice Number
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const invoiceCountRow = db.prepare("SELECT count(*) as count FROM invoices WHERE invoice_number LIKE ?").get(`INV-${today}-%`) as any;
      const sequence = (invoiceCountRow.count + 1).toString().padStart(4, "0");
      const invoice_number = `INV-${today}-${sequence}`;

      // Insert within robust SQLite Transaction
      const createInvoiceTx = db.transaction(() => {
        const invoiceStmt = db.prepare(`INSERT INTO invoices (
          invoice_number, customer_id, customer_name, customer_trn, date, subtotal, discount, vat_amount, grand_total, payment_status, payment_method, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        const invoiceResult = invoiceStmt.run(
          invoice_number,
          customer_id || null,
          customer_name || "Cash Customer",
          customer_trn || "",
          date || new Date().toISOString().slice(0, 10),
          parseFloat(subtotal || "0"),
          parseFloat(discount || "0"),
          parseFloat(vat_amount || "0"),
          parseFloat(grand_total || "0"),
          payment_status || "Paid",
          payment_method || "Cash",
          notes || ""
        );

        const invoiceId = invoiceResult.lastInsertRowid;

        const itemStmt = db.prepare(`INSERT INTO invoice_items (
          invoice_id, product_id, product_name, sku, barcode, quantity, unit_price, vat_rate, vat_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        const updateStockStmt = db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`);

        for (const item of items) {
          itemStmt.run(
            invoiceId,
            item.product_id,
            item.product_name,
            item.sku,
            item.barcode,
            item.quantity,
            item.unit_price,
            item.vat_rate || 5.0,
            item.vat_amount || 0,
            item.total_amount || 0
          );

          // Update stock counts
          updateStockStmt.run(item.quantity, item.product_id);
        }

        // Adjust customer credit/balance if they buy on credit
        if (customer_id && payment_status !== "Paid") {
          const unpaidAmount = parseFloat(grand_total || "0");
          const updateCustomerStmt = db.prepare(`UPDATE customers SET balance = balance + ? WHERE id = ?`);
          updateCustomerStmt.run(unpaidAmount, customer_id);
        }

        return invoiceId;
      });

      const invoiceId = createInvoiceTx();
      res.status(201).json({
        id: invoiceId,
        invoice_number,
        message: "Invoice compiled, stock levels updated, and customer records written."
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/invoices/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as any;
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(id) as any[];

      const deleteTx = db.transaction(() => {
        // Revert product stock levels
        const updateStockStmt = db.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
        for (const item of items) {
          updateStockStmt.run(item.quantity, item.product_id);
        }

        // Revert customer credit balance
        if (invoice.customer_id && invoice.payment_status !== "Paid") {
          const revertBalanceStmt = db.prepare("UPDATE customers SET balance = balance - ? WHERE id = ?");
          revertBalanceStmt.run(invoice.grand_total, invoice.customer_id);
        }

        // Delete items and invoice records
        db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
        db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
      });

      deleteTx();
      res.json({ message: "Invoice removed. Product inventory stock levels and customer balance reverted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DIRECT STOCK INVENTORY UPDATER
  app.put("/api/products/:id/stock", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { stock_quantity } = req.body;
    if (stock_quantity === undefined || isNaN(parseInt(stock_quantity, 10))) {
      return res.status(400).json({ error: "stock_quantity is required and must be an integer" });
    }
    try {
      const stmt = db.prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
      const result = stmt.run(parseInt(stock_quantity, 10), id);
      if (result.changes === 0) return res.status(404).json({ error: "Product not found" });
      res.json({ stock_quantity, message: "Inventory stock updated successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 404 API Route Fallback - ensure unmatched /api routes return JSON instead of index.html fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Important: Use * for express v4, but we'll stick to a robust fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler - ensure unhandled middleware errors (like payload too large) return JSON instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected server error occurred"
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
