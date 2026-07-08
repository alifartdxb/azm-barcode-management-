import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import Backup from './pages/Backup';", "import Backup from './pages/Backup';\nimport Logs from './pages/Logs';");
code = code.replace('<Route path="/backup" element={<Backup />} />', '<Route path="/backup" element={<Backup />} />\n        <Route path="/logs" element={<Logs />} />');

fs.writeFileSync('src/App.tsx', code);
