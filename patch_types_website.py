import re

with open('src/types.ts', 'r') as f:
    code = f.read()

if "company_website?: string;" not in code:
    code = code.replace("company_email?: string;", "company_email?: string;\n  company_website?: string;")

with open('src/types.ts', 'w') as f:
    f.write(code)
