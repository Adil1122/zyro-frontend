const fs = require('fs');
const content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');
console.log('Button patched:', content.includes('onclick="window.createProduct()"'));
