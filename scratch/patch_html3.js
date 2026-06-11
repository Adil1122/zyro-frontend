const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Create Product button
content = content.replace(
    '<button class="btn btn-pri flex-1" onclick="closeDrawer(\'addDrawer\')"><i data-lucide="check" style="width:14px;"></i> Create product</button>',
    '<button class="btn btn-pri flex-1" onclick="window.createProduct()"><i data-lucide="check" style="width:14px;"></i> Create product</button>'
);

// Fix toggles: they might have been patched with escaped quotes like \\'on\\' or \`on\`
// Let's replace the whole patched line with the correct one
content = content.replace(
    /<div class="toggle on" id="addChanShopify" onclick="this\.classList\.toggle\(\\'on\\'\)"><\/div><\/div>/g,
    '<div class="toggle on" id="addChanShopify" onclick="this.classList.toggle(\'on\')"></div></div>'
);
content = content.replace(
    /<div class="toggle on" id="addChanDaraz" onclick="this\.classList\.toggle\(\\'on\\'\)"><\/div><\/div>/g,
    '<div class="toggle on" id="addChanDaraz" onclick="this.classList.toggle(\'on\')"></div></div>'
);
content = content.replace(
    /<div class="toggle on" id="addChanWoo" onclick="this\.classList\.toggle\(\\'on\\'\)"><\/div><\/div>/g,
    '<div class="toggle on" id="addChanWoo" onclick="this.classList.toggle(\'on\')"></div></div>'
);

fs.writeFileSync(path, content);
console.log('Fixed patches.');
