const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// The replacement was failing due to whitespace or something. Let's use a regex
content = content.replace(
    /onclick="closeDrawer\('addDrawer'\)"><i data-lucide="check" style="width:14px;"><\/i> Create product/g,
    'onclick="window.createProduct()"><i data-lucide="check" style="width:14px;"></i> Create product'
);

fs.writeFileSync(path, content);
console.log("Regex replacement done.");
