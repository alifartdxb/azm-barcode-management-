import fs from 'fs';

let code = fs.readFileSync('src/db/db.ts', 'utf8');

if (!code.includes('users!: Table<any, number>;')) {
  code = code.replace("export class ERPDatabase extends Dexie {", "export class ERPDatabase extends Dexie {\n  users!: Table<any, number>;");
  code = code.replace("this.version(1).stores({", "this.version(1).stores({");
  
  // Since we are adding a table to an existing db, we should add a version 2.
  const ver2 = `
    this.version(2).stores({
      users: '++id, name, email, role, status'
    });
  `;
  code = code.replace("});", "});" + ver2);
}

fs.writeFileSync('src/db/db.ts', code);
