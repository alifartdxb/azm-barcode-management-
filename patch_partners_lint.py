with open('src/pages/Partners.tsx', 'r') as f:
    code = f.read()
code = code.replace("    setFormNameAr('');\n", "")
with open('src/pages/Partners.tsx', 'w') as f:
    f.write(code)
