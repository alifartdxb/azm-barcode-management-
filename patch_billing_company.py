import re

with open('src/pages/Billing.tsx', 'r') as f:
    code = f.read()

# For A4 Layout
code = code.replace("Deira, Dubai, United Arab Emirates (UAE)<br />", "Industrial Area, Al Sajaa, Sharjah, U.A.E.<br />")
code = code.replace("Phone: +971 4 223 3445 | Email: billing@alrehab.ae<br />", "Phone: +971 52 684 3809 | Email: sales@alzahrabm.com<br />")
code = code.replace("<strong>TRN: 100234567800003</strong>", "<strong>TRN: 100259942900003</strong>")

# For Thermal 80mm layout
code = code.replace("<span className=\"text-[9px] block\">Deira, Dubai, UAE</span>", "<span className=\"text-[9px] block\">Industrial Area, Al Sajaa, Sharjah, U.A.E.</span>")
code = code.replace("<span className=\"text-[9px] block\">Tel: +971 4 223 3445</span>", "<span className=\"text-[9px] block\">Tel: +971 52 684 3809</span>")
code = code.replace("<strong className=\"text-[9px] block\">TRN: 100234567800003</strong>", "<strong className=\"text-[9px] block\">TRN: 100259942900003</strong>")

# Check if there's any other "AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)" string that needs replacing
# Since I already patched AL REHAB BUILDING MATERIALS to AL Zahra...

with open('src/pages/Billing.tsx', 'w') as f:
    f.write(code)
