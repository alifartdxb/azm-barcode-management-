import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { Product } from '../types';
import { 
  Home, ArrowLeft, Search, HelpCircle, PhoneCall, 
  Package, AlertTriangle, ShieldAlert, Check, X 
} from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [searching, setSearching] = useState(false);

  // Set document title and meta robots to prevent indexing
  useEffect(() => {
    document.title = '404 | Page Not Found';
    
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Quick search handler on the local database
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const q = val.toLowerCase();
      // Fast index scan on Dexie products
      const results = await db.products
        .filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.sku.toLowerCase().includes(q) || 
          p.barcode.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        )
        .limit(5)
        .toArray();
      
      setSearchResults(results);
    } catch (err) {
      console.error('Dexie 404 search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Navigate to product and select/search it
  const handleProductClick = (sku: string) => {
    // Navigate to products and pass SKU for search highlighting
    navigate(`/products?search=${encodeURIComponent(sku)}`);
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between text-foreground select-none">
      
      {/* 404 HEADER WITH COMPANY BRANDING */}
      <header className="w-full bg-card border-b border-brand-line px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0 shadow-md">
            <span className="text-primary-foreground font-black tracking-tighter text-sm">AZM</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-brand-ink">
              AL ZAHRA AL MALAKIA
            </span>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest leading-none">
              Bldg. Mat. Tr. LLC (Shj. Br.)
            </span>
          </div>
        </div>
        <div className="text-[10px] font-mono font-bold bg-muted text-muted-foreground px-2 py-1 rounded border border-brand-line">
          ERROR_CODE: 404_NOT_FOUND
        </div>
      </header>

      {/* CENTER STAGE */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl bg-card border border-brand-line shadow-[0_15px_30px_rgba(15,70,107,0.08)] rounded-xl overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT: ANIMATED BARCODE SCANNER ART */}
          <div className="md:w-5/12 bg-muted/30 border-b md:border-b-0 md:border-r border-brand-line p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-2 left-2 text-[9px] font-mono text-muted-foreground font-bold uppercase select-none opacity-40">
              SYS.DIAGNOSTICS
            </div>
            
            {/* Hologram Circle */}
            <div className="absolute inset-0 m-auto w-32 h-32 rounded-full border border-dashed border-primary/10 animate-spin" style={{ animationDuration: '40s' }} />

            {/* BARCODE VECTOR WITH SCANNING LASER */}
            <div className="relative flex flex-col items-center justify-center py-6">
              
              {/* Barcode representation */}
              <div className="flex items-end gap-[2px] h-28 px-4 py-2 bg-white border border-brand-line rounded shadow-sm relative z-10 transition-transform duration-300 hover:scale-105">
                <div className="w-1.5 h-full bg-brand-ink"></div>
                <div className="w-[1px] h-full bg-brand-ink"></div>
                <div className="w-[3px] h-full bg-brand-ink"></div>
                <div className="w-[1px] h-full bg-brand-ink"></div>
                <div className="w-1 h-full bg-brand-ink opacity-30"></div>
                <div className="w-1.5 h-full bg-brand-ink"></div>
                <div className="w-[1px] h-[85%] bg-brand-ink"></div>
                <div className="w-2 h-[85%] bg-brand-ink"></div>
                <div className="w-[1px] h-[85%] bg-brand-ink"></div>
                <div className="w-1 h-[85%] bg-brand-ink"></div>
                <div className="w-1.5 h-full bg-brand-ink"></div>
                <div className="w-[1px] h-full bg-brand-ink"></div>
                <div className="w-[3px] h-full bg-brand-ink"></div>
                <div className="w-1 h-full bg-brand-ink"></div>
                
                {/* Simulated 404 sequence */}
                <div className="absolute bottom-1 left-0 right-0 text-center font-mono text-[9px] font-bold text-brand-ink tracking-[0.25em] bg-white pt-0.5">
                  404_PAGE
                </div>
              </div>

              {/* Animated scanning laser line */}
              <div className="absolute left-0 right-0 h-[3px] bg-red-500 shadow-[0_0_12px_#ef4444] z-20 animate-[scan_3.5s_infinite_ease-in-out]"></div>
            </div>

            {/* Diagnostic readout */}
            <div className="mt-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-[10px] text-red-600 font-mono font-extrabold uppercase rounded">
                <ShieldAlert className="w-3.5 h-3.5" />
                ROUTE_UNRESOLVED
              </div>
            </div>
          </div>

          {/* RIGHT: ERROR EXPLANATION & ACTIONS */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-black text-brand-ink tracking-tight font-mono">
                  404
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  Oops! Page Not Found
                </h1>
              </div>

              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>
                  The page you are looking for may have been moved, deleted, or the URL address could be incorrect.
                </p>
                <p className="text-[11px] font-semibold text-brand-accent uppercase tracking-wider">
                  Please verify the address or use the professional navigation helpers below.
                </p>
              </div>

              {/* INTEGRATED DIRECT PRODUCTS SEARCH */}
              <div className="pt-2">
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Quick ERP Search (SKU, Name, Barcode)..."
                    className="w-full pl-9 pr-8 py-2 border border-brand-line rounded-md text-xs bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground font-medium"
                    aria-label="Quick database search"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Instant DB results */}
                {searchResults.length > 0 && (
                  <div className="mt-1.5 border border-brand-line bg-card rounded-md shadow-lg divide-y divide-brand-line max-h-48 overflow-auto animate-in fade-in slide-in-from-top-1 duration-150 z-30 relative">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleProductClick(p.sku)}
                        className="p-2.5 hover:bg-muted cursor-pointer transition-colors flex items-center justify-between text-[11px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground truncate">{p.name}</div>
                          <div className="font-mono text-muted-foreground text-[9px] flex items-center gap-2">
                            <span>SKU: {p.sku}</span>
                            {p.barcode && <span>• BC: {p.barcode}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono font-bold bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 rounded border border-primary/10 ml-2">
                          AED {p.selling_price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
                  <div className="mt-1 p-2 bg-muted/40 border border-brand-line rounded text-center text-[10px] text-muted-foreground font-medium">
                    No products matched your search.
                  </div>
                )}
              </div>
            </div>

            {/* BUTTON CONTROLS GRID */}
            <div className="mt-6 pt-4 border-t border-brand-line grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all text-xs font-bold py-2.5 px-4 rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
              
              <button
                onClick={handleGoBack}
                className="w-full bg-card hover:bg-muted border border-brand-line text-foreground active:scale-[0.98] transition-all text-xs font-bold py-2.5 px-4 rounded-md flex items-center justify-center gap-2 cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>

              <button
                onClick={() => setShowSupportModal(true)}
                className="col-span-2 w-full bg-muted/60 hover:bg-muted border border-dashed border-brand-line text-brand-ink transition-all text-xs font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Contact Administrator / Support
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* SUPPORT & CONTACT MODAL */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-brand-line shadow-2xl rounded-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-brand-line bg-brand-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-ink" />
                <h3 className="font-extrabold text-sm uppercase text-brand-ink">
                  ERP Administrator Support
                </h3>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs text-muted-foreground leading-relaxed">
                If you encounter missing menus, unexpected navigation breaks, or require specialized role clearance, please connect directly with the AL Zahra operations desk.
              </div>

              <div className="space-y-2.5 font-mono text-[11px] bg-muted/40 p-3.5 rounded-lg border border-brand-line">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">COMPANY:</span>
                  <span className="font-bold text-foreground">AL Zahra Bldg. Mat.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">SUPPORT PHONE:</span>
                  <a href="tel:+971526843809" className="font-bold text-brand-ink underline">+971 52 684 3809</a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">EMAIL:</span>
                  <a href="mailto:sales@alzahrabm.com" className="font-bold text-brand-ink underline">sales@alzahrabm.com</a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">TRN REGISTERED:</span>
                  <span className="font-semibold text-foreground">100259942900003</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">LOCATION:</span>
                  <span className="font-semibold text-foreground text-right max-w-[200px]">Al Sajaa, Sharjah, UAE</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-brand-header border-t border-brand-line flex justify-end">
              <button
                onClick={() => setShowSupportModal(false)}
                className="bg-brand-ink text-white hover:bg-opacity-95 text-xs font-bold py-2 px-5 rounded cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 404 FOOTER */}
      <footer className="w-full h-8 bg-brand-ink text-white/90 border-t-2 border-brand-line flex items-center justify-between px-4 font-mono text-[9px] shrink-0">
        <div>© 2026 AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)</div>
        <div className="hidden sm:block">ALL RIGHTS RESERVED</div>
      </footer>

      {/* Custom Keyframe animation inject */}
      <style>{`
        @keyframes scan {
          0%, 100% {
            top: 15%;
            opacity: 0.8;
          }
          50% {
            top: 75%;
            opacity: 1;
          }
        }
      `}</style>

    </div>
  );
}
