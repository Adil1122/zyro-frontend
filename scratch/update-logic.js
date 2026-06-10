const fs = require('fs');
const path = 'components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const newRenderRows = `
window.currentPage = 1;
window.currentFilter = 'All';

window.renderRows = function(){
  const tbody = document.getElementById('productRows');
  if(!tbody) return;

  // Filter
  let filtered = window.products || [];
  if(window.currentFilter !== 'All') {
      filtered = filtered.filter(p => {
          if (window.currentFilter === 'In stock') return p.status && p.status[1] === 'In stock';
          if (window.currentFilter === 'Running out') return p.status && (p.status[1] === 'Running out' || p.status[1] === 'Low stock');
          if (window.currentFilter === 'Out of stock') return p.status && p.status[1] === 'Out of stock';
          if (window.currentFilter === 'Slow movers') return p.status && p.status[1] === 'Slow mover';
          if (window.currentFilter === 'Hidden') return p.status && p.status[1] === 'Hidden';
          return true;
      });
  }

  // Pagination
  const perPage = 10;
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  if(window.currentPage > totalPages) window.currentPage = totalPages;
  const start = (window.currentPage - 1) * perPage;
  const paged = filtered.slice(start, start + perPage);

  tbody.innerHTML = paged.map((p,i) => {
    const accentBorder = p.note === 'warn' ? 'box-shadow:inset 3px 0 0 var(--warn);'
                        : p.note === 'danger' ? 'box-shadow:inset 3px 0 0 var(--danger);' : '';
    const stockColor = p.avail === 0 ? 'c-danger' : p.avail <= p.reorder ? 'c-warn' : '';
    const daysText = p.avail === 0 ? 'Out · reorder now'
                   : p.daysLeft <= 5 ? \`~\${p.daysLeft} days · reorder\`
                   : p.daysLeft > 45 ? \`~\${p.daysLeft} days · overstocked\`
                   : \`~\${p.daysLeft} days left\`;
    const daysColor = p.avail === 0 ? 'c-danger' : p.daysLeft <= 5 ? 'c-warn' : 'c-text-5';
    const fillPct = Math.min(100, Math.round((p.avail / (p.reorder * 2.5 || 1)) * 100));
    const fillColor = p.avail === 0 ? 'var(--danger)' : p.avail <= p.reorder ? 'var(--warn)' : 'var(--jade-300)';
    const markerPct = Math.min(100, Math.round((p.reorder / (p.reorder * 2.5 || 1)) * 100));
    const channelChips = (p.channels||[]).map(([c,sync]) => {
      const m = chanMeta[c];
      if(!m) return '';
      const syncCls = sync === 'ok' ? 'sync-ok' : sync === 'stale' ? 'sync-stale' : 'sync-err';
      return \`<span class="chan \${m.cls}" title="\${m.label} · \${sync}">\${m.txt}<span class="chan-sync \${syncCls}"></span></span>\`;
    }).join('');
    const profitPerUnit = Math.round(p.price * p.netMargin / 100) || 0;
    return \`
    <tr onclick="openDetail(\${start+i})" style="\${accentBorder}">
      <td onclick="event.stopPropagation()"><input type="checkbox" class="checkbox row-check" onchange="updateBulk()"></td>
      <td>
        <div class="flex items-c gap-3">
          <div class="thumb"><i data-lucide="\${p.icon}" style="color:\${p.iconColor};"></i></div>
          <div class="min-w-0">
            <div class="flex items-c gap-2">
              <span class="t-sm" style="font-weight:700;">\${p.name}</span>
              <span class="badge badge-\${p.status[0]} \${p.note==='danger'||p.note==='warn'?'badge-pulse':''}" style="font-size:10px;">\${p.status[1]}</span>
            </div>
            <div class="t-2xs c-text-5 mt-1"><span class="mono">\${p.sku}</span> · \${p.velocity}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="stock-cell">
          <div class="flex items-c gap-2">
            <span class="mono \${stockColor}" style="font-weight:800; font-size:16px;">\${p.avail}</span>
            <span class="t-2xs c-text-5">available</span>
          </div>
          <div class="t-2xs \${daysColor} mt-1">\${daysText}</div>
          <div class="minibar">
            <div class="minibar-fill" style="width:\${fillPct}%; background:\${fillColor};"></div>
            <div class="minibar-marker" style="left:\${markerPct}%;" title="Reorder point"></div>
          </div>
        </div>
      </td>
      <td>
        <div class="margin-cell">
          <span class="mono t-sm" style="font-weight:700;">\${fmtRs(p.price)}</span>
          <span class="t-2xs c-text-5">cost \${fmtRs(p.cost)}</span>
        </div>
      </td>
      <td>
        <div class="margin-cell">
          <span class="mono c-success t-sm" style="font-weight:700;">\${fmtRs(profitPerUnit)}</span>
          <span class="t-2xs c-text-5">\${p.netMargin}% per order</span>
        </div>
      </td>
      <td><div class="flex gap-1">\${channelChips}</div></td>
      <td onclick="event.stopPropagation()">
        <div class="row-actions">
          <button class="ibtn" style="width:30px; height:30px;" title="Quick adjust" onclick="quickAdjust('\${p.sku}')"><i data-lucide="sliders-horizontal" style="width:15px;"></i></button>
          <button class="ibtn" style="width:30px; height:30px;" title="More" onclick="openDetail(\${start+i})"><i data-lucide="more-horizontal" style="width:16px;"></i></button>
        </div>
      </td>
    </tr>\`;
  }).join('');
  
  // Update pagination UI
  const footerInfo = document.querySelector('.table-footer .t-xs.c-text-4');
  if(footerInfo) footerInfo.innerHTML = \`Showing <b class="c-text-2">\${paged.length}</b> of \${total} products\`;
  
  const pageInfo = document.querySelector('.table-footer .c-text-3');
  if(pageInfo) pageInfo.innerHTML = \`Page \${window.currentPage} of \${totalPages}\`;

  const prevBtn = document.querySelector('.table-footer button:first-child');
  const nextBtn = document.querySelector('.table-footer button:last-child');
  
  if(prevBtn) {
      prevBtn.onclick = () => { if(window.currentPage > 1) { window.currentPage--; window.renderRows(); } };
      prevBtn.disabled = window.currentPage === 1;
  }
  if(nextBtn) {
      nextBtn.onclick = () => { if(window.currentPage < totalPages) { window.currentPage++; window.renderRows(); } };
      nextBtn.disabled = window.currentPage === totalPages;
  }
  
  // Update filter pill counts dynamically
  document.querySelectorAll('.pill-row .pill').forEach(btn => {
      const type = btn.textContent.split(/[0-9]/)[0].trim();
      let count = 0;
      if (type === 'All') count = (window.products||[]).length;
      else if (type === 'In stock') count = (window.products||[]).filter(p => p.status[1] === 'In stock').length;
      else if (type === 'Running out') count = (window.products||[]).filter(p => p.status[1] === 'Running out' || p.status[1] === 'Low stock').length;
      else if (type === 'Out of stock') count = (window.products||[]).filter(p => p.status[1] === 'Out of stock').length;
      else if (type === 'Slow movers') count = (window.products||[]).filter(p => p.status[1] === 'Slow mover').length;
      else if (type === 'Hidden') count = (window.products||[]).filter(p => p.status[1] === 'Hidden').length;
      
      const countSpan = btn.querySelector('.count');
      if(countSpan) countSpan.textContent = count;
  });

  if(window.lucide) window.lucide.createIcons();
}
`;

const newSetFilter = `
window.setFilter = function(btn){
  const row = btn.parentElement;
  row.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  window.currentFilter = btn.textContent.split(/[0-9]/)[0].trim();
  window.currentPage = 1;
  window.renderRows();
}
`;

const startIdx = content.indexOf('window.renderRows = function(){');
const endIdx = content.indexOf('// ═══════════ Detail drawer ═══════════');
if (startIdx > -1 && endIdx > -1) {
   content = content.substring(0, startIdx) + newRenderRows + '\n\n' + content.substring(endIdx);
}

const filterStart = content.indexOf('window.setFilter = function(btn){');
if (filterStart > -1) {
   const filterEnd = content.indexOf("// Auto-wire all pill-rows that aren't already wired");
   if (filterEnd > -1) {
       content = content.substring(0, filterStart) + newSetFilter + '\n\n' + content.substring(filterEnd);
   }
}

content = content.replace(
  "status: p.status === 'Out of Stock' ? ['danger', 'Out of stock'] : p.status === 'Low Stock' ? ['warn', 'Low stock'] : ['success', 'In stock'],",
  "status: p.status === 'Out of Stock' ? ['danger', 'Out of stock'] : p.status === 'Low Stock' ? ['warn', 'Running out'] : p.status === 'Hidden' ? ['neutral', 'Hidden'] : p.status === 'Slow Mover' ? ['info', 'Slow mover'] : ['success', 'In stock'],"
);

fs.writeFileSync(path, content);
console.log("Safely updated logic.");
