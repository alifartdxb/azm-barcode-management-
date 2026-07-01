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
  let db;
  try {
    db = new Database('./database.sqlite');
    console.log('Connected to the SQLite database.');
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
      };
      
      const totalRow = db.prepare("SELECT count(*) as count FROM products").get() as any;
      if (totalRow) stats.totalProducts = totalRow.count;
      
      const noBarcodeRow = db.prepare("SELECT count(*) as count FROM products WHERE barcode IS NULL OR barcode = ''").get() as any;
      if (noBarcodeRow) stats.noBarcode = noBarcodeRow.count;
      
      const lowStockRow = db.prepare("SELECT count(*) as count FROM products WHERE stock_quantity < 10").get() as any;
      if (lowStockRow) stats.lowStock = lowStockRow.count;
      
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
          insertOrUpdate.run(
            p.id || null,
            p.sku.trim(),
            p.finalBarcode,
            p.name.trim(),
            p.name_ar || '',
            p.brand || '',
            p.category || '',
            p.subcategory || '',
            p.unit || 'pcs',
            p.selling_price || 0,
            p.cost_price || 0,
            p.vat || 0,
            p.supplier || '',
            p.stock_quantity || 0,
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
