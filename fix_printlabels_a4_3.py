import re

with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'                        <\/div>\s*\}\)\s*\}\s*<\/div>\s*\)\)\s*\)\s*:\s*\(', r'                        </div>\n                      );\n                    })}\n                  </div>\n                ))\n              ) : (', code)
# wait, wait. The current content is literally:
#                        </div>
#                ))
#              ) : (
# let's just use string replacement on that exact match.

code = code.replace("                        </div>\n                ))\n              ) : (", "                        </div>\n                      );\n                    })}\n                  </div>\n                ))\n              ) : (")

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
