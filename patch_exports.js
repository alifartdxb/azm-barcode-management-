import fs from 'fs';

let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

code = code.replace(/      'Arabic Name': p\.name_ar \|\| '',\n/g, '');
code = code.replace(/      Subcategory: p\.subcategory \|\| '',\n/g, '');
code = code.replace(/      Description: p\.description \|\| '',\n/g, '');
code = code.replace(/      Status: p\.status \|\| 'Active'\n/g, '');

fs.writeFileSync('src/pages/Products.tsx', code);
