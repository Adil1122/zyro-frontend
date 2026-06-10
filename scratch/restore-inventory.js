const fs = require('fs');
const htmlPath = 'C:/Users/DIGITAL/Desktop/Anes Bhai/zyro-inventory-detailed.html';
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract styles
const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const styles = styleMatch ? styleMatch[1] : '';

// Extract page
const pageMatch = htmlContent.match(/<div class="page">([\s\S]*?)<\/main>/);
let pageHtml = pageMatch ? '<div class="page">' + pageMatch[1].replace('</div><!-- /view-products -->', '</div>') : '';

// Extract drawers and toast
const drawerMatch = htmlContent.match(/(<!-- ═══════════ PRODUCT DETAIL DRAWER ═══════════ -->[\s\S]*?)<script>/);
if (drawerMatch) {
    pageHtml += '\n' + drawerMatch[1];
}


const jsLogic = `
window.currentPage = 1;
window.currentFilter = 'All';

window.chanMeta = {
  s:{cls:'chan-s', label:'Shopify', txt:'S'},
  d:{cls:'chan-d', label:'Daraz', txt:'D'},
  w:{cls:'chan-w', label:'WooCommerce', txt:'W'},
};

window.fmtRs = function(n){ return 'Rs ' + n.toLocaleString('en-PK'); }

window.updateKPIs = function() {
    const p = window.products || [];
    let stockValue = 0;
    let readyToSell = 0;
    let runningOut = 0;
    let outOfStock = 0;
    p.forEach(prod => {
        stockValue += (prod.cost || 0) * (prod.avail || 0);
        readyToSell += (prod.avail || 0);
        if (prod.status && (prod.status[1] === 'Running out' || prod.status[1] === 'Low stock')) runningOut++;
        if (prod.status && prod.status[1] === 'Out of stock') outOfStock++;
    });
    
    const setSafe = (selector, html) => { const el = document.querySelector(selector); if(el) el.innerHTML = html; };
    
    setSafe('.card-hero .num-lg', window.fmtRs(stockValue));
    setSafe('.card-hero .t-xs b', p.length + ' products');
    
    const productGrid = document.querySelector('.card-hero');
    if (productGrid && productGrid.parentElement) {
        const pCards = productGrid.parentElement.querySelectorAll('.card-action .num-md');
        if (pCards.length >= 3) {
            pCards[0].textContent = readyToSell.toLocaleString();
            pCards[1].textContent = runningOut.toLocaleString();
            pCards[2].textContent = outOfStock.toLocaleString();
        }
    }

    const m = window.movements || [];
    let receipts = 0, sales = 0, returns = 0, adjustments = 0;
    m.forEach(mov => {
        if (mov.movement_type === 'Receipt') receipts += mov.qty;
        else if (mov.movement_type === 'Sale') sales += Math.abs(mov.qty);
        else if (mov.movement_type === 'Return') returns += mov.qty;
        else if (mov.movement_type === 'Adjustment') adjustments += mov.qty;
    });
    const movesCards = document.querySelectorAll('#view-movements .card .num-md');
    if (movesCards.length >= 4) {
        movesCards[0].textContent = '+' + receipts.toLocaleString();
        movesCards[1].textContent = '−' + sales.toLocaleString();
        movesCards[2].textContent = '+' + returns.toLocaleString();
        movesCards[3].textContent = (adjustments > 0 ? '+' : (adjustments < 0 ? '−' : '')) + Math.abs(adjustments).toLocaleString();
    }

    const s = window.vendors || [];
    const vendorCards = document.querySelectorAll('#view-suppliers .card .num-md');
    if (vendorCards.length >= 4) {
        vendorCards[0].textContent = s.length;
    }

    const r = window.returnsProcessed || [];
    let pending = 0, restocked = 0, writtenOff = 0;
    r.forEach(ret => {
        if (ret.status === 'Pending') pending++;
        else if (ret.status === 'Restocked') restocked++;
        else if (ret.status === 'Written off') writtenOff++;
    });
    const returnCards = document.querySelectorAll('#view-returns .card .num-md');
    if (returnCards.length >= 4) {
        returnCards[0].textContent = pending;
        returnCards[1].textContent = restocked;
        returnCards[2].textContent = writtenOff;
    }
};

window.setupPagination = function(viewId, items, renderFn, pageVar, itemName) {
  const perPage = 10;
  const total = items.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  if(window[pageVar] > totalPages) window[pageVar] = totalPages;
  if(window[pageVar] < 1) window[pageVar] = 1;
  const start = (window[pageVar] - 1) * perPage;
  const paged = items.slice(start, start + perPage);

  const selectorPrefix = viewId === 'view-products' ? '' : '#' + viewId + ' ';
  let footer = document.querySelector(selectorPrefix + '.table-footer');
  if (!footer) {
      const wrap = document.querySelector(selectorPrefix + '.table-wrap');
      if (wrap) {
          wrap.insertAdjacentHTML('beforeend', '<div class="table-footer"><span class="t-xs c-text-4"></span><div class="flex items-c gap-2"><button class="btn btn-sec btn-xs">← Prev</button><span class="t-xs c-text-3"></span><button class="btn btn-sec btn-xs">Next →</button></div></div>');
          footer = document.querySelector(selectorPrefix + '.table-footer');
      }
  }

  if (footer) {
      const footerInfo = footer.querySelector('.t-xs.c-text-4');
      if(footerInfo) footerInfo.innerHTML = 'Showing <b class="c-text-2">' + (total === 0 ? 0 : start + 1) + '–' + (start + paged.length) + '</b> of ' + total + ' ' + itemName;
      
      const pageInfo = footer.querySelector('.c-text-3');
      if(pageInfo) pageInfo.innerHTML = 'Page ' + window[pageVar] + ' of ' + totalPages;

      const btns = footer.querySelectorAll('button');
      if (btns.length >= 2) {
          const prevBtn = btns[0];
          const nextBtn = btns[1];
          prevBtn.onclick = () => { if(window[pageVar] > 1) { window[pageVar]--; renderFn(); } };
          prevBtn.disabled = window[pageVar] === 1;
          nextBtn.onclick = () => { if(window[pageVar] < totalPages) { window[pageVar]++; renderFn(); } };
          nextBtn.disabled = window[pageVar] === totalPages;
      }
  }
  
  return paged;
};

window.renderRows = function(){
  const tbody = document.getElementById('productRows');
  if(!tbody) return;

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

  window.currentPage = window.currentPage || 1;
  const paged = window.setupPagination('view-products', filtered, window.renderRows, 'currentPage', 'products');

  tbody.innerHTML = paged.map((p,i) => {
    const start = (window.currentPage - 1) * 10;
    const accentBorder = p.note === 'warn' ? 'box-shadow:inset 3px 0 0 var(--warn);'
                        : p.note === 'danger' ? 'box-shadow:inset 3px 0 0 var(--danger);' : '';
    const stockColor = p.avail === 0 ? 'c-danger' : p.avail <= p.reorder ? 'c-warn' : '';
    const daysText = p.avail === 0 ? 'Out · reorder now'
                   : p.daysLeft <= 5 ? "~" + p.daysLeft + " days · reorder"
                   : p.daysLeft > 45 ? "~" + p.daysLeft + " days · overstocked"
                   : "~" + p.daysLeft + " days left";
    const daysColor = p.avail === 0 ? 'c-danger' : p.daysLeft <= 5 ? 'c-warn' : 'c-text-5';
    const fillPct = Math.min(100, Math.round((p.avail / (p.reorder * 2.5 || 1)) * 100));
    const fillColor = p.avail === 0 ? 'var(--danger)' : p.avail <= p.reorder ? 'var(--warn)' : 'var(--jade-300)';
    const markerPct = Math.min(100, Math.round((p.reorder / (p.reorder * 2.5 || 1)) * 100));
    const channelChips = (p.channels||[]).map(([c,sync]) => {
      const m = chanMeta[c];
      if(!m) return '';
      const syncCls = sync === 'ok' ? 'sync-ok' : sync === 'stale' ? 'sync-stale' : 'sync-err';
      return '<span class="chan ' + m.cls + '" title="' + m.label + ' · ' + sync + '">' + m.txt + '<span class="chan-sync ' + syncCls + '"></span></span>';
    }).join('');
    const profitPerUnit = Math.round(p.price * p.netMargin / 100) || 0;
    return '<tr onclick="openDetail(' + (start+i) + ')" style="' + accentBorder + '">' +
      '<td onclick="event.stopPropagation()"><input type="checkbox" class="checkbox row-check" onchange="updateBulk()"></td>' +
      '<td>' +
        '<div class="flex items-c gap-3">' +
          '<div class="thumb"><i data-lucide="' + p.icon + '" style="color:' + p.iconColor + ';"></i></div>' +
          '<div class="min-w-0">' +
            '<div class="flex items-c gap-2">' +
              '<span class="t-sm" style="font-weight:700;">' + p.name + '</span>' +
              '<span class="badge badge-' + p.status[0] + ' ' + (p.note==='danger'||p.note==='warn'?'badge-pulse':'') + '" style="font-size:10px;">' + p.status[1] + '</span>' +
            '</div>' +
            '<div class="t-2xs c-text-5 mt-1"><span class="mono">' + p.sku + '</span> · ' + p.velocity + '</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div class="stock-cell">' +
          '<div class="flex items-c gap-2">' +
            '<span class="mono ' + stockColor + '" style="font-weight:800; font-size:16px;">' + p.avail + '</span>' +
            '<span class="t-2xs c-text-5">available</span>' +
          '</div>' +
          '<div class="t-2xs ' + daysColor + ' mt-1">' + daysText + '</div>' +
          '<div class="minibar">' +
            '<div class="minibar-fill" style="width:' + fillPct + '%; background:' + fillColor + ';"></div>' +
            '<div class="minibar-marker" style="left:' + markerPct + '%;" title="Reorder point"></div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div class="margin-cell">' +
          '<span class="mono t-sm" style="font-weight:700;">' + fmtRs(p.price) + '</span>' +
          '<span class="t-2xs c-text-5">cost ' + fmtRs(p.cost) + '</span>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div class="margin-cell">' +
          '<span class="mono c-success t-sm" style="font-weight:700;">' + fmtRs(profitPerUnit) + '</span>' +
          '<span class="t-2xs c-text-5">' + p.netMargin + '% per order</span>' +
        '</div>' +
      '</td>' +
      '<td><div class="flex gap-1">' + channelChips + '</div></td>' +
      '<td onclick="event.stopPropagation()">' +
        '<div class="row-actions">' +
          '<button class="ibtn" style="width:30px; height:30px;" title="Quick adjust" onclick="quickAdjust(\\'' + p.sku + '\\')"><i data-lucide="sliders-horizontal" style="width:15px;"></i></button>' +
          '<button class="ibtn" style="width:30px; height:30px;" title="More" onclick="openDetail(' + (start+i) + ')"><i data-lucide="more-horizontal" style="width:16px;"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
  
  document.querySelectorAll('#view-products .pill-row .pill').forEach(btn => {
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

window.currentMoveFilter = 'All';
window.currentReturnFilter = 'All';

window.setFilter = function(btn){
  const row = btn.parentElement;
  row.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const type = btn.textContent.split(/[0-9]/)[0].trim();
  
  const view = btn.closest('.view');
  if (view && view.id === 'view-movements') {
      window.currentMoveFilter = type;
      window.renderMovements();
  } else if (view && view.id === 'view-returns') {
      window.currentReturnFilter = type;
      window.renderReturns();
  } else {
      window.currentFilter = type;
      window.currentPage = 1;
      window.renderRows();
  }
}

document.addEventListener('click', function(e) {
  const pill = e.target.closest('.pill');
  if (pill && !pill.hasAttribute('onclick')) {
    window.setFilter(pill);
  }
});

window.switchTab = function(tabId) {
    document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
    const tabEl = document.querySelector('.inv-tab[data-tab="' + tabId + '"]');
    if (tabEl) tabEl.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById('view-' + tabId);
    if (viewEl) viewEl.classList.add('active');
};

window.renderMovements = function() {
  const tbody = document.getElementById('moveRows');
  if(!tbody) return;
  
  let filtered = window.movements || [];
  if (window.currentMoveFilter !== 'All') {
      filtered = filtered.filter(m => {
          const t = m.movement_type;
          return t === window.currentMoveFilter || (t + 's') === window.currentMoveFilter;
      });
  }

  window.currentMovePage = window.currentMovePage || 1;
  const paged = window.setupPagination('view-movements', filtered, window.renderMovements, 'currentMovePage', 'movements');

  tbody.innerHTML = paged.map(m => {
      return '<tr>' +
          '<td style="color:var(--text-4); font-size:12px;">' + new Date(m.created_at).toLocaleDateString() + '</td>' +
          '<td><span class="badge badge-neutral">' + m.movement_type + '</span></td>' +
          '<td class="mono c-jade">' + m.sku + '</td>' +
          '<td class="' + (m.qty > 0 ? 'c-success' : 'c-danger') + ' mono" style="font-weight:700;">' + (m.qty > 0 ? '+' : '') + m.qty + '</td>' +
          '<td class="c-text-3">' + m.reason + '</td>' +
          '<td class="mono t-xs c-text-4">' + (m.reference || '-') + '</td>' +
          '<td class="c-text-4">' + (m.user_name || '-') + '</td>' +
      '</tr>';
  }).join('');
  
  document.querySelectorAll('#view-movements .pill-row .pill').forEach(btn => {
      const type = btn.textContent.split(/[0-9]/)[0].trim();
      let count = 0;
      if (type === 'All') count = (window.movements||[]).length;
      else count = (window.movements||[]).filter(m => m.movement_type === type || (m.movement_type + 's') === type).length;
      
      const countSpan = btn.querySelector('.count');
      if(countSpan) countSpan.textContent = count;
      else btn.innerHTML += ' <span class="count">' + count + '</span>';
  });
};

window.renderPOs = function() {
  const tbody = document.getElementById('poRows');
  if(!tbody) return;
  
  window.currentPoPage = window.currentPoPage || 1;
  const filtered = window.pos || [];
  const paged = window.setupPagination('view-pos', filtered, window.renderPOs, 'currentPoPage', 'purchase orders');
  
  tbody.innerHTML = paged.map(p => {
      const isDraft = p.status === 'Draft';
      return '<tr>' +
          '<td class="mono t-sm c-jade" style="font-weight:700;">' + p.po_number + '</td>' +
          '<td><div class="flex items-c gap-2"><div class="avatar avatar-sm avatar-2">S</div><span class="c-text-2">' + p.supplier + '</span></div></td>' +
          '<td class="c-text-4">' + p.items + ' items</td>' +
          '<td class="mono t-sm c-text-2">Rs ' + p.total.toLocaleString() + '</td>' +
          '<td class="' + (isDraft ? 'c-text-5' : 'c-text-3') + '">' + (isDraft ? '-' : new Date(p.expected).toLocaleDateString()) + '</td>' +
          '<td><span class="badge ' + (isDraft ? 'badge-neutral' : 'badge-warn') + '">' + p.status + '</span></td>' +
          '<td><button class="ibtn"><i data-lucide="more-horizontal"></i></button></td>' +
      '</tr>';
  }).join('');
};

window.renderSuppliers = function() {
  const grid = document.getElementById('vendorGrid');
  if(!grid) return;
  grid.innerHTML = (window.vendors || []).map(s => {
      return '<div class="card card-action" style="padding:16px;">' +
        '<div class="flex items-s justify-b mb-3">' +
          '<div class="flex items-c gap-3">' +
            '<div class="avatar avatar-lg avatar-3">' + s.name.substring(0,2).toUpperCase() + '</div>' +
            '<div>' +
              '<div class="t-h4">' + s.name + '</div>' +
              '<div class="t-xs c-text-4 mt-1">' + s.email + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="ibtn" style="width:32px; height:32px;"><i data-lucide="more-horizontal" style="width:16px;"></i></button>' +
        '</div>' +
        '<div class="grid cols-3 gap-2 mb-4">' +
          '<div class="vendor-stat"><div class="num-sm c-text-2">' + s.lead_time + 'd</div><div class="t-2xs c-text-5 mt-1">Lead time</div></div>' +
          '<div class="vendor-stat"><div class="num-sm c-text-2">Rs ' + Math.floor(Math.random()*200) + 'k</div><div class="t-2xs c-text-5 mt-1">YTD spent</div></div>' +
          '<div class="vendor-stat"><div class="num-sm ' + (s.status==='Active' ? 'c-success' : 'c-warn') + '">' + s.status + '</div><div class="t-2xs c-text-5 mt-1">Status</div></div>' +
        '</div>' +
        '<div class="flex gap-2">' +
          '<button class="btn btn-sec btn-sm flex-1"><i data-lucide="mail" style="width:14px;"></i> Email</button>' +
          '<button class="btn btn-sec btn-sm flex-1"><i data-lucide="phone" style="width:14px;"></i> Call</button>' +
        '</div>' +
      '</div>';
  }).join('');
};

window.renderReturns = function() {
  const tbody = document.getElementById('returnRows');
  if(!tbody) return;
  
  let filtered = window.returnsProcessed || [];
  if (window.currentReturnFilter !== 'All') {
      filtered = filtered.filter(r => {
          if (window.currentReturnFilter === 'Damaged') return r.condition === 'Damaged' || r.status === 'Written off';
          return r.status === window.currentReturnFilter;
      });
  }

  window.currentReturnPage = window.currentReturnPage || 1;
  const paged = window.setupPagination('view-returns', filtered, window.renderReturns, 'currentReturnPage', 'returns');

  tbody.innerHTML = paged.map(r => {
      return '<tr>' +
          '<td class="mono c-text-3">' + r.rma + '</td>' +
          '<td class="mono c-text-4">' + r.order + '</td>' +
          '<td><div class="flex items-c gap-2"><div class="avatar avatar-sm">' + r.av + '</div><span class="c-text-2">' + r.cust + '</span></div></td>' +
          '<td class="c-text-3">' + r.item + '</td>' +
          '<td class="c-text-4">' + r.reason + '</td>' +
          '<td><span class="badge badge-neutral">' + r.condition + '</span></td>' +
          '<td><span class="badge ' + (r.status==='Restocked' ? 'badge-success' : r.status==='Written off' ? 'badge-danger' : 'badge-warn') + '">' + r.status + '</span></td>' +
      '</tr>';
  }).join('');
  
  document.querySelectorAll('#view-returns .pill-row .pill').forEach(btn => {
      const type = btn.textContent.split(/[0-9]/)[0].trim();
      let count = 0;
      if (type === 'All') count = (window.returnsProcessed||[]).length;
      else if (type === 'Damaged') count = (window.returnsProcessed||[]).filter(r => r.condition === 'Damaged' || r.status === 'Written off').length;
      else count = (window.returnsProcessed||[]).filter(r => r.status === type).length;
      
      const countSpan = btn.querySelector('.count');
      if(countSpan) countSpan.textContent = count;
      else btn.innerHTML += ' <span class="count">' + count + '</span>';
  });
};

window.openDetail = function(i){
  const p = window.products[i];
  if (!p) return;
  const dTitle = document.getElementById('dTitle');
  if (dTitle) dTitle.textContent = p.name;
  const dSku = document.getElementById('dSku');
  if (dSku) dSku.textContent = p.sku;
  const dOnHand = document.getElementById('dOnHand');
  if (dOnHand) dOnHand.textContent = p.onHand;
  const dReserved = document.getElementById('dReserved');
  if (dReserved) dReserved.textContent = p.reserved;
  const dAvail = document.getElementById('dAvail');
  if (dAvail) dAvail.textContent = p.avail;
  window.openDrawer('detailDrawer');
};

window.openDrawer = function(id){
  const ov = document.getElementById(id+'-ov');
  if(ov) ov.classList.add('show');
  const dr = document.getElementById(id);
  if(dr) dr.classList.add('show');
  document.body.style.overflow = 'hidden';
};

window.closeDrawer = function(id){
  const ov = document.getElementById(id+'-ov');
  if(ov) ov.classList.remove('show');
  const dr = document.getElementById(id);
  if(dr) dr.classList.remove('show');
  document.body.style.overflow = '';
};

window.switchDtab = function(btn, panelId){
  btn.parentElement.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.dtab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if(panel) panel.classList.add('active');
};

window.toggleAll = function(cb){
  document.querySelectorAll('.row-check').forEach(c => c.checked = cb.checked);
  window.updateBulk();
};

window.updateBulk = function(){
  const checked = document.querySelectorAll('.row-check:checked').length;
  const bar = document.getElementById('bulkBar');
  const count = document.getElementById('bulkCount');
  if(count) count.textContent = checked;
  if(bar) bar.style.display = checked > 0 ? 'flex' : 'none';
};

window.clearSelection = function(){
  document.querySelectorAll('.row-check').forEach(c => c.checked = false);
  const headCb = document.querySelector('thead .checkbox');
  if(headCb) headCb.checked = false;
  window.updateBulk();
};

window.showToast = function(msg){
  const toastMsg = document.getElementById('toastMsg');
  if(toastMsg) toastMsg.textContent = msg;
  const t = document.getElementById('toast');
  if(t) {
    t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(140%)'; }, 2600);
  }
};

window.doSync = function(){ 
  window.showToast('Syncing stock to Shopify, Daraz & WooCommerce…');
  const btn = event.currentTarget;
  const icon = btn.querySelector('i');
  if(icon){ icon.style.transition='transform 800ms var(--ease-snap)'; icon.style.transform='rotate(360deg)'; setTimeout(()=>{icon.style.transform='';},850); }
};

window.quickAdjust = function(sku){ window.showToast('Quick adjust for ' + sku + ' — opening…'); };

`;

