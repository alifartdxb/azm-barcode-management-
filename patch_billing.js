import fs from 'fs';

let code = fs.readFileSync('src/pages/Billing.tsx', 'utf8');

code = code.replace(/\{p\.name_ar && <span className="text-gray-500 font-sans mr-2"> \/ \{p\.name_ar\}<\/span>\}/g, '');
code = code.replace(/\{item\.product\.name_ar && \(\s*<div className="text-\[10px\] text-gray-500 font-sans truncate" direction="rtl">\{item\.product\.name_ar\}<\/div>\s*\)\}/g, '');
code = code.replace(/\{selectedCustomer\.name_ar && <div>Arabic: \{selectedCustomer\.name_ar\}<\/div>\}/g, '');
code = code.replace(/name_ar: newCustNameAr\.trim\(\),/g, '');

fs.writeFileSync('src/pages/Billing.tsx', code);
