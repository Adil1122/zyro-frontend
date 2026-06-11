const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('e.target.value = \\\'\\\';'));
console.log('Line index:', idx);
if (idx !== -1) {
    console.log(lines.slice(idx - 5, idx + 5).join('\n'));
}
