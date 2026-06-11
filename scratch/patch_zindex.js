const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// The issue is that `.page > *` has an animation which creates a stacking context.
// `.page-h` is rendered before the views, so it has a lower stacking order than the views.
// We need to add position:relative and z-index: 100 to .page-h.

content = content.replace(
    '<div class=\\"page-h\\">',
    '<div class=\\"page-h\\" style=\\"position:relative; z-index:200;\\">'
);

fs.writeFileSync(path, content);
console.log("Patched page-h z-index successfully.");
