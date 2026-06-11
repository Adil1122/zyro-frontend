const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /onclick=\\"closeDrawer\('addDrawer'\)\\"([^>]+)>([^<]*)Create product/g,
    'onclick=\\"window.createProduct()\\"\$1>\$2Create product'
);

fs.writeFileSync(path, content);
console.log("Regex replacement done.");
