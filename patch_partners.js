import fs from 'fs';

let code = fs.readFileSync('src/pages/Partners.tsx', 'utf8');

code = code.replace(/setFormNameAr\(partner\.name_ar \|\| ''\);\n/g, '');
code = code.replace(/name_ar: formNameAr\.trim\(\),\n/g, '');
code = code.replace(/\(c\.name_ar && c\.name_ar\.includes\(searchQuery\)\) \|\|\n/g, '');
code = code.replace(/\(s\.name_ar && s\.name_ar\.includes\(searchQuery\)\) \|\|\n/g, '');
code = code.replace(/\{c\.name_ar && <span className="text-\[10px\] text-gray-500 font-sans">\{c\.name_ar\}<\/span>\}/g, '');
code = code.replace(/\{s\.name_ar && <span className="text-\[10px\] text-gray-500 font-sans">\{s\.name_ar\}<\/span>\}/g, '');

fs.writeFileSync('src/pages/Partners.tsx', code);
