// Client-side barcode validation and helper utilities

// Calculate EAN-13 Check Digit
export function getEan13CheckDigit(code12: string): string {
  if (code12.length !== 12 || !/^\d+$/.test(code12)) return '';
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const val = parseInt(code12[i], 10);
    sum += (i % 2 === 0) ? val : val * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}

// Generate valid EAN-13 code with local store prefix '201'
export function generateLocalEan13(existingBarcodes: Set<string> | string[]): string {
  const barcodeSet = Array.isArray(existingBarcodes) ? new Set(existingBarcodes) : existingBarcodes;
  let attempt = 0;
  while (attempt < 1000) {
    const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
    const code12 = '201' + random9;
    const checkDigit = getEan13CheckDigit(code12);
    const barcode = code12 + checkDigit;
    if (!barcodeSet.has(barcode)) {
      return barcode;
    }
    attempt++;
  }
  return '201' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Full validation report for any input barcode string
export interface BarcodeValidationResult {
  isValid: boolean;
  type: 'EAN-13' | 'UPC-A' | 'CODE-128' | 'INVALID';
  errorMessage?: string;
}

export function validateBarcode(barcode: string): BarcodeValidationResult {
  const trimmed = (barcode || '').trim();
  if (!trimmed) {
    return { isValid: false, type: 'INVALID', errorMessage: 'Barcode cannot be empty.' };
  }

  // Check printable ASCII (for Code 128)
  if (!/^[\x20-\x7E]+$/.test(trimmed)) {
    return { isValid: false, type: 'INVALID', errorMessage: 'Contains invalid characters (only printable ASCII is supported).' };
  }

  // Check EAN-13
  if (/^\d{13}$/.test(trimmed)) {
    const digits12 = trimmed.slice(0, 12);
    const checkDigit = trimmed[12];
    const expected = getEan13CheckDigit(digits12);
    if (expected === checkDigit) {
      return { isValid: true, type: 'EAN-13' };
    } else {
      return { 
        isValid: false, 
        type: 'INVALID', 
        errorMessage: `EAN-13 Check Digit mismatch. Expected ${expected}, got ${checkDigit}.` 
      };
    }
  }

  // Check UPC-A
  if (/^\d{12}$/.test(trimmed)) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const val = parseInt(trimmed[i], 10);
      sum += (i % 2 === 0) ? val * 3 : val;
    }
    const expectedCheck = ((10 - (sum % 10)) % 10).toString();
    const checkDigit = trimmed[11];
    if (expectedCheck === checkDigit) {
      return { isValid: true, type: 'UPC-A' };
    } else {
      return { 
        isValid: false, 
        type: 'INVALID', 
        errorMessage: `UPC-A Check Digit mismatch. Expected ${expectedCheck}, got ${checkDigit}.` 
      };
    }
  }

  // Code 128 (printable ASCII between 3 and 40 characters is standard/recommended)
  if (trimmed.length >= 3 && trimmed.length <= 40) {
    return { isValid: true, type: 'CODE-128' };
  }

  return { 
    isValid: false, 
    type: 'INVALID', 
    errorMessage: 'Barcode length is unsupported. Must be 13 digits (EAN-13), 12 digits (UPC-A), or 3-40 chars (Code 128).' 
  };
}
