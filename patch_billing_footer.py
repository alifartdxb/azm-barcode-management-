import re

with open('src/pages/Billing.tsx', 'r') as f:
    code = f.read()

footer = """                  </div>

                  {/* Professional Footer */}
                  <div className="text-center mt-auto pt-4 text-[10px] text-gray-500 font-sans">
                    © 2026 AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)<br />
                    All Rights Reserved.
                  </div>
"""

code = code.replace("                  </div>\n                </div>\n              ) : (", footer + "                </div>\n              ) : (")

with open('src/pages/Billing.tsx', 'w') as f:
    f.write(code)
