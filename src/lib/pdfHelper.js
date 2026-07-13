import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generateInvoicePDF(sale, shop, action = 'download') {
  if (!sale || !shop) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (Retail Corporate Blue & Charcoal theme)
  const primaryColor = [28, 56, 121]; // #1c3879 - Dark Indigo/Blue
  const secondaryColor = [31, 41, 55]; // #1f2937 - Slate 800
  const textColor = [55, 65, 81]; // #374151 - Slate 700
  const borderLight = [209, 213, 219]; // slate 300
  const lightBg = [243, 244, 246]; // gray 100

  // Margins
  const m = 15;
  const contentWidth = pageWidth - (m * 2); // 180mm

  // --- 1. SUPERMARKET BILL HEADER (CENTERED DESIGN) ---
  let y = 14;

  // Shop Name (Large bold retail style)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(shop.shopName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Address & Tel (Centered)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  if (shop.address) {
    const splitAddress = doc.splitTextToSize(shop.address, contentWidth - 40);
    splitAddress.forEach(line => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 4;
    });
  }
  doc.text(`Phone: ${shop.phone}  |  GSTIN: 33AAAAA1234A1Z1  |  Store Code: MS-8910`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Invoice Heading (Large Block Bar)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(m, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE / CASH BILL', pageWidth / 2, y + 5, { align: 'center' });
  y += 11;

  // --- 2. MULTI-COLUMN META PANEL ---
  // We draw a grid panel of metadata with clean horizontal lines
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(m, y, pageWidth - m, y); // top line
  y += 4;

  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE NO:', m + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.invoiceNumber || `INV-${sale.id}`, m + 26, y);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE & TIME:', m + 65, y);
  doc.setFont('helvetica', 'normal');
  const dateObj = new Date(sale.timestamp);
  doc.text(`${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, m + 88, y);

  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', m + 130, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName ? sale.customerName.toUpperCase() : 'WALK-IN CUSTOMER', m + 148, y);

  y += 5;

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('POS COUNTER:', m + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text('COUNTER 03', m + 26, y);

  doc.setFont('helvetica', 'bold');
  doc.text('CASHIER:', m + 65, y);
  doc.setFont('helvetica', 'normal');
  doc.text(shop.ownerName ? shop.ownerName.toUpperCase() : 'STORE AGENT', m + 88, y);

  doc.setFont('helvetica', 'bold');
  doc.text('CONTACT NO:', m + 130, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerPhone || 'N/A', m + 148, y);

  y += 4;
  doc.line(m, y, pageWidth - m, y); // bottom line
  y += 6;

  // --- 3. PRODUCTS TABLE WITH EXACT SPECIFIED COLUMNS & ALIGNMENTS ---
  const tableColumn = ['S.No', 'Product Description', 'HSN', 'MRP', 'Qty', 'Disc %', 'Taxable Val', 'GST %', 'Net Amount'];
  const tableRows = [];

  const items = Array.isArray(sale.items) ? sale.items : JSON.parse(sale.items || '[]');

  let totalItemsCount = items.length;
  let totalQtyCount = 0;

  items.forEach((item, index) => {
    totalQtyCount += item.quantity;
    const basePrice = item.price * item.quantity;
    const discountAmt = basePrice * ((item.discountPercent || 0) / 100);
    const taxableVal = basePrice - discountAmt;
    const taxAmt = taxableVal * ((item.taxPercent || 0) / 100);
    const itemTotal = taxableVal + taxAmt;

    const mockHSN = item.hsn || String(2106 + Math.floor(Math.random() * 7000));

    tableRows.push([
      index + 1,
      item.name.toUpperCase(),
      mockHSN,
      item.price.toFixed(2),
      item.quantity,
      item.discountPercent > 0 ? `${item.discountPercent}%` : '0%',
      taxableVal.toFixed(2),
      item.taxPercent > 0 ? `${item.taxPercent}%` : '0%',
      itemTotal.toFixed(2)
    ]);
  });

  autoTable(doc, {
    startY: y,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: borderLight
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: borderLight
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // S.No
      1: { cellWidth: 50, halign: 'left' },   // Product Description
      2: { cellWidth: 15, halign: 'center' }, // HSN
      3: { cellWidth: 18, halign: 'right' },  // MRP
      4: { cellWidth: 12, halign: 'center' }, // Qty
      5: { cellWidth: 15, halign: 'center' }, // Disc %
      6: { cellWidth: 20, halign: 'right' },  // Taxable Val
      7: { cellWidth: 15, halign: 'center' }, // GST %
      8: { cellWidth: 25, halign: 'right' }   // Net Amount
    },
    margin: { left: m, right: m }
  });

  y = doc.lastAutoTable.finalY + 6;

  // Check overflow
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 20;
  }

  // --- 4. COUNTER SUMMARY SUMMARY STATS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`TOTAL ITEMS IN BASKET: ${totalItemsCount}  |  TOTAL PIECES: ${totalQtyCount}`, m, y);
  y += 4;
  doc.line(m, y, pageWidth - m, y);
  y += 6;

  // --- 5. STACKED SUMMARY & GST BREAKDOWN TABLES ---
  // We place the GST table on the left and the grand totals on the right, aligned perfectly
  const leftColW = 100;
  const rightColStart = m + leftColW + 8;
  const rightColW = contentWidth - leftColW - 8;

  // Compile GST slabs
  const taxSlabs = {};
  items.forEach(item => {
    const taxRate = item.taxPercent || 0;
    const baseVal = item.price * item.quantity;
    const disc = baseVal * ((item.discountPercent || 0) / 100);
    const taxableVal = baseVal - disc;
    const taxAmt = taxableVal * (taxRate / 100);

    if (!taxSlabs[taxRate]) {
      taxSlabs[taxRate] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
    }
    taxSlabs[taxRate].taxable += taxableVal;
    taxSlabs[taxRate].cgst += taxAmt / 2;
    taxSlabs[taxRate].sgst += taxAmt / 2;
    taxSlabs[taxRate].totalTax += taxAmt;
  });

  const gstBreakdownRows = Object.keys(taxSlabs).map(slab => {
    const data = taxSlabs[slab];
    return [
      `${slab}%`,
      data.taxable.toFixed(2),
      data.cgst.toFixed(2),
      data.sgst.toFixed(2),
      data.totalTax.toFixed(2)
    ];
  });

  // Render GST Table (Left Aligned)
  doc.text('GST SUMMARY ANALYSIS', m, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Tax %', 'Taxable Val', 'CGST (9%)', 'SGST (9%)', 'Total GST']],
    body: gstBreakdownRows,
    theme: 'grid',
    headStyles: {
      fillColor: [75, 85, 99], // gray 600
      textColor: [255, 255, 255],
      fontSize: 7.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
      halign: 'right'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 }
    },
    margin: { left: m }
  });

  // Calculate the y coordinates to ensure perfect alignment
  const gstTableEndY = doc.lastAutoTable.finalY;

  // Render Right Column Grand Totals Block
  let calcY = y + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  doc.text('Gross Amount:', rightColStart, calcY);
  doc.text(`${sale.subtotal.toFixed(2)}`, pageWidth - m - 2, calcY, { align: 'right' });
  calcY += 5;

  doc.text('Less Scheme Disc:', rightColStart, calcY);
  doc.text(`-${sale.discountTotal.toFixed(2)}`, pageWidth - m - 2, calcY, { align: 'right' });
  calcY += 5;

  doc.text('Total CGST (A):', rightColStart, calcY);
  doc.text(`${(sale.taxTotal / 2).toFixed(2)}`, pageWidth - m - 2, calcY, { align: 'right' });
  calcY += 5;

  doc.text('Total SGST (B):', rightColStart, calcY);
  doc.text(`${(sale.taxTotal / 2).toFixed(2)}`, pageWidth - m - 2, calcY, { align: 'right' });
  calcY += 5.5;

  // Total Separator Double lines
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.4);
  doc.line(rightColStart, calcY - 2.5, pageWidth - m, calcY - 2.5);
  doc.line(rightColStart, calcY - 1.8, pageWidth - m, calcY - 1.8);

  // NET AMOUNT DUE (Bold highlighting box)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(rightColStart, calcY - 0.5, rightColW, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('NET PAYABLE:', rightColStart + 2, calcY + 5);
  doc.text(`₹${sale.grandTotal.toFixed(2)}`, pageWidth - m - 2, calcY + 5, { align: 'right' });

  // SAVINGS BANNER (MNC supermarket highlight)
  if (sale.discountTotal > 0) {
    calcY += 12;
    doc.setFillColor(236, 253, 245); // light green bg
    doc.rect(rightColStart, calcY - 4, rightColW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129); // success green text
    doc.text(`🎉 TOTAL SAVINGS: ₹${sale.discountTotal.toFixed(2)}`, rightColStart + 3, calcY + 1);
  }

  // Get current Y positioning
  const totalsEndY = calcY + 8;
  y = Math.max(gstTableEndY, totalsEndY) + 8;

  if (y > pageHeight - 55) {
    doc.addPage();
    y = 20;
  }

  // --- 6. UPI PAYMENT SCANNER & CASHIER SIGNATURE BAR ---
  doc.line(m, y, pageWidth - m, y); // divider
  y += 5;

  // Mock QR payment box
  const qrSize = 18;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.rect(m, y, qrSize, qrSize);
  
  // Design mock internal QR details
  doc.setFillColor(15, 23, 42);
  doc.rect(m + 1, y + 1, 4, 4, 'F');
  doc.rect(m + qrSize - 5, y + 1, 4, 4, 'F');
  doc.rect(m + 1, y + qrSize - 5, 4, 4, 'F');
  doc.rect(m + 6, y + 6, 2, 2, 'F');
  doc.rect(m + 10, y + 4, 3, 2, 'F');
  doc.rect(m + 4, y + 9, 3, 3, 'F');
  doc.rect(m + 9, y + 11, 4, 2, 'F');
  doc.rect(m + 12, y + 12, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('PAYMENT DETAILS:', m + qrSize + 4, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Mode of Payment: UPI / WALLET / CASH', m + qrSize + 4, y + 7);
  doc.text('Transaction ID: TXN998877665544', m + qrSize + 4, y + 11);
  doc.text('Scan the QR code to pay using any UPI App.', m + qrSize + 4, y + 15);

  // Cashier signatory box (Right aligned)
  const sigX = pageWidth - m - 45;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('E.&O.E.', sigX, y + 3);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(sigX, y + 12, sigX + 45, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED SIGNATURE', sigX + 5, y + 16);

  y += qrSize + 8;

  // --- 7. CORPORATE RETAIL TERMS & CONDITIONS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('TERMS OF SALE & DISCLOSURES:', m, y);

  const mncTerms = 
    `1. Exchange policies: Items in clean sellable package will be exchanged within 7 days of purchase. No cash refunds.\n` +
    `2. Strict non-returnable items: Fresh dairy, fruits, vegetables, baby care products, undergarments, and promotional items.\n` +
    `3. GST tax rates are declared in accordance with HSN code lists. Please check all calculations before exiting counter.\n` +
    `4. All legal matters and transactions are strictly subject to local municipal jurisdiction. Thank you for visiting us!`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitMncTerms = doc.splitTextToSize(mncTerms, contentWidth);
  doc.text(splitMncTerms, m, y + 3);

  // Footer Pagination Info
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175); // gray 400
    doc.text(
      `Page ${i} of ${totalPages}  |  Powered by Sabari Retail Cloud Suite Engine (Offline)`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // --- 8. Execute PDF Output Action ---
  const fileName = `Invoice_${sale.invoiceNumber || sale.id}.pdf`;

  if (action === 'share') {
    try {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${sale.invoiceNumber || sale.id}`,
          text: `Here is your shopping invoice from ${shop.shopName}.`
        });
      } else {
        doc.save(fileName);
        alert("Web Sharing not supported on this device. File downloaded locally.");
      }
    } catch (err) {
      console.error("Failed to share via API, downloading:", err);
      doc.save(fileName);
    }
  } else {
    doc.save(fileName);
  }
}
