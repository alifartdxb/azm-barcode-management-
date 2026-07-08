import re

with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'<label className="flex items-center gap-1\.5 font-bold text-\[10px\] uppercase">\s*<input\s*type="checkbox"\s*checked=\{showArabic\}[\s\S]*?Arabic Title Name \(name_ar\)\s*<\/label>', '', code)
code = re.sub(r'\{showArabic && product\.name_ar && \([\s\S]*?\}\)', '', code)

# Let me just check if there is any name_ar in PrintLabels.tsx
# The easiest way is to just remove name_ar entirely from PrintLabels.tsx
code = re.sub(r'\{showArabic && product\.name_ar && \([\s\S]*?\}\)', '', code)
# wait, there's another occurrence of showArabic?

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
