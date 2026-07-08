with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

code = code.replace("                                }\n                  </div>", "                  </div>")
code = code.replace("                )}\n\n              </div>", "                )\n\n              </div>")

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
