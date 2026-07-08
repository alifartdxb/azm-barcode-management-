import re

with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'\{showArabic && product\.name_ar && \([\s\S]*?\}\)\}', '', code)
# Also remove the Arabic Font Size settings
code = re.sub(r'<div className="flex items-center gap-1">\s*<span className="text-\[9px\] text-gray-400">Font:<\/span>\s*<input\s*type="number"[\s\S]*?<\/div>', '', code)
code = code.replace("  const [arabicFontSize, setArabicFontSize] = useState(8);\n", "")

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
