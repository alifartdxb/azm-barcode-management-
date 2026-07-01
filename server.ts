import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import admin from "firebase-admin";
import { getFirestore, WriteBatch, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Load firebase configuration from applet config
  let firebaseConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to load firebase-applet-config.json:", err);
  }

  // Initialize Firebase Admin SDK
  if (firebaseConfig.projectId) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log(`Firebase Admin initialized with project: ${firebaseConfig.projectId}`);
  } else {
    admin.initializeApp();
    console.log("Firebase Admin initialized with default credentials");
  }

  const firestore = getFirestore();
  if (firebaseConfig.firestoreDatabaseId) {
    firestore.settings({
      databaseId: firebaseConfig.firestoreDatabaseId,
      ignoreUndefinedProperties: true
    });
    console.log(`Firestore database configured: ${firebaseConfig.firestoreDatabaseId}`);
  } else {
    firestore.settings({
      ignoreUndefinedProperties: true
    });
  }

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

  // Helper: Validate Code 128 (ASCII characters)
  function isValidCode128(barcode: string): boolean {
    return /^[\x20-\x7E]{1,80}$/.test(barcode);
  }

  // Seed default collections if empty on startup
  async function seedDefaultData() {
    try {
      const productsSnap = await firestore.collection("products").limit(1).get();
      if (productsSnap.empty) {
        console.log("Seeding default products to Firestore...");
        const defaultProducts = [
          {
            sku: "AZM-HD-001",
            barcode: "2019876543210",
            sku_lower: "azm-hd-001",
            name: "Heavy Duty Brass Padlock 50mm",
            name_ar: "قفل نحاسي ثقيل 50 ملم",
            brand: "Yale",
            category: "Security & Locks",
            subcategory: "Padlocks",
            unit: "pcs",
            selling_price: 45.00,
            cost_price: 25.00,
            vat: 5.0,
            supplier: "Steel & Rebar Gulf Corp",
            stock_quantity: 120,
            description: "Premium heavy-duty double locking brass padlock with hardened steel shackle.",
            status: "Active"
          },
          {
            sku: "AZM-PL-042",
            barcode: "2011234567897",
            sku_lower: "azm-pl-042",
            name: "High Pressure PVC Pipe 1/2 Inch",
            name_ar: "أنبوب بي في سي ضغط عالي 1/2 بوصة",
            brand: "National Plast",
            category: "Plumbing",
            subcategory: "Pipes",
            unit: "meters",
            selling_price: 12.50,
            cost_price: 6.00,
            vat: 5.0,
            supplier: "National Pipes & Fittings",
            stock_quantity: 350,
            description: "Schedule 80 high-pressure PVC plumbing pipe, highly durable and chemical resistant.",
            status: "Active"
          },
          {
            sku: "AZM-EL-105",
            barcode: "2015556667771",
            sku_lower: "azm-el-105",
            name: "Insulated Wire Copper 2.5mm Reel",
            name_ar: "لفة سلك نحاس معزول 2.5 ملم",
            brand: "Ducab",
            category: "Electrical",
            subcategory: "Wires & Cables",
            unit: "reels",
            selling_price: 185.00,
            cost_price: 140.00,
            vat: 5.0,
            supplier: "Universal Cement Factory",
            stock_quantity: 45,
            description: "100-meter reel of high conductivity copper building wire with PVC insulation.",
            status: "Active"
          }
        ];
        const batch = firestore.batch();
        for (const p of defaultProducts) {
          const ref = firestore.collection("products").doc();
          batch.set(ref, p);
        }
        await batch.commit();
      }

      const customersSnap = await firestore.collection("customers").limit(1).get();
      if (customersSnap.empty) {
        console.log("Seeding default customers to Firestore...");
        const defaultCustomers = [
          {
            name: 'Cash Customer',
            name_lower: 'cash customer',
            name_ar: 'عميل نقدي',
            phone: '0501234567',
            email: 'cash@alrehab.com',
            trn: '',
            address: 'Deira, Dubai, UAE',
            balance: 0.0
          },
          {
            name: 'Al Sahel Contracting LLC',
            name_lower: 'al sahel contracting llc',
            name_ar: 'شركة الساحل للمقاولات ذ.م.م',
            phone: '042233445',
            email: 'info@alsahel.ae',
            trn: '100234567800003',
            address: 'Al Quoz, Dubai, UAE',
            balance: 5420.50
          },
          {
            name: 'Emirates Heights Builders',
            name_lower: 'emirates heights builders',
            name_ar: 'بناة مرتفعات الإمارات',
            phone: '0569876543',
            email: 'contact@ehbuilders.ae',
            trn: '100456789100003',
            address: 'Sharjah, UAE',
            balance: 0.0
          }
        ];
        const batch = firestore.batch();
        for (const c of defaultCustomers) {
          const ref = firestore.collection("customers").doc();
          batch.set(ref, c);
        }
        await batch.commit();
      }

      const suppliersSnap = await firestore.collection("suppliers").limit(1).get();
      if (suppliersSnap.empty) {
        console.log("Seeding default suppliers to Firestore...");
        const defaultSuppliers = [
          {
            name: 'Steel & Rebar Gulf Corp',
            name_lower: 'steel & rebar gulf corp',
            name_ar: 'مؤسسة الخليج للحديد والصلب',
            contact_person: 'Mr. Robert Chen',
            phone: '0528889991',
            email: 'sales@gulfsteel.com',
            trn: '100999888700003',
            address: 'Jebel Ali Free Zone, Dubai',
            balance: -12500.00
          },
          {
            name: 'Universal Cement Factory',
            name_lower: 'universal cement factory',
            name_ar: 'مصنع الاسمنت العالمي',
            contact_person: 'Ahmad Al Mansoori',
            phone: '037776665',
            email: 'orders@unicement.ae',
            trn: '100345112200003',
            address: 'Al Ain, UAE',
            balance: 0.0
          },
          {
            name: 'National Pipes & Fittings',
            name_lower: 'national pipes & fittings',
            name_ar: 'الوطنية للأنابيب والتجهيزات',
            contact_person: 'Sanjay Kumar',
            phone: '065554433',
            email: 'sanjay@nationalpipes.com',
            trn: '100888111200003',
            address: 'Industrial Area 5, Sharjah',
            balance: -4350.00
          }
        ];
        const batch = firestore.batch();
        for (const s of defaultSuppliers) {
          const ref = firestore.collection("suppliers").doc();
          batch.set(ref, s);
        }
        await batch.commit();
      }
    } catch (err) {
      console.error("Seeding error:", err);
    }
  }

  await seedDefaultData();

  // API Routes

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const snapshot = await firestore.collection("products").get();
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ products });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get dashboard stats
  app.get("/api/dashboard", async (req, res) => {
    try {
      const productsSnap = await firestore.collection("products").get();
      const invoicesSnap = await firestore.collection("invoices").get();

      let totalProducts = productsSnap.size;
      let noBarcode = 0;
      let lowStock = 0;

      productsSnap.forEach(doc => {
        const data = doc.data();
        if (!data.barcode || data.barcode.trim() === "") noBarcode++;
        if ((data.stock_quantity || 0) < 10) lowStock++;
      });

      let totalSales = 0;
      let totalInvoices = invoicesSnap.size;
      invoicesSnap.forEach(doc => {
        const data = doc.data();
        totalSales += (data.grand_total || 0);
      });

      res.json({
        totalProducts,
        noBarcode,
        lowStock,
        totalSales: Math.round(totalSales * 100) / 100,
        totalInvoices
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST: Add a single product with full verification and duplicate detection
  app.post("/api/products", async (req, res) => {
    const p = req.body;
    if (!p.sku || !p.name) {
      return res.status(400).json({ error: "SKU and Product Name are required fields." });
    }

    try {
      const skuLower = p.sku.trim().toLowerCase();
      const existingSkuSnap = await firestore.collection("products").where("sku_lower", "==", skuLower).get();
      if (!existingSkuSnap.empty) {
        return res.status(400).json({ error: `Duplicate SKU: '${p.sku}' is already assigned to a product.` });
      }

      let barcode = p.barcode ? p.barcode.trim() : "";
      const allProductsSnap = await firestore.collection("products").get();
      const existingBarcodes = new Set(allProductsSnap.docs.map(doc => (doc.data().barcode || "").toLowerCase()).filter(Boolean));

      if (!barcode) {
        barcode = generateUniqueEan13(new Set(allProductsSnap.docs.map(doc => doc.data().barcode).filter(Boolean)));
      } else {
        if (existingBarcodes.has(barcode.toLowerCase())) {
          return res.status(400).json({ error: `Duplicate Barcode: '${barcode}' is already in use.` });
        }
        if (!isValidCode128(barcode)) {
          return res.status(400).json({ error: "Invalid Barcode format. Only printable ASCII characters are allowed." });
        }
      }

      const productData = {
        sku: p.sku.trim(),
        sku_lower: skuLower,
        barcode,
        name: p.name.trim(),
        name_ar: p.name_ar || '',
        brand: p.brand || '',
        category: p.category || '',
        subcategory: p.subcategory || '',
        unit: p.unit || 'pcs',
        selling_price: parseFloat(p.selling_price || '0'),
        cost_price: parseFloat(p.cost_price || '0'),
        vat: parseFloat(p.vat || '0'),
        supplier: p.supplier || '',
        stock_quantity: parseInt(p.stock_quantity || '0', 10),
        description: p.description || '',
        status: p.status || 'Active'
      };

      const docRef = await firestore.collection("products").add(productData);

      res.status(201).json({
        message: "Product created successfully",
        id: docRef.id,
        barcode
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk add/import products with smart duplicate detection and customizable options
  app.post("/api/products/import", async (req, res) => {
    const { products, overwrite = true, autoGenerateMissing = true } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid products array" });
    }

    try {
      const allDbProductsSnap = await firestore.collection("products").get();
      const allDbProducts = allDbProductsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      const dbSkus = new Map(allDbProducts.map(p => [p.sku.toLowerCase(), p]));
      const activeBarcodesRegistry = new Set(allDbProducts.map(p => p.barcode).filter(Boolean));

      const processedProducts: any[] = [];
      const skippedList: any[] = [];
      
      const duplicateSkusInPayload = new Set<string>();
      const duplicateBarcodesInPayload = new Set<string>();

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

        if (duplicateSkusInPayload.has(skuKey.toLowerCase())) {
          skippedList.push({ sku: skuKey, name: p.name, reason: `Duplicate SKU '${skuKey}' within import file` });
          skippedCount++;
          continue;
        }
        duplicateSkusInPayload.add(skuKey.toLowerCase());

        let barcode = p.barcode ? p.barcode.trim() : "";
        if (barcode) {
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

        if (!barcode) {
          if (autoGenerateMissing) {
            barcode = generateUniqueEan13(activeBarcodesRegistry);
            activeBarcodesRegistry.add(barcode);
            generatedCount++;
          } else {
            barcode = "";
          }
        } else {
          const isOwnBarcode = existingDbProduct && existingDbProduct.barcode === barcode;
          if (!isOwnBarcode && activeBarcodesRegistry.has(barcode)) {
            if (autoGenerateMissing) {
              const oldBarcode = barcode;
              barcode = generateUniqueEan13(activeBarcodesRegistry);
              activeBarcodesRegistry.add(barcode);
              generatedCount++;
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

      // Execute Firestore batches
      const batches: WriteBatch[] = [];
      let currentBatch = firestore.batch();
      let opCount = 0;

      for (const p of processedProducts) {
        let docRef;
        if (p.id) {
          docRef = firestore.collection("products").doc(String(p.id));
        } else {
          docRef = firestore.collection("products").doc();
        }

        const productData = {
          sku: p.sku.trim(),
          sku_lower: p.sku.trim().toLowerCase(),
          barcode: p.finalBarcode,
          name: p.name.trim(),
          name_ar: p.name_ar || '',
          brand: p.brand || '',
          category: p.category || '',
          subcategory: p.subcategory || '',
          unit: p.unit || 'pcs',
          selling_price: parseFloat(p.selling_price || '0'),
          cost_price: parseFloat(p.cost_price || '0'),
          vat: parseFloat(p.vat || '0'),
          supplier: p.supplier || '',
          stock_quantity: parseInt(p.stock_quantity || '0', 10),
          description: p.description || '',
          status: p.status || 'Active'
        };

        currentBatch.set(docRef, productData, { merge: true });
        opCount++;

        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = firestore.batch();
          opCount = 0;
        }
      }
      if (opCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

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
  app.post("/api/products/generate-missing", async (req, res) => {
    try {
      const allProductsSnap = await firestore.collection("products").get();
      const existingBarcodes = new Set(allProductsSnap.docs.map(doc => String(doc.data().barcode || "")).filter(Boolean));
      
      const missing = allProductsSnap.docs.filter(doc => {
        const data = doc.data();
        return !data.barcode || data.barcode.trim() === "";
      });
      let generated = 0;

      const batches: WriteBatch[] = [];
      let currentBatch = firestore.batch();
      let opCount = 0;

      for (const doc of missing) {
        const newBarcode = generateUniqueEan13(existingBarcodes);
        existingBarcodes.add(newBarcode);

        currentBatch.update(doc.ref, { barcode: newBarcode });
        generated++;
        opCount++;

        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = firestore.batch();
          opCount = 0;
        }
      }
      if (opCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      res.json({ message: `Successfully generated barcodes for ${generated} products.`, count: generated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Clear all products
  app.delete("/api/products", async (req, res) => {
    try {
      const snapshot = await firestore.collection("products").get();
      const batches: WriteBatch[] = [];
      let currentBatch = firestore.batch();
      let opCount = 0;

      snapshot.docs.forEach(doc => {
        currentBatch.delete(doc.ref);
        opCount++;
        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = firestore.batch();
          opCount = 0;
        }
      });
      if (opCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      res.json({ message: "All products deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get product by barcode (Scanner)
  app.get("/api/products/scan/:barcode", async (req, res) => {
    const barcode = req.params.barcode;
    try {
      const barcodeQuery = await firestore.collection("products").where("barcode", "==", barcode).get();
      if (!barcodeQuery.empty) {
        const doc = barcodeQuery.docs[0];
        res.json({ id: doc.id, ...doc.data() });
        return;
      }

      const skuQuery = await firestore.collection("products").where("sku_lower", "==", barcode.toLowerCase()).get();
      if (!skuQuery.empty) {
        const doc = skuQuery.docs[0];
        res.json({ id: doc.id, ...doc.data() });
        return;
      }

      res.status(404).json({ error: "Product not found" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CUSTOMER MODULE ENDPOINTS
  app.get("/api/customers", async (req, res) => {
    try {
      const snapshot = await firestore.collection("customers").orderBy("name", "asc").get();
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ customers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    const { name, name_ar, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Customer name is required" });
    try {
      const existing = await firestore.collection("customers").where("name_lower", "==", name.trim().toLowerCase()).get();
      if (!existing.empty) return res.status(400).json({ error: "Customer name already exists" });

      const customerData = {
        name: name.trim(),
        name_lower: name.trim().toLowerCase(),
        name_ar: name_ar || "",
        phone: phone || "",
        email: email || "",
        trn: trn || "",
        address: address || "",
        balance: parseFloat(balance || "0")
      };

      const docRef = await firestore.collection("customers").add(customerData);
      res.status(201).json({ id: docRef.id, message: "Customer created successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    const id = req.params.id;
    const { name, name_ar, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Customer name is required" });
    try {
      const docRef = firestore.collection("customers").doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Customer not found" });

      await docRef.update({
        name: name.trim(),
        name_lower: name.trim().toLowerCase(),
        name_ar: name_ar || "",
        phone: phone || "",
        email: email || "",
        trn: trn || "",
        address: address || "",
        balance: parseFloat(balance || "0")
      });
      res.json({ message: "Customer updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const docRef = firestore.collection("customers").doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Customer not found" });

      await docRef.delete();
      res.json({ message: "Customer deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SUPPLIER MODULE ENDPOINTS
  app.get("/api/suppliers", async (req, res) => {
    try {
      const snapshot = await firestore.collection("suppliers").orderBy("name", "asc").get();
      const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ suppliers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    const { name, name_ar, contact_person, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Supplier name is required" });
    try {
      const existing = await firestore.collection("suppliers").where("name_lower", "==", name.trim().toLowerCase()).get();
      if (!existing.empty) return res.status(400).json({ error: "Supplier name already exists" });

      const supplierData = {
        name: name.trim(),
        name_lower: name.trim().toLowerCase(),
        name_ar: name_ar || "",
        contact_person: contact_person || "",
        phone: phone || "",
        email: email || "",
        trn: trn || "",
        address: address || "",
        balance: parseFloat(balance || "0")
      };

      const docRef = await firestore.collection("suppliers").add(supplierData);
      res.status(201).json({ id: docRef.id, message: "Supplier created successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    const id = req.params.id;
    const { name, name_ar, contact_person, phone, email, trn, address, balance } = req.body;
    if (!name) return res.status(400).json({ error: "Supplier name is required" });
    try {
      const docRef = firestore.collection("suppliers").doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Supplier not found" });

      await docRef.update({
        name: name.trim(),
        name_lower: name.trim().toLowerCase(),
        name_ar: name_ar || "",
        contact_person: contact_person || "",
        phone: phone || "",
        email: email || "",
        trn: trn || "",
        address: address || "",
        balance: parseFloat(balance || "0")
      });
      res.json({ message: "Supplier updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const docRef = firestore.collection("suppliers").doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Supplier not found" });

      await docRef.delete();
      res.json({ message: "Supplier deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // INVOICING WORKFLOW WITH STOCK REDUCTION & CREDIT MANAGER
  app.get("/api/invoices", async (req, res) => {
    try {
      const snapshot = await firestore.collection("invoices").orderBy("created_at", "desc").get();
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ invoices });
    } catch (err: any) {
      // Fallback if ordering by created_at index fails
      try {
        const backupSnapshot = await firestore.collection("invoices").get();
        const invoices = backupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        invoices.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        res.json({ invoices });
      } catch (innerErr: any) {
        res.status(500).json({ error: innerErr.message });
      }
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const doc = await firestore.collection("invoices").doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: "Invoice not found" });
      res.json({ id: doc.id, ...doc.data() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/invoices", async (req, res) => {
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
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const invoicesTodaySnap = await firestore.collection("invoices")
        .where("date_yyyymmdd", "==", today)
        .get();
      
      const sequence = (invoicesTodaySnap.size + 1).toString().padStart(4, "0");
      const invoice_number = `INV-${today}-${sequence}`;

      const invoiceId = await firestore.runTransaction(async (transaction) => {
        // Update product stock levels
        for (const item of items) {
          const productRef = firestore.collection("products").doc(String(item.product_id));
          const productDoc = await transaction.get(productRef);
          if (productDoc.exists) {
            const currentStock = productDoc.data()?.stock_quantity || 0;
            transaction.update(productRef, { stock_quantity: currentStock - (item.quantity || 0) });
          }
        }

        // Adjust customer credit/balance if they buy on credit
        if (customer_id && payment_status !== "Paid") {
          const customerRef = firestore.collection("customers").doc(String(customer_id));
          const customerDoc = await transaction.get(customerRef);
          if (customerDoc.exists) {
            const currentBalance = customerDoc.data()?.balance || 0;
            const unpaidAmount = parseFloat(grand_total || "0");
            transaction.update(customerRef, { balance: currentBalance + unpaidAmount });
          }
        }

        // Save invoice document
        const invoiceRef = firestore.collection("invoices").doc();
        const invoiceData = {
          invoice_number,
          customer_id: customer_id || null,
          customer_name: customer_name || "Cash Customer",
          customer_trn: customer_trn || "",
          date: date || new Date().toISOString().slice(0, 10),
          date_yyyymmdd: today,
          subtotal: parseFloat(subtotal || "0"),
          discount: parseFloat(discount || "0"),
          vat_amount: parseFloat(vat_amount || "0"),
          grand_total: parseFloat(grand_total || "0"),
          payment_status: payment_status || "Paid",
          payment_method: payment_method || "Cash",
          notes: notes || "",
          items: items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            unit_price: item.unit_price,
            vat_rate: item.vat_rate || 5.0,
            vat_amount: item.vat_amount || 0,
            total_amount: item.total_amount || 0
          })),
          created_at: FieldValue.serverTimestamp()
        };

        transaction.set(invoiceRef, invoiceData);
        return invoiceRef.id;
      });

      res.status(201).json({
        id: invoiceId,
        invoice_number,
        message: "Invoice compiled, stock levels updated, and customer records written."
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const id = req.params.id;
    try {
      await firestore.runTransaction(async (transaction) => {
        const invoiceRef = firestore.collection("invoices").doc(id);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
          throw new Error("Invoice not found");
        }

        const invoice = invoiceDoc.data() || {};
        const items = invoice.items || [];

        // Revert product stock levels
        for (const item of items) {
          const productRef = firestore.collection("products").doc(String(item.product_id));
          const productDoc = await transaction.get(productRef);
          if (productDoc.exists) {
            const currentStock = productDoc.data()?.stock_quantity || 0;
            transaction.update(productRef, { stock_quantity: currentStock + (item.quantity || 0) });
          }
        }

        // Revert customer credit balance
        if (invoice.customer_id && invoice.payment_status !== "Paid") {
          const customerRef = firestore.collection("customers").doc(String(invoice.customer_id));
          const customerDoc = await transaction.get(customerRef);
          if (customerDoc.exists) {
            const currentBalance = customerDoc.data()?.balance || 0;
            transaction.update(customerRef, { balance: currentBalance - (invoice.grand_total || 0) });
          }
        }

        // Delete invoice document
        transaction.delete(invoiceRef);
      });

      res.json({ message: "Invoice removed. Product inventory stock levels and customer balance reverted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DIRECT STOCK INVENTORY UPDATER
  app.put("/api/products/:id/stock", async (req, res) => {
    const id = req.params.id;
    const { stock_quantity } = req.body;
    if (stock_quantity === undefined || isNaN(parseInt(stock_quantity, 10))) {
      return res.status(400).json({ error: "stock_quantity is required and must be an integer" });
    }
    try {
      const docRef = firestore.collection("products").doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Product not found" });

      await docRef.update({ stock_quantity: parseInt(stock_quantity, 10) });
      res.json({ stock_quantity, message: "Inventory stock updated successfully." });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
