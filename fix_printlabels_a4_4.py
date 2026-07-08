with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

target = "                        </div>\n\n                ))\n              ) : ("
replacement = """                        </div>
                      );
                    })}
                  </div>
                ))
              ) : ("""

code = code.replace(target, replacement)

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
