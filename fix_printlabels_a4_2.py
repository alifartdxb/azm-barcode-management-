import re

with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

code = code.replace("                        </div>\n                ))\n              ) : (", "                        </div>\n                      );\n                    })}\n                  </div>\n                ))\n              ) : (")

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
