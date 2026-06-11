const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/dashboard/pages/InventoryPage.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Inject PapaParse and JSZip after lucide
const scriptBlock1 = `        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/lucide/0.456.0/lucide.min.js";
        script.onload = () => {
            if (window.lucide) window.lucide.createIcons();
        };
        document.body.appendChild(script);`;

const newScriptBlock1 = scriptBlock1 + `\n
        const papaScript = document.createElement("script");
        papaScript.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js";
        document.body.appendChild(papaScript);

        const jszipScript = document.createElement("script");
        jszipScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        document.body.appendChild(jszipScript);`;

content = content.replace(scriptBlock1, newScriptBlock1);


// 2. Inject CSS for dropdown-item
const cssTarget = `  --ease-snap:cubic-bezier(0.16,1,0.3,1);
}`;
const cssReplacement = cssTarget + `\n.dropdown-item { display:block; width:100%; text-align:left; padding:8px 12px; background:transparent; color:var(--text-3); border-radius:6px; font-size:13px; font-weight:600; transition:all 150ms var(--ease); border:none; cursor:pointer; }\n.dropdown-item:hover { background:var(--bg-high); color:var(--text); }`;

content = content.replace(cssTarget, cssReplacement);


// 3. Update the UI buttons
const uiTarget = `          <button class=\\"btn btn-sec btn-sm\\" title=\\"Import from Excel/CSV\\"><i data-lucide=\\"upload\\" style=\\"width:14px;\\"></i> Import</button>
          <button class=\\"btn btn-sec btn-sm\\" title=\\"Export to CSV\\"><i data-lucide=\\"download\\" style=\\"width:14px;\\"></i> Export</button>`;

const uiReplacement = `          <div style=\\"position:relative; display:inline-block;\\">
            <button class=\\"btn btn-sec btn-sm\\" onclick=\\"window.toggleDropdown(event, 'importDropdown')\\" title=\\"Import from Excel/CSV\\"><i data-lucide=\\"upload\\" style=\\"width:14px;\\"></i> Import</button>
            <div id=\\"importDropdown\\" class=\\"dropdown-menu\\" style=\\"display:none; position:absolute; top:100%; right:0; margin-top:4px; background:var(--bg-elev); border:1px solid var(--border-2); border-radius:8px; box-shadow:var(--sh-card); z-index:100; min-width:160px; padding:4px;\\">
              <button class=\\"dropdown-item\\" onclick=\\"window.triggerImportInput('All')\\">All</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.triggerImportInput('Products')\\">Products</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.triggerImportInput('Movements')\\">Movements</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.triggerImportInput('Purchase Orders')\\">Purchase Orders</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.triggerImportInput('Suppliers')\\">Suppliers</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.triggerImportInput('Returns')\\">Returns</button>
            </div>
          </div>
          <div style=\\"position:relative; display:inline-block;\\">
            <button class=\\"btn btn-sec btn-sm\\" onclick=\\"window.toggleDropdown(event, 'exportDropdown')\\" title=\\"Export to CSV\\"><i data-lucide=\\"download\\" style=\\"width:14px;\\"></i> Export</button>
            <div id=\\"exportDropdown\\" class=\\"dropdown-menu\\" style=\\"display:none; position:absolute; top:100%; right:0; margin-top:4px; background:var(--bg-elev); border:1px solid var(--border-2); border-radius:8px; box-shadow:var(--sh-card); z-index:100; min-width:160px; padding:4px;\\">
              <button class=\\"dropdown-item\\" onclick=\\"window.handleExportClick('All')\\">All</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.handleExportClick('Products')\\">Products</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.handleExportClick('Movements')\\">Movements</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.handleExportClick('Purchase Orders')\\">Purchase Orders</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.handleExportClick('Suppliers')\\">Suppliers</button>
              <button class=\\"dropdown-item\\" onclick=\\"window.handleExportClick('Returns')\\">Returns</button>
            </div>
          </div>
          <input type=\\"file\\" id=\\"csvFileInput\\" accept=\\".csv\\" style=\\"display:none\\" onchange=\\"window.handleFileSelect(event)\\" />`;

content = content.replace(uiTarget, uiReplacement);


// 4. Inject Javascript Logic
const jsTarget = `\\nwindow.quickAdjust = function(sku){ window.showToast('Quick adjust for ' + sku + ' — opening…'); };\\n\\n";`;

