import fs from 'fs';

let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

code = code.replace(/              name_ar: getVal\(row\.name_ar.*?\n/g, '');
code = code.replace(/              subcategory: getVal\(row\.subcategory.*?\n/g, '');
code = code.replace(/              description: getVal\(row\.description.*?\n/g, '');
code = code.replace(/              status: getVal\(row\.status.*?\n/g, '');

code = code.replace(/      name_ar: newNameAr.trim\(\),\n/g, '');
code = code.replace(/      subcategory: newSubcategory.trim\(\),\n/g, '');
code = code.replace(/      description: newDesc.trim\(\),\n/g, '');
code = code.replace(/      status: 'Active'\n/g, '');

// Also remove the UI blocks
code = code.replace(/\{p\.name_ar && <span className="text-xs text-muted-foreground mt-0\.5">\{p\.name_ar\}<\/span>\}/g, '');

// Remove labels and inputs from Add form:
// We need to just use regex to strip out those blocks. Or manually string replace.
// Let's do it simply
fs.writeFileSync('src/pages/Products.tsx', code);
