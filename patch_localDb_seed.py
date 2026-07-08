import re

with open('src/utils/localDb.ts', 'r') as f:
    code = f.read()

code = code.replace("cash@alrehab.com", "cash@alzahrabm.com")
code = code.replace("Deira, Dubai, UAE", "Industrial Area, Al Sajaa, Sharjah, U.A.E.")

with open('src/utils/localDb.ts', 'w') as f:
    f.write(code)
