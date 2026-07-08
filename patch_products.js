import fs from 'fs';

let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

// State variables
code = code.replace(/  const \[newNameAr, setNewNameAr\] = useState\(''\);\n/g, '');
code = code.replace(/  const \[newSubcategory, setNewSubcategory\] = useState\(''\);\n/g, '');
code = code.replace(/  const \[newDesc, setNewDesc\] = useState\(''\);\n/g, '');

// Payload properties
code = code.replace(/      name_ar: newNameAr\.trim\(\),\n/g, '');
code = code.replace(/      subcategory: newSubcategory\.trim\(\),\n/g, '');
code = code.replace(/      description: newDesc\.trim\(\),\n/g, '');
code = code.replace(/      status: 'Active'\n/g, '');

// Resetting
code = code.replace(/      setNewSubcategory\(''\);\n/g, '');
// Wait, reset states inside handleAddProduct
code = code.replace(/      setNewNameAr\(''\);\n/g, '');
code = code.replace(/      setNewDesc\(''\);\n/g, '');

// Export properties
code = code.replace(/      'Arabic Name': p\.name_ar \|\| '',\n/g, '');
code = code.replace(/      Subcategory: p\.subcategory \|\| '',\n/g, '');
code = code.replace(/      Description: p\.description \|\| '',\n/g, '');
code = code.replace(/      Status: p\.status \|\| 'Active'\n/g, '');
// wait, the trailing comma might be an issue if Status is the last. Let's look at the export fields
