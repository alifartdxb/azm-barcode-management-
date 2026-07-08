import re

with open('src/pages/Products.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'<div className="space-y-1\.5 pb-4">\s*<label className="text-sm font-medium">Item Description<\/label>.*?<\/div>', '', code, flags=re.DOTALL)

with open('src/pages/Products.tsx', 'w') as f:
    f.write(code)
