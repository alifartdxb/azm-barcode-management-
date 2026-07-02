import {
  localGetProducts,
  localSaveProduct,
  localClearAllProducts,
  localGenerateMissingBarcodes,
  localUpdateProductStock,
  localGetCustomers,
  localSaveCustomer,
  localDeleteCustomer,
  localGetSuppliers,
  localSaveSupplier,
  localDeleteSupplier,
  localGetInvoices,
  localGetInvoiceById,
  localSaveInvoice,
  localDeleteInvoice,
  localGetDashboardStats
} from './localDb';

// Check if we should force local IndexedDB mode (e.g. on GitHub Pages)
const isStaticOrOffline = 
  window.location.hostname.includes('github.io') || 
  window.location.hostname.includes('localhost') === false || 
  window.location.href.includes('github') ||
  process.env.NODE_ENV === 'production';

// Keep the original fetch
const originalFetch = window.fetch;

// Helper to construct a mock response
function mockResponse(data: any, status = 200, statusText = 'OK'): Response {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return new Response(blob, {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Global fetch interceptor
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // We only intercept API routes
  if (urlString.includes('/api/')) {
    const parsedUrl = new URL(urlString, window.location.origin);
    const pathname = parsedUrl.pathname;
    const method = init?.method?.toUpperCase() || 'GET';

    const handleLocal = async (): Promise<Response> => {
      try {
        console.warn(`[LocalDB Interceptor] Routing ${method} ${pathname} to client-side IndexedDB`);

        // Route: GET /api/products
        if (pathname === '/api/products' && method === 'GET') {
          const products = await localGetProducts();
          return mockResponse({ products });
        }

        // Route: POST /api/products
        if (pathname === '/api/products' && method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          const saved = await localSaveProduct(body);
          return mockResponse({ message: 'Product created successfully', id: saved.id, barcode: saved.barcode }, 211);
        }

        // Route: DELETE /api/products
        if (pathname === '/api/products' && method === 'DELETE') {
          await localClearAllProducts();
          return mockResponse({ message: 'All products deleted' });
        }

        // Route: POST /api/products/generate-missing
        if (pathname === '/api/products/generate-missing' && method === 'POST') {
          const count = await localGenerateMissingBarcodes();
          return mockResponse({ message: `Successfully generated barcodes for ${count} products.`, count });
        }

        // Route: PUT /api/products/:id/stock
        if (pathname.startsWith('/api/products/') && pathname.endsWith('/stock') && method === 'PUT') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          const body = JSON.parse(init?.body as string || '{}');
          await localUpdateProductStock(id, parseInt(body.stock_quantity, 10) || 0);
          return mockResponse({ stock_quantity: body.stock_quantity, message: 'Inventory stock updated successfully.' });
        }

        // Route: GET /api/products/scan/:barcode
        if (pathname.startsWith('/api/products/scan/') && method === 'GET') {
          const parts = pathname.split('/');
          const barcodeOrSku = decodeURIComponent(parts[4]).toLowerCase();
          const products = await localGetProducts();
          const found = products.find(p => p.barcode?.toLowerCase() === barcodeOrSku || p.sku?.toLowerCase() === barcodeOrSku);
          if (found) {
            return mockResponse(found);
          } else {
            return mockResponse({ error: 'Product not found' }, 404, 'Not Found');
          }
        }

        // Route: GET /api/customers
        if (pathname === '/api/customers' && method === 'GET') {
          const customers = await localGetCustomers();
          return mockResponse({ customers });
        }

        // Route: POST /api/customers
        if (pathname === '/api/customers' && method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          // Check uniqueness
          const customers = await localGetCustomers();
          const exists = customers.some(c => c.name.toLowerCase() === body.name?.trim().toLowerCase());
          if (exists) {
            return mockResponse({ error: 'Customer name already exists' }, 400, 'Bad Request');
          }
          const id = customers.reduce((max, c) => (c.id > max ? c.id : max), 0) + 1;
          const newCustomer = { ...body, id, balance: parseFloat(body.balance || '0') };
          await localSaveCustomer(newCustomer);
          return mockResponse({ id, message: 'Customer created successfully' }, 201);
        }

        // Route: PUT /api/customers/:id
        if (pathname.startsWith('/api/customers/') && method === 'PUT') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          const body = JSON.parse(init?.body as string || '{}');
          await localSaveCustomer({ ...body, id });
          return mockResponse({ message: 'Customer updated successfully' });
        }

        // Route: DELETE /api/customers/:id
        if (pathname.startsWith('/api/customers/') && method === 'DELETE') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          await localDeleteCustomer(id);
          return mockResponse({ message: 'Customer deleted successfully' });
        }

        // Route: GET /api/suppliers
        if (pathname === '/api/suppliers' && method === 'GET') {
          const suppliers = await localGetSuppliers();
          return mockResponse({ suppliers });
        }

        // Route: POST /api/suppliers
        if (pathname === '/api/suppliers' && method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          // Check uniqueness
          const suppliers = await localGetSuppliers();
          const exists = suppliers.some(s => s.name.toLowerCase() === body.name?.trim().toLowerCase());
          if (exists) {
            return mockResponse({ error: 'Supplier name already exists' }, 400, 'Bad Request');
          }
          const id = suppliers.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
          const newSupplier = { ...body, id, balance: parseFloat(body.balance || '0') };
          await localSaveSupplier(newSupplier);
          return mockResponse({ id, message: 'Supplier created successfully' }, 201);
        }

        // Route: PUT /api/suppliers/:id
        if (pathname.startsWith('/api/suppliers/') && method === 'PUT') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          const body = JSON.parse(init?.body as string || '{}');
          await localSaveSupplier({ ...body, id });
          return mockResponse({ message: 'Supplier updated successfully' });
        }

        // Route: DELETE /api/suppliers/:id
        if (pathname.startsWith('/api/suppliers/') && method === 'DELETE') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          await localDeleteSupplier(id);
          return mockResponse({ message: 'Supplier deleted successfully' });
        }

        // Route: GET /api/invoices
        if (pathname === '/api/invoices' && method === 'GET') {
          const invoices = await localGetInvoices();
          return mockResponse({ invoices });
        }

        // Route: GET /api/invoices/:id
        if (pathname.startsWith('/api/invoices/') && method === 'GET') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          const invoice = await localGetInvoiceById(id);
          if (invoice) {
            return mockResponse(invoice);
          } else {
            return mockResponse({ error: 'Invoice not found' }, 404, 'Not Found');
          }
        }

        // Route: POST /api/invoices
        if (pathname === '/api/invoices' && method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          const saved = await localSaveInvoice(body);
          return mockResponse({
            id: saved.id,
            invoice_number: saved.invoice_number,
            message: 'Invoice compiled, stock levels updated, and customer records written.'
          }, 201);
        }

        // Route: DELETE /api/invoices/:id
        if (pathname.startsWith('/api/invoices/') && method === 'DELETE') {
          const parts = pathname.split('/');
          const id = parseInt(parts[3], 10);
          await localDeleteInvoice(id);
          return mockResponse({ message: 'Invoice removed and inventory stock levels reverted.' });
        }

        // Route: GET /api/dashboard
        if (pathname === '/api/dashboard' && method === 'GET') {
          const stats = await localGetDashboardStats();
          return mockResponse(stats);
        }

        return mockResponse({ error: 'Endpoint not supported locally' }, 404);
      } catch (localErr: any) {
        console.error('[LocalDB Interceptor Error]', localErr);
        return mockResponse({ error: localErr.message || 'IndexedDB processing error' }, 500);
      }
    };

    // If we're on a static host like GitHub Pages, bypass live requests completely and run entirely locally
    if (isStaticOrOffline) {
      return handleLocal();
    }

    // Try live server first. If it fails or returns an HTML document (unmatched fallback page), route to IndexedDB
    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      
      // If the response is index.html from static server/vite fallback, or it is a 404 page
      if (response.status === 404 || contentType.includes('text/html')) {
        return await handleLocal();
      }

      return response;
    } catch (networkError) {
      console.warn('Network error, falling back to local client database', networkError);
      return await handleLocal();
    }
  }

  return originalFetch(input, init);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn('[fetchInterceptor] Object.defineProperty(window, "fetch") failed, falling back to direct assignment on globalThis', e);
  try {
    (globalThis as any).fetch = customFetch;
  } catch (e2) {
    console.error('[fetchInterceptor] All fallback attempts to override fetch failed', e2);
  }
}
