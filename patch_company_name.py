import re
import glob
import os

files_to_process = []
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            files_to_process.append(os.path.join(root, file))

for filepath in files_to_process:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if "AL REHAB BUILDING MATERIALS" in content:
        content = content.replace("AL REHAB BUILDING MATERIALS", "AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)")
        with open(filepath, 'w') as f:
            f.write(content)
