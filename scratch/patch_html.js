const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add inputs IDs
content = content.replace('<input class="input" style="height:42px;" placeholder="e.g. Rose Glow Serum 30ml">', '<input class="input" id="addProdName" style="height:42px;" placeholder="e.g. Rose Glow Serum 30ml">');
content = content.replace('<input class="input" style="height:42px;" placeholder="RGS-30">', '<input class="input" id="addProdSku" style="height:42px;" placeholder="RGS-30">');
content = content.replace('<input class="input" style="height:42px;" placeholder="Scan or type">', '<input class="input" id="addProdBarcode" style="height:42px;" placeholder="Scan or type">');
content = content.replace('<input class="input" style="height:42px;" placeholder="780">', '<input class="input" id="addProdCost" style="height:42px;" placeholder="780">');
content = content.replace('<input class="input" style="height:42px;" placeholder="1990">', '<input class="input" id="addProdPrice" style="height:42px;" placeholder="1990">');
content = content.replace('<input class="input" style="height:42px;" placeholder="50">', '<input class="input" id="addProdStock" style="height:42px;" placeholder="50">');
content = content.replace('<input class="input" style="height:42px;" placeholder="15">', '<input class="input" id="addProdReorder" style="height:42px;" placeholder="15">');

// Fix toggle buttons
content = content.replace('<div class="toggle on"></div></div>\\n        <div class="flex items-c justify-b mb-3"><div class="flex items-c gap-2"><span class="chan chan-d">D</span> Daraz</div><div class="toggle"></div></div>\\n        <div class="flex items-c justify-b"><div class="flex items-c gap-2"><span class="chan chan-w">W</span> WooCommerce</div><div class="toggle on"></div></div>',
    '<div class="toggle on" id="addChanShopify" onclick="this.classList.toggle(\\\'on\\\')"></div></div>\\n        <div class="flex items-c justify-b mb-3"><div class="flex items-c gap-2"><span class="chan chan-d">D</span> Daraz</div><div class="toggle" id="addChanDaraz" onclick="this.classList.toggle(\\\'on\\\')"></div></div>\\n        <div class="flex items-c justify-b"><div class="flex items-c gap-2"><span class="chan chan-w">W</span> WooCommerce</div><div class="toggle on" id="addChanWoo" onclick="this.classList.toggle(\\\'on\\\')"></div></div>');

// Replace closeDrawer with window.createProduct()
content = content.replace('<button class="btn btn-pri flex-1" onclick="closeDrawer(\\\'addDrawer\\\')"><i data-lucide="check" style="width:14px;"></i> Create product</button>', '<button class="btn btn-pri flex-1" onclick="window.createProduct()"><i data-lucide="check" style="width:14px;"></i> Create product</button>');

fs.writeFileSync(path, content);
console.log("Patched successfully.");
