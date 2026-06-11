const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = 'onclick=\\"closeDrawer(\\\'addDrawer\\\')\\"><i data-lucide=\\"check\\" style=\\"width:14px;\\"></i> Create product</button>';
const replacement = 'onclick=\\"window.createProduct()\\"><i data-lucide=\\"check\\" style=\\"width:14px;\\"></i> Create product</button>';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log("Replaced using exact string match.");
} else {
    console.log("Target string NOT FOUND. Here is what we found around 'Create product':");
    const idx = content.indexOf('Create product');
    console.log(content.substring(idx - 100, idx + 50));
}
