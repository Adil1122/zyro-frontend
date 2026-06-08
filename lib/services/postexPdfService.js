import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

/**
 * Helper to generate barcode buffer
 */
async function generateBarcode(text) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',
            text: text,
            scale: 2,
            height: 10,
            includetext: true,
            textxalign: 'center',
        }, function (err, png) {
            if (err) {
                reject(err);
            } else {
                resolve(png);
            }
        });
    });
}

/**
 * Generate PostEx slip PDF as a Buffer
 */
export async function generatePostExSlipPDF(order) {
    return new Promise(async (resolve, reject) => {
        try {
            // Default configuration
            const width = 800;
            const height = 400;
            const doc = new PDFDocument({ size: [width, height], margin: 20 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Fonts
            // We use standard Helvetica fonts.
            
            // 1. TOP HEADER SECTION
            // PostEx Logo (Text)
            doc.font('Helvetica-Bold').fontSize(32).text('PostEx', 30, 20);
            
            const trackingNo = order.trackingNumber || '';
            const orderRef = order.orderRefNumber || '';

            // Barcodes
            try {
                if (orderRef) {
                    const refBarcode = await generateBarcode(orderRef);
                    doc.image(refBarcode, 180, 20, { width: 150, height: 40 });
                }
                
                if (trackingNo) {
                    const trackBarcode = await generateBarcode(trackingNo);
                    doc.image(trackBarcode, 450, 20, { width: 150, height: 40 });
                }
            } catch (err) {
                console.error('Barcode generation error:', err);
            }

            // Top right routing info
            doc.font('Helvetica-Bold').fontSize(14).text('RKT-77', 700, 30);

            // 2. MAIN TABLE LAYOUT
            const startY = 70;
            const col1X = 20;
            const col1Width = 300;
            
            const col2X = 320;
            const col2Width = 250;
            
            const col3X = 570;
            const col3Width = 210;

            const rowHeight = 20;

            // Table Border Lines
            doc.lineWidth(1);
            // Outer Box
            doc.rect(col1X, startY, width - 40, height - startY - 20).stroke();
            
            // Column Dividers
            doc.moveTo(col2X, startY).lineTo(col2X, height - 20).stroke();
            doc.moveTo(col3X, startY).lineTo(col3X, height - 40).stroke(); // Order Info col doesn't go to very bottom
            
            // --- HEADER ROW ---
            doc.rect(col1X, startY, width - 40, rowHeight).fillAndStroke('#e0e0e0', '#000000');
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
            doc.text('Consignee Information', col1X, startY + 5, { width: col1Width, align: 'center' });
            doc.text('Shipment Information', col2X, startY + 5, { width: col2Width, align: 'center' });
            doc.text('Order Information', col3X, startY + 5, { width: col3Width, align: 'center' });

            // --- COLUMN 1: Consignee Information ---
            let y = startY + rowHeight;
            doc.moveTo(col1X, y).lineTo(col3X, y).stroke();
            
            doc.font('Helvetica').fontSize(10);
            doc.text('Name:', col1X + 5, y + 5);
            doc.font('Helvetica-Bold').text(order.customerName || '', col1X + 80, y + 5);
            
            y += rowHeight;
            doc.moveTo(col1X, y).lineTo(col2X, y).stroke();
            doc.font('Helvetica').text('Contact:', col1X + 5, y + 5);
            doc.font('Helvetica-Bold').text(order.customerPhone || '', col1X + 80, y + 5);

            y += rowHeight;
            doc.moveTo(col1X, y).lineTo(col2X, y).stroke();
            doc.font('Helvetica').text('Delivery', col1X + 5, y + 5);
            doc.text('Address:', col1X + 5, y + 15);
            doc.font('Helvetica-Bold').fontSize(9).text(order.deliveryAddress || '', col1X + 80, y + 5, { width: col1Width - 85, height: 35 });

            // Shipper Information Header
            y += 40;
            doc.rect(col1X, y, col1Width, rowHeight).fillAndStroke('#e0e0e0', '#000000');
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
            doc.text('Shipper Information', col1X, y + 5, { width: col1Width, align: 'center' });

            // Shipper Info Details
            y += rowHeight;
            doc.moveTo(col1X, y).lineTo(col2X, y).stroke();
            doc.font('Helvetica').fontSize(10);
            doc.text('Name:', col1X + 5, y + 5);
            doc.font('Helvetica-Bold').text(order.shipperName || 'Dayemens', col1X + 80, y + 5);

            y += rowHeight;
            doc.moveTo(col1X, y).lineTo(col2X, y).stroke();
            doc.font('Helvetica').text('Contact:', col1X + 5, y + 5);
            doc.font('Helvetica-Bold').text(order.shipperContact || '0340 9233168', col1X + 80, y + 5);

            y += rowHeight;
            doc.moveTo(col1X, y).lineTo(col2X, y).stroke();
            doc.font('Helvetica').text('Pickup', col1X + 5, y + 5);
            doc.text('Address:', col1X + 5, y + 15);
            const defaultAddress = 'Office No 51, 2nd Floor, Top city plaza, GT road, Near Al-Jannat Bakers.';
            doc.font('Helvetica-Bold').fontSize(9).text(order.pickupAddress || defaultAddress, col1X + 80, y + 5, { width: col1Width - 85 });

            y += 40;
            doc.moveTo(col1X, y).lineTo(col2X, y).stroke();
            doc.font('Helvetica').fontSize(10);
            doc.text('Return', col1X + 5, y + 5);
            doc.text('Address:', col1X + 5, y + 15);
            doc.font('Helvetica-Bold').fontSize(9).text(order.returnAddress || defaultAddress, col1X + 80, y + 5, { width: col1Width - 85 });

            // --- COLUMN 2: Shipment Information ---
            let cy2 = startY + rowHeight;
            const drawCol2Row = (label, value, height = rowHeight) => {
                doc.moveTo(col2X, cy2).lineTo(col3X, cy2).stroke();
                doc.font('Helvetica').fontSize(10).text(label, col2X + 5, cy2 + 5);
                doc.font('Helvetica-Bold').text(value, col2X + 80, cy2 + 5, { width: col2Width - 85 });
                cy2 += height;
            };

            drawCol2Row('Pieces:', String(order.items || 1));
            drawCol2Row('Order Ref:', orderRef);
            drawCol2Row('Tracking No:', trackingNo);
            drawCol2Row('Origin:', order.origin || 'HARIPUR');
            drawCol2Row('Destination:', order.destination || '');
            drawCol2Row('Return City:', order.returnCity || order.origin || 'HARIPUR');
            drawCol2Row('Remarks:', order.remarks || 'test', 80);

            // --- COLUMN 3: Order Information ---
            // QR Code
            try {
                const qrUrl = order.trackingNumber ? `https://track.postex.pk/${order.trackingNumber}` : orderRef;
                const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1 });
                // draw QR
                doc.image(qrDataUrl, col3X + 50, startY + 25, { width: 110, height: 110 });
            } catch (err) {
                console.error('QR code generation error:', err);
            }

            // Order Info details
            let cy3 = startY + 160;
            doc.moveTo(col3X, cy3).lineTo(width - 20, cy3).stroke();
            
            doc.font('Helvetica').fontSize(10);
            doc.text('Amount:', col3X + 5, cy3 + 10);
            doc.font('Helvetica-Bold').fontSize(12).text(`${order.amount || '0.00'}/-`, col3X + 80, cy3 + 10);
            
            cy3 += 40;
            doc.moveTo(col3X, cy3).lineTo(width - 20, cy3).stroke();
            doc.font('Helvetica').fontSize(10).text('Date:', col3X + 5, cy3 + 15);
            doc.font('Helvetica-Bold').fontSize(11).text(order.date || new Date().toLocaleDateString(), col3X + 80, cy3 + 15);
            
            cy3 += 40;
            doc.moveTo(col3X, cy3).lineTo(width - 20, cy3).stroke();
            doc.font('Helvetica').fontSize(10).text('Order Type:', col3X + 5, cy3 + 15);
            doc.font('Helvetica-Bold').fontSize(11).text(order.orderType || 'Normal', col3X + 80, cy3 + 15);

            // --- BOTTOM ROW: Order Details ---
            const bottomY = height - 40;
            doc.moveTo(col1X, bottomY).lineTo(width - 20, bottomY).stroke();
            doc.font('Helvetica').fontSize(10).text('Order Details:', col1X + 5, bottomY + 10);
            doc.font('Helvetica-Bold').text(order.orderDetail || 'test', col1X + 80, bottomY + 10, { width: width - 120 });

            // Finalize PDF file
            doc.end();
            
        } catch (err) {
            console.error('PDF Generation Error:', err);
            reject(err);
        }
    });
}
