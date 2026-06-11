const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');

const searchRegex = /<div class=\\"page-h-actions\\">.*?<\/div>/s;
const match = content.match(searchRegex);

if (match) {
    console.log('Found:', match[0]);
    let newUI = `<div class=\\"page-h-actions\\">
          <div class=\\"dropdown\\" style=\\"position:relative; display:inline-block;\\">
            <button class=\\"btn btn-sec btn-sm\\" title=\\"Import from Excel/CSV\\" onclick=\\"window.toggleDropdown(event, 'importDropdown')\\">
              <i data-lucide=\\"upload\\" style=\\"width:14px;\\"></i> Import
            </button>
            <div id=\\"importDropdown\\" class=\\"dropdown-menu\\" style=\\"display:none; position:absolute; top:100%; right:0; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; z-index:100; min-width:150px; box-shadow:0 4px 12px rgba(0,0,0,0.1);\\">
              <button onclick=\\"window.triggerImportInput('All')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">All</button>
              <button onclick=\\"window.triggerImportInput('Products')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Products</button>
              <button onclick=\\"window.triggerImportInput('Movements')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Movements</button>
              <button onclick=\\"window.triggerImportInput('Purchase Orders')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Purchase Orders</button>
              <button onclick=\\"window.triggerImportInput('Suppliers')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Suppliers</button>
              <button onclick=\\"window.triggerImportInput('Returns')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Returns</button>
            </div>
          </div>
          
          <div class=\\"dropdown\\" style=\\"position:relative; display:inline-block;\\">
            <button class=\\"btn btn-sec btn-sm\\" title=\\"Export to CSV\\" onclick=\\"window.toggleDropdown(event, 'exportDropdown')\\">
              <i data-lucide=\\"download\\" style=\\"width:14px;\\"></i> Export
            </button>
            <div id=\\"exportDropdown\\" class=\\"dropdown-menu\\" style=\\"display:none; position:absolute; top:100%; right:0; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; z-index:100; min-width:150px; box-shadow:0 4px 12px rgba(0,0,0,0.1);\\">
              <button onclick=\\"window.handleExportClick('All')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">All</button>
              <button onclick=\\"window.handleExportClick('Products')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Products</button>
              <button onclick=\\"window.handleExportClick('Movements')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Movements</button>
              <button onclick=\\"window.handleExportClick('Purchase Orders')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Purchase Orders</button>
              <button onclick=\\"window.handleExportClick('Suppliers')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Suppliers</button>
              <button onclick=\\"window.handleExportClick('Returns')\\" style=\\"display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;\\">Returns</button>
            </div>
          </div>
          
          <button class=\\"btn btn-pri btn-sm\\" onclick=\\"window.openDrawer('detailDrawer')\\"><i data-lucide=\\"plus\\" style=\\"width:14px;\\"></i> Add Product</button>
          <input type=\\"file\\" id=\\"csvFileInput\\" accept=\\".csv\\" style=\\"display:none;\\" onchange=\\"window.handleFileSelect(event)\\" />
        </div>`;

    newUI = newUI.replace(/\n/g, '\\n');
    content = content.replace(match[0], newUI);
    fs.writeFileSync('components/dashboard/pages/InventoryPage.jsx', content, 'utf8');
    console.log('UI Patched successfully');
} else {
    console.log('Could not find match');
}
