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

  // Bulk add/import products
  app.post("/api/products/import", (req, res) => {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid products array" });
    }

    try {
      const insert = db.prepare(`INSERT OR REPLACE INTO products (
        sku, barcode, name, name_ar, brand, category, subcategory, unit, selling_price, cost_price, vat, supplier, stock_quantity, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      const insertMany = db.transaction((prods) => {
        for (const p of prods) {
          insert.run(
            p.sku, p.barcode, p.name, p.name_ar, p.brand, p.category, p.subcategory, 
            p.unit, p.selling_price, p.cost_price, p.vat, p.supplier, p.stock_quantity, 
            p.description, p.status || 'Active'
          );
        }
      });
      
      insertMany(products);
      res.json({ message: "Import successful", count: products.length });
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
