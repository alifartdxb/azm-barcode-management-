import fs from 'fs';

let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

code = code.replace(/      { field: 'Arabic Name', keys: \['name_ar', 'arabic_name', 'arabic name'\] },\n/g, '');
code = code.replace(/      { field: 'Subcategory', keys: \['subcategory', 'Subcategory'\] },\n/g, '');
code = code.replace(/      { field: 'Description', keys: \['description', 'Description'\] }\n/g, '');

fs.writeFileSync('src/pages/Products.tsx', code);
