import fs from 'fs';

const code = fs.readFileSync('src/data/menuItems.ts', 'utf8');
const items = [...code.matchAll(/"name":\s*"([^"]+)"[\s\S]*?"image":\s*"([^"]+)"/g)];
items.forEach(m => console.log(m[1], '->', m[2]));
