with open('index.html', 'r') as f:
    code = f.read()

code = code.replace("<title>My Google AI Studio App</title>", "<title>AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.) - ERP</title>")

with open('index.html', 'w') as f:
    f.write(code)
