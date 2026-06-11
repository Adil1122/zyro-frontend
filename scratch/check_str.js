const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');
const str = content.substring(content.indexOf('e.target.value = \\\'\\\';') + 20, content.indexOf('document.body.appendChild(jsScript);'));
console.log(str.replace(/\n/g, '[NEWLINE]'));
console.log(Buffer.from(str).toString('hex'));
