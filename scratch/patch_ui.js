const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');

const oldUI = '<button class=\\"btn btn-sec flex items-c gap-2\\"><i data-lucide=\\"download\\" style=\\"width:16px;\\"></i> Import</button>\\n        <button class=\\"btn btn-sec flex items-c gap-2\\"><i data-lucide=\\"upload\\" style=\\"width:16px;\\"></i> Export</button>';

let newUI = `
        <div class="dropdown" style="position:relative; display:inline-block;">
          <button class="btn btn-sec flex items-c gap-2" onclick="window.toggleDropdown(event, 'importDropdown')">
            <i data-lucide="download" style="width:16px;"></i> Import
          </button>
          <div id="importDropdown" class="dropdown-menu" style="display:none; position:absolute; top:100%; left:0; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; z-index:100; min-width:150px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <button onclick="window.triggerImportInput('All')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">All</button>
            <button onclick="window.triggerImportInput('Products')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Products</button>
            <button onclick="window.triggerImportInput('Movements')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Movements</button>
            <button onclick="window.triggerImportInput('Purchase Orders')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Purchase Orders</button>
            <button onclick="window.triggerImportInput('Suppliers')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Suppliers</button>
            <button onclick="window.triggerImportInput('Returns')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Returns</button>
          </div>
        </div>
        
        <div class="dropdown" style="position:relative; display:inline-block;">
          <button class="btn btn-sec flex items-c gap-2" onclick="window.toggleDropdown(event, 'exportDropdown')">
            <i data-lucide="upload" style="width:16px;"></i> Export
          </button>
          <div id="exportDropdown" class="dropdown-menu" style="display:none; position:absolute; top:100%; left:0; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; z-index:100; min-width:150px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <button onclick="window.handleExportClick('All')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">All</button>
            <button onclick="window.handleExportClick('Products')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Products</button>
            <button onclick="window.handleExportClick('Movements')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Movements</button>
            <button onclick="window.handleExportClick('Purchase Orders')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Purchase Orders</button>
            <button onclick="window.handleExportClick('Suppliers')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Suppliers</button>
            <button onclick="window.handleExportClick('Returns')" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color:var(--text); cursor:pointer;">Returns</button>
          </div>
        </div>
        <input type="file" id="csvFileInput" accept=".csv" style="display:none;" onchange="window.handleFileSelect(event)" />
`;

// since it's injected into a JS literal string which sets __html, we need to escape the double quotes and newlines.
newUI = newUI.replace(/\n/g, '\\n').replace(/"/g, '\\"');

if (content.includes(oldUI)) {
    content = content.replace(oldUI, newUI);
    fs.writeFileSync('components/dashboard/pages/InventoryPage.jsx', content, 'utf8');
    console.log('UI Patched Successfully');
} else {
    console.log('Old UI not found');
    console.log('Looked for:', oldUI);
}
