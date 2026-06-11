const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');
const searchString = 'jsScript.innerHTML = "';
const startIdx = content.indexOf(searchString) + searchString.length;
const endIdx = content.indexOf('";\n        document.body.appendChild(jsScript);', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const snippet = content.substring(startIdx, endIdx);
    const fixedSnippet = snippet.replace(/\r?\n/g, '\\n');
    content = content.substring(0, startIdx) + fixedSnippet + content.substring(endIdx);
    fs.writeFileSync('components/dashboard/pages/InventoryPage.jsx', content, 'utf8');
    console.log('Fixed whole script block');
} else {
    console.log('Markers not found', startIdx, endIdx);
}
