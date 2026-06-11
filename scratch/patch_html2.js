const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add IDs to the input fields in Add Product drawer
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Product name</label><input class="input" style="height:42px;" placeholder="e.g. Rose Glow Serum 30ml">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Product name</label><input class="input" id="addProdName" style="height:42px;" placeholder="e.g. Rose Glow Serum 30ml">'
);
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">SKU code</label><input class="input" style="height:42px;" placeholder="RGS-30">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">SKU code</label><input class="input" id="addProdSku" style="height:42px;" placeholder="RGS-30">'
);
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Barcode</label><input class="input" style="height:42px;" placeholder="Scan or type">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Barcode</label><input class="input" id="addProdBarcode" style="height:42px;" placeholder="Scan or type">'
);
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Cost (Rs)</label><input class="input" style="height:42px;" placeholder="780">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Cost (Rs)</label><input class="input" id="addProdCost" style="height:42px;" placeholder="780" type="number">'
);
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Price (Rs)</label><input class="input" style="height:42px;" placeholder="1990">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Price (Rs)</label><input class="input" id="addProdPrice" style="height:42px;" placeholder="1990" type="number">'
);
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Initial stock</label><input class="input" style="height:42px;" placeholder="50">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Initial stock</label><input class="input" id="addProdStock" style="height:42px;" placeholder="50" type="number">'
);
content = content.replace(
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Reorder point</label><input class="input" style="height:42px;" placeholder="15">',
    '<label class="t-cap c-text-5" style="display:block; margin-bottom:8px;">Reorder point</label><input class="input" id="addProdReorder" style="height:42px;" placeholder="15" type="number">'
);

// 2. Add Toggle IDs and event handlers. User wants all of them set to Green Yes by default, so class="toggle on" for all.
content = content.replace(
    '<div class="flex items-c justify-b mb-3"><div class="flex items-c gap-2"><span class="chan chan-s">S</span> Shopify</div><div class="toggle on"></div></div>',
    '<div class="flex items-c justify-b mb-3"><div class="flex items-c gap-2"><span class="chan chan-s">S</span> Shopify</div><div class="toggle on" id="addChanShopify" onclick="this.classList.toggle(\\\'on\\\')"></div></div>'
);
content = content.replace(
    '<div class="flex items-c justify-b mb-3"><div class="flex items-c gap-2"><span class="chan chan-d">D</span> Daraz</div><div class="toggle"></div></div>',
    '<div class="flex items-c justify-b mb-3"><div class="flex items-c gap-2"><span class="chan chan-d">D</span> Daraz</div><div class="toggle on" id="addChanDaraz" onclick="this.classList.toggle(\\\'on\\\')"></div></div>'
);
content = content.replace(
    '<div class="flex items-c justify-b"><div class="flex items-c gap-2"><span class="chan chan-w">W</span> WooCommerce</div><div class="toggle on"></div></div>',
    '<div class="flex items-c justify-b"><div class="flex items-c gap-2"><span class="chan chan-w">W</span> WooCommerce</div><div class="toggle on" id="addChanWoo" onclick="this.classList.toggle(\\\'on\\\')"></div></div>'
);

// 3. Change "Create product" button onclick action
content = content.replace(
    '<button class="btn btn-pri flex-1" onclick="closeDrawer(\\\'addDrawer\\\')"><i data-lucide="check" style="width:14px;"></i> Create product</button>',
    '<button class="btn btn-pri flex-1" onclick="window.createProduct()"><i data-lucide="check" style="width:14px;"></i> Create product</button>'
);

fs.writeFileSync(path, content);
console.log('Patches applied successfully.');
