import re

with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

# Remove QTY: 1
code = re.sub(r'<span>QTY: 1<\/span>', '', code)
# Replace showArabic state and its checkbox
code = code.replace("  const [showArabic, setShowArabic] = useState(true);\n", "")
code = re.sub(r'<label className="flex items-center gap-2 cursor-pointer border p-2 rounded-md hover:bg-gray-50">\s*<input\s*type="checkbox"\s*checked=\{showArabic\}[\s\S]*?Arabic Title Name \(name_ar\)\s*<\/span>\s*<\/label>', '', code)
# Also need to remove the rendering of Arabic names in the templates
code = re.sub(r'\{showArabic && product\.name_ar && \([\s\S]*?\}\)', '', code)
code = re.sub(r'onChange=\{\(e\) => setShowArabic\(e\.target\.checked\)\}', '', code) # just in case

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
