const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Inputs
content = content.replace(
    'Product name</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"e.g. Rose Glow Serum 30ml\\">',
    'Product name</label><input class=\\"input\\" id=\\"addProdName\\" style=\\"height:42px;\\" placeholder=\\"e.g. Rose Glow Serum 30ml\\">'
);
content = content.replace(
    'SKU code</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"RGS-30\\">',
    'SKU code</label><input class=\\"input\\" id=\\"addProdSku\\" style=\\"height:42px;\\" placeholder=\\"RGS-30\\">'
);
content = content.replace(
    'Barcode</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"Scan or type\\">',
    'Barcode</label><input class=\\"input\\" id=\\"addProdBarcode\\" style=\\"height:42px;\\" placeholder=\\"Scan or type\\">'
);
content = content.replace(
    'Cost (Rs)</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"780\\">',
    'Cost (Rs)</label><input class=\\"input\\" id=\\"addProdCost\\" style=\\"height:42px;\\" placeholder=\\"780\\" type=\\"number\\">'
);
content = content.replace(
    'Price (Rs)</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"1990\\">',
    'Price (Rs)</label><input class=\\"input\\" id=\\"addProdPrice\\" style=\\"height:42px;\\" placeholder=\\"1990\\" type=\\"number\\">'
);
content = content.replace(
    'Initial stock</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"50\\">',
    'Initial stock</label><input class=\\"input\\" id=\\"addProdStock\\" style=\\"height:42px;\\" placeholder=\\"50\\" type=\\"number\\">'
);
content = content.replace(
    'Reorder point</label><input class=\\"input\\" style=\\"height:42px;\\" placeholder=\\"15\\">',
    'Reorder point</label><input class=\\"input\\" id=\\"addProdReorder\\" style=\\"height:42px;\\" placeholder=\\"15\\" type=\\"number\\">'
);

// 2. Toggles
// Note: they might have class=\\"toggle\\" or class=\\"toggle on\\"
content = content.replace(
    '<span class=\\"chan chan-s\\">S</span> Shopify</div><div class=\\"toggle on\\"></div>',
    '<span class=\\"chan chan-s\\">S</span> Shopify</div><div class=\\"toggle on\\" id=\\"addChanShopify\\" onclick=\\"this.classList.toggle(\'on\')\\"></div>'
);
content = content.replace(
    '<span class=\\"chan chan-d\\">D</span> Daraz</div><div class=\\"toggle\\"></div>',
    '<span class=\\"chan chan-d\\">D</span> Daraz</div><div class=\\"toggle on\\" id=\\"addChanDaraz\\" onclick=\\"this.classList.toggle(\'on\')\\"></div>'
);
content = content.replace(
    '<span class=\\"chan chan-w\\">W</span> WooCommerce</div><div class=\\"toggle on\\"></div>',
    '<span class=\\"chan chan-w\\">W</span> WooCommerce</div><div class=\\"toggle on\\" id=\\"addChanWoo\\" onclick=\\"this.classList.toggle(\'on\')\\"></div>'
);

fs.writeFileSync(path, content);
console.log("Inputs and Toggles patched successfully using string replacement.");
