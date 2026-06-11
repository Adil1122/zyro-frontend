const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');

const targetStr = 'const jsScript = document.createElement("script");';
if (content.includes(targetStr)) {
    content = content.replace(targetStr, `window.getCurrentUserId = getCurrentUserId;\n        const jsScript = document.createElement("script");`);
    fs.writeFileSync('components/dashboard/pages/InventoryPage.jsx', content, 'utf8');
    console.log('Successfully added window.getCurrentUserId');
} else {
    console.log('Target string not found');
}
