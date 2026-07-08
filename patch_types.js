import fs from 'fs';

let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/  name_ar\?: string;\n/g, '');
code = code.replace(/  subcategory\?: string;\n/g, '');
code = code.replace(/  description\?: string;\n/g, '');
code = code.replace(/  status: string; \/\/ 'Active', 'Inactive'\n/g, '');

fs.writeFileSync('src/types.ts', code);