const jsLogic = `
window.toggleDropdown = function(e, id) {
  e.stopPropagation();
  const el = document.getElementById(id);
  const wasVisible = el.style.display === 'block';
  document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
  el.style.display = wasVisible ? 'none' : 'block';
};
document.addEventListener('click', function(e) {
  if (!e.target.closest('.dropdown-menu')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
  }
});
window.handleExportClick = function(type) {
  window.showToast('Generating export for ' + type + '...');
  const generateCSV = (data, fields) => {
    if (!window.Papa) { window.showToast('Library still loading...'); return ''; }
    return window.Papa.unparse({ fields, data });
  };
  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const getProductsData = () => (window.products || []).map(p => ({ Name: p.name, SKU: p.sku, Stock: p.avail, Price: p.price, Cost: p.cost, Category: p.category || '', Status: p.status?.[1] || '' }));
  const getMovementsData = () => (window.movements || []).map(m => ({ Date: new Date(m.created_at).toLocaleString(), Type: m.movement_type, SKU: m.sku, Quantity: m.qty, Reason: m.reason, Reference: m.reference || '', User: m.user_name || '' }));
  const getPOsData = () => (window.pos || []).map(p => ({ PONumber: p.po_number, Supplier: p.supplier, Items: p.items, Total: p.total, ExpectedDate: p.expected, Status: p.status }));
  const getSuppliersData = () => (window.vendors || []).map(s => ({ Name: s.name, Email: s.email, LeadTimeDays: s.lead_time, Status: s.status }));
  const getReturnsData = () => (window.returnsProcessed || []).map(r => ({ RMANumber: r.rma, Order: r.order, Customer: r.cust, Item: r.item, Reason: r.reason, Condition: r.condition, Status: r.status }));
  if (type === 'All') {
    if (!window.JSZip) { window.showToast('Library still loading...'); return; }
    const zip = new window.JSZip();
    zip.file('products.csv', generateCSV(getProductsData()));
    zip.file('movements.csv', generateCSV(getMovementsData()));
    zip.file('purchase_orders.csv', generateCSV(getPOsData()));
    zip.file('suppliers.csv', generateCSV(getSuppliersData()));
    zip.file('returns.csv', generateCSV(getReturnsData()));
    zip.generateAsync({ type: 'blob' }).then(function(content) {
      downloadFile(content, 'inventory_all_data.zip', 'application/zip');
      window.showToast('Download started');
    });
  } else {
    let data = [], filename = '';
    if (type === 'Products') { data = getProductsData(); filename = 'products.csv'; }
    if (type === 'Movements') { data = getMovementsData(); filename = 'movements.csv'; }
    if (type === 'Purchase Orders') { data = getPOsData(); filename = 'purchase_orders.csv'; }
    if (type === 'Suppliers') { data = getSuppliersData(); filename = 'suppliers.csv'; }
    if (type === 'Returns') { data = getReturnsData(); filename = 'returns.csv'; }
    downloadFile(generateCSV(data), filename, 'text/csv;charset=utf-8;');
  }
};
window.triggerImportInput = function(type) {
  window.importType = type;
  document.getElementById('csvFileInput').click();
};
window.handleFileSelect = async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (window.importType === 'All') {
    window.showToast('Importing All is only supported via ZIP (feature coming soon). Try individual CSVs for now.');
    e.target.value = '';
    return;
  }
  window.showToast('Parsing ' + file.name + '...');
  if (!window.Papa) return;
  window.Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async function(results) {
      window.showToast('Importing ' + results.data.length + ' records...');
      try {
        const userId = window.getCurrentUserId ? window.getCurrentUserId() : null; // we will pass userId from component state if needed, but it's simpler to use API route which reads it
        const res = await fetch('/api/inventory/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: window.importType, data: results.data, userId })
        });
        if (res.ok) {
          window.showToast('Import successful! Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const err = await res.json();
          window.showToast('Error: ' + err.error);
        }
      } catch (err) {
        window.showToast('Upload failed');
      }
      e.target.value = '';
    }
  });
};`;

const jsReplacement = `\\nwindow.quickAdjust = function(sku){ window.showToast('Quick adjust for ' + sku + ' — opening…'); };\\n` + jsLogic.replace(/\\n/g, '\\\\n').replace(/"/g, '\\\\"') + `\\n";`;

content = content.replace(jsTarget, jsReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched InventoryPage.jsx');
