import { generatePostExSlipPDF } from './lib/services/postexPdfService.js';
import fs from 'fs';

async function test() {
    try {
        console.log('Generating PDF...');
        const buffer = await generatePostExSlipPDF({
            trackingNumber: '29482690000064',
            orderRefNumber: '14704',
            customerName: 'M Naseem',
            customerPhone: '03001234567',
            deliveryAddress: 'Some address',
            amount: 0,
            date: new Date().toLocaleDateString()
        });
        fs.writeFileSync('test_slip.pdf', buffer);
        console.log('PDF generated successfully: test_slip.pdf');
    } catch (err) {
        console.error('Error generating PDF:', err);
    }
}

test();
