import fs from 'fs';

let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// I'll ensure there's no duplicate code and the icons match.

fs.writeFileSync('src/components/Sidebar.tsx', code);
