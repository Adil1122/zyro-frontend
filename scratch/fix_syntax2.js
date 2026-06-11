const fs = require('fs');
const path = 'd:/xampp/htdocs/zyro-new/zyro-frontend/components/dashboard/pages/InventoryPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// The string starts on line 26 with jsScript.innerHTML = "\nwindow...
content = content.replace('jsScript.innerHTML = "\\nwindow.currentPage = 1;', 'jsScript.innerHTML = `\\nwindow.currentPage = 1;');

// The string ends with };\n";
content = content.replace('    }\\n};\\n";', '    }\\n};\\n`;');
content = content.replace('    }\\n}\\n";', '    }\\n}\\n`;');
content = content.replace('    }\\n};\\n\\";', '    }\\n};\\n`;');

// Since the user might have formatted it exactly like:
// 77: };
// 78: ";
// Let's use regex to replace the exact closing sequence:
content = content.replace(/};\s*";\s*document\.body\.appendChild\(jsScript\);/g, '};\n`;\n        document.body.appendChild(jsScript);');

fs.writeFileSync(path, content);
console.log("Replaced quotes with backticks.");
