import { db } from '../db/db';

let cachedCurrency = 'AED';

// Prefetch default currency
db.settings.get(1).then(s => {
  if (s && s.currency) {
    cachedCurrency = s.currency;
  }
});

// Allow updating the cache immediately when settings change
export function updateCachedCurrency(symbol: string) {
  cachedCurrency = symbol;
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0') || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${cachedCurrency} ${formatted}`;
}

export function getCurrencySymbol(): string {
  return cachedCurrency;
}
