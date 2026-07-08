import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import Settings from './pages/Settings';", "import Settings from './pages/Settings';\nimport Backup from './pages/Backup';");
code = code.replace('<Route path="/settings" element={<Settings />} />', '<Route path="/settings" element={<Settings />} />\n        <Route path="/backup" element={<Backup />} />');

fs.writeFileSync('src/App.tsx', code);
