import re

with open('src/components/Sidebar.tsx', 'r') as f:
    code = f.read()

code = code.replace("Enterprise ERP", "AL Zahra Al Malakia")
code = code.replace("AZM", "AZM")

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(code)
