const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const createProductCode = `
window.createProduct = async function() {
    try {
        const name = document.getElementById('addProdName')?.value;
        const sku = document.getElementById('addProdSku')?.value;
        const barcode = document.getElementById('addProdBarcode')?.value;
        const cost = document.getElementById('addProdCost')?.value;
        const price = document.getElementById('addProdPrice')?.value;
        const stock = document.getElementById('addProdStock')?.value;
        const reorder = document.getElementById('addProdReorder')?.value;
        const shopify = document.getElementById('addChanShopify')?.classList.contains('on');
        const daraz = document.getElementById('addChanDaraz')?.classList.contains('on');
        const woo = document.getElementById('addChanWoo')?.classList.contains('on');
        
        if (!name || !sku) {
            window.showToast('Name and SKU are required');
            return;
        }

        const userId = window.getCurrentUserId ? window.getCurrentUserId() : null;
        
        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                name: name,
                sku: sku,
                barcode: barcode,
                cost: cost,
                price: price,
                stock: stock,
                reorder: reorder,
                publish_shopify: shopify,
                publish_daraz: daraz,
                publish_woocommerce: woo
            })
        });
        
        if (res.ok) {
            window.showToast('Product created successfully!');
            window.closeDrawer('addDrawer');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            const err = await res.json();
            window.showToast('Error: ' + err.error);
        }
    } catch (error) {
        console.error('Error creating product:', error);
        window.showToast('Failed to create product');
    }
};
`;

content = content.replace('    }\\n  });\\n};\\n";', '    }\\n  });\\n};\\n' + createProductCode + '";');

fs.writeFileSync(path, content);
console.log("Patched JS code successfully.");
