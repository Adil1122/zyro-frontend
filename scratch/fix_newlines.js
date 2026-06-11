const fs = require('fs');
let content = fs.readFileSync('components/dashboard/pages/InventoryPage.jsx', 'utf8');

const startIdx = content.indexOf('window.toggleDropdown = function(e, id) {');
const endMarker = '};\\n";';
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const injectedCode = content.substring(startIdx, endIdx + endMarker.length);
    // Escape all unescaped newlines in the injected code
    let fixedCode = injectedCode.replace(/\r?\n/g, '\\n');
    // Ensure the end quote is correct
    fixedCode = fixedCode.replace(/};\\n\\n";$/, '};\n";'); // wait, the end is literally } ; \n " ;
    
    // Actually, just replace actual newlines with \n strings:
    content = content.substring(0, startIdx) + fixedCode + content.substring(endIdx + endMarker.length);
    fs.writeFileSync('components/dashboard/pages/InventoryPage.jsx', content, 'utf8');
    console.log('Fixed');
} else {
    console.log('Markers not found', startIdx, endIdx);
}