const jsxCode = `
"use client";
import React, { useEffect } from "react";
import { getCurrentUserId } from "../../../lib/auth";
import './inventory-design.css';

export default function InventoryPage() {
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/lucide/0.456.0/lucide.min.js";
        script.onload = () => {
            if (window.lucide) window.lucide.createIcons();
        };
        document.body.appendChild(script);

        const jsScript = document.createElement("script");
        jsScript.innerHTML = ${JSON.stringify(jsLogic)};
        document.body.appendChild(jsScript);

        const fetchInventory = async () => {
            try {
                const userId = getCurrentUserId();
                let url = \`/api/inventory?page=1&search=\`;
                if (userId) url += \`&userId=\${encodeURIComponent(userId)}\`;
                
                const [prodRes, moveRes, poRes, supRes, retRes] = await Promise.all([
                    fetch(url),
                    fetch(\`/api/inventory/movements?userId=\${userId || ''}\`),
                    fetch(\`/api/inventory/pos?userId=\${userId || ''}\`),
                    fetch(\`/api/inventory/suppliers?userId=\${userId || ''}\`),
                    fetch(\`/api/inventory/returns?userId=\${userId || ''}\`)
                ]);

                if (prodRes.ok) {
                    const result = await prodRes.json();
                    if (result.data) {
                        window.products = result.data.map(p => ({
                            name: p.name,
                            sku: p.sku,
                            icon: 'package',
                            iconColor: 'var(--text-4)',
                            onHand: p.stock,
                            reserved: 0,
                            avail: p.stock,
                            reorder: 10,
                            daysLeft: 30,
                            velocity: '1.0/day',
                            cost: p.price * 0.6,
                            price: p.price,
                            netMargin: 40,
                            channels: [['w','ok']],
                            status: p.status === 'Out of Stock' ? ['danger', 'Out of stock'] : p.status === 'Low Stock' ? ['warn', 'Running out'] : p.status === 'Hidden' ? ['neutral', 'Hidden'] : p.status === 'Slow Mover' ? ['info', 'Slow mover'] : ['success', 'In stock'],
                            note: p.status === 'Out of Stock' ? 'danger' : p.status === 'Low Stock' ? 'warn' : ''
                        }));
                        if (window.renderRows) window.renderRows();
                    }
                }
                
                if (moveRes.ok) {
                    const mResult = await moveRes.json();
                    if (mResult.data) {
                        window.movements = mResult.data.map(m => ({
                            created_at: m.created_at,
                            movement_type: m.movement_type,
                            sku: m.products?.sku || 'Unknown',
                            qty: m.quantity,
                            reason: m.reason,
                            reference: m.reference,
                            user_name: m.user_name || 'System'
                        }));
                        if (window.renderMovements) window.renderMovements();
                    }
                }

                if (poRes.ok) {
                    const pResult = await poRes.json();
                    if (pResult.data) {
                        window.pos = pResult.data.map(p => ({
                            po_number: p.po_number,
                            supplier: p.suppliers?.name || 'Unknown',
                            items: 1, // mock
                            total: p.total_amount,
                            expected: p.expected_date,
                            status: p.status
                        }));
                        if (window.renderPOs) window.renderPOs();
                    }
                }

                if (supRes.ok) {
                    const sResult = await supRes.json();
                    if (sResult.data) {
                        window.vendors = sResult.data.map(s => ({
                            name: s.name,
                            email: s.email,
                            lead_time: s.lead_time_days,
                            status: s.status
                        }));
                        if (window.renderSuppliers) window.renderSuppliers();
                    }
                }

                if (retRes.ok) {
                    const rResult = await retRes.json();
                    if (rResult.data) {
                        window.returnsProcessed = rResult.data.map(r => ({
                            rma: r.rma_number || r.id,
                            order: r.order_id ? \`#\${r.order_id}\` : '-',
                            av: r.customers?.name ? r.customers.name.substring(0,2).toUpperCase() : 'C',
                            cust: r.customers?.name || 'Customer',
                            item: r.products?.name || 'Item',
                            reason: r.reason,
                            condition: r.condition,
                            status: r.status
                        }));
                        if (window.renderReturns) window.renderReturns();
                    }
                }
                
                if (window.updateKPIs) window.updateKPIs();

            } catch (err) {
                console.error("Failed to fetch inventory data:", err);
            }
        };

        fetchInventory();

        return () => {
            if (jsScript.parentNode) jsScript.parentNode.removeChild(jsScript);
        };
    }, []);

    return (
        <div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <style dangerouslySetInnerHTML={{ __html: ${JSON.stringify(styles)} }} />
            <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(pageHtml)} }} />
        </div>
    );
}
`;

fs.writeFileSync('components/dashboard/pages/InventoryPage.jsx', jsxCode);
console.log("Restored properly from HTML file with react integration and JSON.stringify to avoid template literal issues");
