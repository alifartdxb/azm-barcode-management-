import re

with open('src/pages/Products.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'<div className="space-y-1\.5">\s*<label className="text-sm font-medium">Arabic Name \(Optional\)<\/label>.*?<\/div>', '', code, flags=re.DOTALL)
code = re.sub(r'<div className="space-y-1\.5">\s*<label className="text-sm font-medium">Item Description<\/label>.*?<\/div>', '', code, flags=re.DOTALL)
code = re.sub(r'<div className="space-y-1\.5">\s*<label className="text-sm font-medium">Sub-Category<\/label>.*?<\/div>', '', code, flags=re.DOTALL)

code = code.replace("      setNewNameAr('');\n", "")
code = code.replace("      setNewDesc('');\n", "")

with open('src/pages/Products.tsx', 'w') as f:
    f.write(code)
