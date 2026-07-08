import re

with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'\{showArabic && product\.name_ar && \(\s*<div[\s\S]*?<\/div>\s*\)\}', '', code)

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
