const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Increase drawer-overlay z-index
content = content.replace(
    'z-index:90;',
    'z-index:390;'
);

// Increase drawer z-index
content = content.replace(
    'z-index:91;',
    'z-index:391;'
);

// Increase toast z-index
content = content.replace(
    'z-index:100; display:flex;',
    'z-index:400; display:flex;'
);

fs.writeFileSync(path, content);
console.log("Patched drawer and toast z-index successfully.");
