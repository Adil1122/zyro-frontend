const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');
const lines = content.split('\n');
const start = Math.max(0, 105 - 1);
const end = Math.min(lines.length, 115);
console.log(lines.slice(start, end).join('\n'));
