import fs from 'fs';
let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

code = code.replace(/  const \[newNameAr, setNewNameAr\] = useState\(''\);\n/g, '');
code = code.replace(/  const \[newSubcategory, setNewSubcategory\] = useState\(''\);\n/g, '');
code = code.replace(/  const \[newDesc, setNewDesc\] = useState\(''\);\n/g, '');
code = code.replace(/      setNewSubcategory\(''\);\n/g, '');

code = code.replace(/              <label className="text-sm font-medium">Arabic Name \(Optional\)<\/label>\n              <Input\n                type="text"\n                value=\{newNameAr\}\n                onChange=\{\(e\) => setNewNameAr\(e\.target\.value\)\}\n                placeholder="Arabic name"\n              \/>\n/g, '');

code = code.replace(/              <label className="text-sm font-medium">Item Description<\/label>\n              <Input\n                type="text"\n                value=\{newDesc\}\n                onChange=\{\(e\) => setNewDesc\(e\.target\.value\)\}\n                placeholder="Short description"\n              \/>\n/g, '');

code = code.replace(/              <label className="text-sm font-medium">Sub-Category<\/label>\n              <Input\n                type="text"\n                value=\{newSubcategory\}\n                onChange=\{\(e\) => setNewSubcategory\(e\.target\.value\)\}\n                placeholder="e.g. Cables"\n              \/>\n/g, '');


fs.writeFileSync('src/pages/Products.tsx', code);
