const fs = require('fs');
const pdf = require('pdf-parse');

console.log("pdf type:", typeof pdf);
console.log("pdf keys:", Object.keys(pdf || {}));

let dataBuffer = new Uint8Array(fs.readFileSync('postex-guide.pdf'));

console.log("PDFParse class string:", pdf.PDFParse.toString());
const pdfFunc = (data) => {
    try {
        const instance = new pdf.PDFParse(data);
        console.log("Instance created successfully, type:", typeof instance);
        // see if it has methods
        console.log("Instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));
        return Promise.resolve(instance);
    } catch(e) {
        console.error("Failed to construct PDFParse:", e);
        return Promise.reject(e);
    }
};

async function run() {
    const instance = new pdf.PDFParse(dataBuffer);
    console.log("Loading...");
    await instance.load();
    console.log("Loaded!");
    const text = await instance.getText();
    console.log("Total length of text:", text ? text.length : 0);
    
    // Find keywords
    const lines = text.split('\n');
    console.log("Total lines:", lines.length);
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('order/v1/create') || lines[i].includes('pickupAddressCode') || lines[i].includes('orderRefNumber')) {
            console.log(`Line ${i}: ${lines[i]}`);
            // print surrounding lines
            console.log("--- Surrounding ---");
            for (let j = Math.max(0, i - 15); j <= Math.min(lines.length - 1, i + 35); j++) {
                console.log(`${j}: ${lines[j]}`);
            }
            found = true;
            break;
        }
    }
    if (!found) {
        console.log("Could not find specific keywords. Printing first 100 lines:");
        for (let i = 0; i < Math.min(lines.length, 100); i++) {
            console.log(`${i}: ${lines[i]}`);
        }
    }
}
run().catch(console.error);
