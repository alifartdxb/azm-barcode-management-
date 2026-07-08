import re

with open('src/pages/Products.tsx', 'r') as f:
    code = f.read()

# Remove Arabic Name block
code = re.sub(r'<div>\s*<label className="text-sm font-medium">Arabic Name \(Optional\)<\/label>.*?<\/div>', '', code, flags=re.DOTALL)
# Remove Item Description block
code = re.sub(r'<div>\s*<label className="text-sm font-medium">Item Description<\/label>.*?<\/div>', '', code, flags=re.DOTALL)
# Remove Sub-Category block
code = re.sub(r'<div>\s*<label className="text-sm font-medium">Sub-Category<\/label>.*?<\/div>', '', code, flags=re.DOTALL)

with open('src/pages/Products.tsx', 'w') as f:
    f.write(code)
