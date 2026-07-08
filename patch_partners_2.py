import re

with open('src/pages/Partners.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'<div>\s*<label className="block text-\[10px\] font-bold uppercase text-gray-500 mb-1">Arabic translation name \(optional\)<\/label>.*?<\/div>', '', code, flags=re.DOTALL)
code = code.replace("  const [formNameAr, setFormNameAr] = useState('');\n", "")

with open('src/pages/Partners.tsx', 'w') as f:
    f.write(code)
