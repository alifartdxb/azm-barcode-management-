import fs from 'fs';

let code = fs.readFileSync('src/utils/localDb.ts', 'utf8');

code = code.replace(/          name_ar: p\.name_ar !== undefined \? String\(p\.name_ar\)\.trim\(\) : existingItem\.name_ar,\n/g, '');
code = code.replace(/          subcategory: p\.subcategory !== undefined \? String\(p\.subcategory\)\.trim\(\) : existingItem\.subcategory,\n/g, '');
code = code.replace(/          description: p\.description !== undefined \? String\(p\.description\)\.trim\(\) : existingItem\.description,\n/g, '');
code = code.replace(/          status: p\.status !== undefined \? String\(p\.status\)\.trim\(\) : existingItem\.status,\n/g, '');

code = code.replace(/          name_ar: p\.name_ar \? String\(p\.name_ar\)\.trim\(\) : '',\n/g, '');
code = code.replace(/          subcategory: p\.subcategory \? String\(p\.subcategory\)\.trim\(\) : '',\n/g, '');
code = code.replace(/          description: p\.description \? String\(p\.description\)\.trim\(\) : '',\n/g, '');
code = code.replace(/          status: p\.status \? String\(p\.status\)\.trim\(\) : 'Active',\n/g, '');

fs.writeFileSync('src/utils/localDb.ts', code);
