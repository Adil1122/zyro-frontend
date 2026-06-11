const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStart = "window.createProduct = async function() {";
const targetEnd = '};\n";';

const startIndex = content.indexOf(targetStart);
if (startIndex !== -1) {
    const endIndex = content.indexOf(targetEnd, startIndex) + targetEnd.length;
    let block = content.substring(startIndex, endIndex);
    
    // Fix: replace literal newlines with \\n (the characters \ and n)
    // First, remove the last \n"; so we can safely escape
    block = block.substring(0, block.length - 4);
    
    let escapedBlock = block.replace(/\r?\n/g, '\\n') + '\\n";';
    
    content = content.substring(0, startIndex) + escapedBlock + content.substring(endIndex);
    fs.writeFileSync(path, content);
    console.log("Fixed syntax error.");
} else {
    console.log("Could not find the block.");
}
