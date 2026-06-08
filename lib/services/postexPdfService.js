import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
            backgroundcolor: 'ffffff'
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
 * Generate PostEx slip PDF as a Buffer using pdf-lib (Vercel Edge/Serverless friendly)
 */
export async function generatePostExSlipPDF(order) {
    try {
        const width = 800;
        const height = 400;

        // Create a new PDFDocument
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([width, height]);

        // Embed standard fonts
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const drawText = (text, x, y, size = 10, font = fontRegular, align = 'left', maxWidth = 0) => {
            if (!text) return;
            const textWidth = font.widthOfTextAtSize(text, size);
            let finalX = x;
            if (align === 'center' && maxWidth > 0) {
                finalX = x + (maxWidth - textWidth) / 2;
            }
            
            // In pdf-lib, y is from the BOTTOM of the page
            page.drawText(text, {
                x: finalX,
                y: height - y - size, // Adjust for bottom-origin
                size: size,
                font: font,
                color: rgb(0, 0, 0),
            });
        };

        const drawLine = (x1, y1, x2, y2) => {
            page.drawLine({
                start: { x: x1, y: height - y1 },
                end: { x: x2, y: height - y2 },
                thickness: 1,
                color: rgb(0, 0, 0)
            });
        };

        const drawRect = (x, y, w, h, fill = false) => {
            page.drawRectangle({
                x: x,
                y: height - y - h,
                width: w,
                height: h,
                borderColor: rgb(0, 0, 0),
                borderWidth: 1,
                color: fill ? rgb(0.88, 0.88, 0.88) : undefined,
            });
        };

        // 1. TOP HEADER SECTION
        drawText('PostEx', 30, 20, 32, fontBold);
        
        const trackingNo = order.trackingNumber || '';
        const orderRef = order.orderRefNumber || '';

        // Barcodes
        if (orderRef) {
            try {
                const refBarcode = await generateBarcode(orderRef);
                const refImage = await pdfDoc.embedPng(refBarcode);
                page.drawImage(refImage, { x: 180, y: height - 20 - 40, width: 150, height: 40 });
            } catch (err) {
                console.error('Ref Barcode error:', err);
            }
        }
        
        if (trackingNo) {
            try {
                const trackBarcode = await generateBarcode(trackingNo);
                const trackImage = await pdfDoc.embedPng(trackBarcode);
                page.drawImage(trackImage, { x: 450, y: height - 20 - 40, width: 150, height: 40 });
            } catch (err) {
                console.error('Tracking Barcode error:', err);
            }
        }

        drawText('RKT-77', 700, 30, 14, fontBold);

        // 2. MAIN TABLE LAYOUT
        const startY = 70;
        const col1X = 20;
        const col1Width = 300;
        
        const col2X = 320;
        const col2Width = 250;
        
        const col3X = 570;
        const col3Width = 210;
        
        const rowHeight = 20;

        // Outer Box
        drawRect(col1X, startY, width - 40, height - startY - 20);
        
        // Column Dividers
        drawLine(col2X, startY, col2X, height - 20);
        drawLine(col3X, startY, col3X, height - 40);

        // --- HEADER ROW ---
        drawRect(col1X, startY, width - 40, rowHeight, true); // filled header
        drawText('Consignee Information', col1X, startY + 5, 11, fontBold, 'center', col1Width);
        drawText('Shipment Information', col2X, startY + 5, 11, fontBold, 'center', col2Width);
        drawText('Order Information', col3X, startY + 5, 11, fontBold, 'center', col3Width);

        // --- COLUMN 1: Consignee Information ---
        let y = startY + rowHeight;
        drawLine(col1X, y, col3X, y);
        
        drawText('Name:', col1X + 5, y + 5, 10, fontRegular);
        drawText(order.customerName || '', col1X + 80, y + 5, 10, fontBold);
        
        y += rowHeight;
        drawLine(col1X, y, col2X, y);
        drawText('Contact:', col1X + 5, y + 5, 10, fontRegular);
        drawText(order.customerPhone || '', col1X + 80, y + 5, 10, fontBold);

        y += rowHeight;
        drawLine(col1X, y, col2X, y);
        drawText('Delivery', col1X + 5, y + 5, 10, fontRegular);
        drawText('Address:', col1X + 5, y + 15, 10, fontRegular);
        drawText((order.deliveryAddress || '').substring(0, 60), col1X + 80, y + 5, 9, fontBold);

        // Shipper Information Header
        y += 40;
        drawRect(col1X, y, col1Width, rowHeight, true);
        drawText('Shipper Information', col1X, y + 5, 11, fontBold, 'center', col1Width);

        // Shipper Info Details
        y += rowHeight;
        drawLine(col1X, y, col2X, y);
        drawText('Name:', col1X + 5, y + 5, 10, fontRegular);
        drawText(order.shipperName || 'Dayemens', col1X + 80, y + 5, 10, fontBold);

        y += rowHeight;
        drawLine(col1X, y, col2X, y);
        drawText('Contact:', col1X + 5, y + 5, 10, fontRegular);
        drawText(order.shipperContact || '0340 9233168', col1X + 80, y + 5, 10, fontBold);

        y += rowHeight;
        drawLine(col1X, y, col2X, y);
        drawText('Pickup', col1X + 5, y + 5, 10, fontRegular);
        drawText('Address:', col1X + 5, y + 15, 10, fontRegular);
        const defaultAddress = 'Office No 51, 2nd Floor, Top city plaza, GT road.';
        drawText((order.pickupAddress || defaultAddress).substring(0, 60), col1X + 80, y + 5, 9, fontBold);

        y += 40;
        drawLine(col1X, y, col2X, y);
        drawText('Return', col1X + 5, y + 5, 10, fontRegular);
        drawText('Address:', col1X + 5, y + 15, 10, fontRegular);
        drawText((order.returnAddress || defaultAddress).substring(0, 60), col1X + 80, y + 5, 9, fontBold);

        // --- COLUMN 2: Shipment Information ---
        let cy2 = startY + rowHeight;
        const drawCol2Row = (label, value, heightOffset = rowHeight) => {
            drawLine(col2X, cy2, col3X, cy2);
            drawText(label, col2X + 5, cy2 + 5, 10, fontRegular);
            drawText(String(value).substring(0, 40), col2X + 80, cy2 + 5, 10, fontBold);
            cy2 += heightOffset;
        };

        drawCol2Row('Pieces:', order.items || 1);
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
            // Extract base64 part
            const base64Image = qrDataUrl.split(';base64,').pop();
            const qrImage = await pdfDoc.embedPng(base64Image);
            page.drawImage(qrImage, { x: col3X + 50, y: height - (startY + 25) - 110, width: 110, height: 110 });
        } catch (err) {
            console.error('QR code generation error:', err);
        }

        // Order Info details
        let cy3 = startY + 160;
        drawLine(col3X, cy3, width - 20, cy3);
        
        drawText('Amount:', col3X + 5, cy3 + 10, 10, fontRegular);
        drawText(`${order.amount || '0.00'}/-`, col3X + 80, cy3 + 10, 12, fontBold);
        
        cy3 += 40;
        drawLine(col3X, cy3, width - 20, cy3);
        drawText('Date:', col3X + 5, cy3 + 15, 10, fontRegular);
        drawText(order.date || new Date().toLocaleDateString(), col3X + 80, cy3 + 15, 11, fontBold);
        
        cy3 += 40;
        drawLine(col3X, cy3, width - 20, cy3);
        drawText('Order Type:', col3X + 5, cy3 + 15, 10, fontRegular);
        drawText(order.orderType || 'Normal', col3X + 80, cy3 + 15, 11, fontBold);

        // --- BOTTOM ROW: Order Details ---
        const bottomY = height - 40;
        drawLine(col1X, bottomY, width - 20, bottomY);
        drawText('Order Details:', col1X + 5, bottomY + 10, 10, fontRegular);
        drawText((order.orderDetail || 'test').substring(0, 100), col1X + 80, bottomY + 10, 10, fontBold);

        // Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);

    } catch (err) {
        console.error('PDF Generation Error:', err);
        throw err;
    }
}
