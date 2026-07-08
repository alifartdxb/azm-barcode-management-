import fs from 'fs';

let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const replacement = `<div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, <strong>Admin</strong>. Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center space-x-2">`;

code = code.replace(/<div className="flex items-center justify-between space-y-2">\s*<h2 className="text-3xl font-bold tracking-tight">Executive Dashboard<\/h2>\s*<div className="flex items-center space-x-2">/g, replacement);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
