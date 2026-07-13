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
  const borderLight = [226, 232, 240]; // slate 200
  const lightBg = [243, 244, 246]; // gray 100

  // Narrower margin for high density single-page layout
  const m = 12;
  const contentWidth = pageWidth - (m * 2); // 186mm

  // --- 1. SUPERMARKET BILL HEADER ---
  let y = 12;

  // Shop Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(shop.shopName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Address & Tel (Centered)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  if (shop.address) {
    const splitAddress = doc.splitTextToSize(shop.address, contentWidth - 40);
    splitAddress.forEach(line => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 3.5;
    });
  }
  doc.text(`Phone: ${shop.phone}  |  GSTIN: 33AAAAA1234A1Z1  |  Store Code: MS-8910`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Invoice Heading (Large Block Bar)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(m, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE / CASH BILL', pageWidth / 2, y + 4.5, { align: 'center' });
  y += 9;

  // --- 2. MULTI-COLUMN META PANEL (USING AUTOTABLE FOR PERFECT AUTO-ALIGNMENT) ---
  const dateObj = new Date(sale.timestamp);
  
  autoTable(doc, {
    startY: y,
    body: [
      [
        { content: 'INVOICE NO:', styles: { fontStyle: 'bold' } }, sale.invoiceNumber || `INV-${sale.id}`,
        { content: 'DATE & TIME:', styles: { fontStyle: 'bold' } }, `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        { content: 'BILL TO:', styles: { fontStyle: 'bold' } }, sale.customerName ? sale.customerName.toUpperCase() : 'WALK-IN CUSTOMER'
      ],
      [
        { content: 'POS COUNTER:', styles: { fontStyle: 'bold' } }, 'COUNTER 03',
        { content: 'CASHIER:', styles: { fontStyle: 'bold' } }, shop.ownerName ? shop.ownerName.toUpperCase() : 'STORE AGENT',
        { content: 'CONTACT NO:', styles: { fontStyle: 'bold' } }, sale.customerPhone || 'N/A'
      ]
    ],
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      cellPadding: 0.8,
      textColor: secondaryColor,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22 },
      3: { cellWidth: 38 },
      4: { cellWidth: 20 },
      5: { cellWidth: 49 }
    },
    margin: { left: m, right: m }
  });

  y = doc.lastAutoTable.finalY + 3;

  // Thin grid divider line
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(m, y, pageWidth - m, y);
  y += 4;

  // --- 3. PRODUCTS TABLE WITH EXACT SPECIFIED COLUMNS & ALIGNMENTS ---
  const tableColumn = ['S.No', 'Product Description', 'HSN', 'Price (Rs.)', 'Qty', 'Disc %', 'Taxable Val', 'GST %', 'Net Amount'];
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
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: borderLight
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: borderLight
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // S.No
      1: { cellWidth: 52, halign: 'left' },   // Product Description
      2: { cellWidth: 15, halign: 'center' }, // HSN
      3: { cellWidth: 18, halign: 'right' },  // Price (Rs.)
      4: { cellWidth: 12, halign: 'center' }, // Qty
      5: { cellWidth: 15, halign: 'center' }, // Disc %
      6: { cellWidth: 20, halign: 'right' },  // Taxable Val
      7: { cellWidth: 15, halign: 'center' }, // GST %
      8: { cellWidth: 29, halign: 'right' }   // Net Amount
    },
    margin: { left: m, right: m }
  });

  y = doc.lastAutoTable.finalY + 4;

  // Check overflow before rendering summary sections to guarantee Single Page fit if possible
  if (y > pageHeight - 78) {
    doc.addPage();
    y = 12;
  }

  // Basket summary row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`TOTAL ITEMS IN BASKET: ${totalItemsCount}  |  TOTAL PIECES: ${totalQtyCount}`, m, y);
  y += 3;
  doc.line(m, y, pageWidth - m, y);
  y += 4;

  // --- 4. SIDE-BY-SIDE SUMMARY & GST BREAKDOWN TABLES ---
  // Place GST Table on the left (width 98mm) and Totals on the right (width 80mm)
  const leftColW = 98;
  const rightColStart = m + leftColW + 8; // 12 + 98 + 8 = 118mm
  const rightColW = contentWidth - leftColW - 8; // 186 - 98 - 8 = 80mm

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
    const halfSlab = parseFloat(slab) / 2;
    return [
      `${slab}%`,
      data.taxable.toFixed(2),
      `${halfSlab}%`,
      data.cgst.toFixed(2),
      `${halfSlab}%`,
      data.sgst.toFixed(2),
      data.totalTax.toFixed(2)
    ];
  });

  // Render GST Table (Left Aligned)
  doc.text('GST SUMMARY BREAKDOWN', m, y);
  autoTable(doc, {
    startY: y + 1.5,
    head: [['GST %', 'Taxable Val', 'CGST %', 'CGST', 'SGST %', 'SGST', 'Total GST']],
    body: gstBreakdownRows,
    theme: 'grid',
    headStyles: {
      fillColor: [75, 85, 99], // gray 600
      textColor: [255, 255, 255],
      fontSize: 7,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textColor,
      halign: 'right'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 15 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 14 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 14 },
      6: { cellWidth: 19 }
    },
    margin: { left: m }
  });

  const gstTableEndY = doc.lastAutoTable.finalY;

  // Render Right Column Grand Totals Block (Vertically aligned with GST table)
  let calcY = y + 1.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  doc.text('Gross Amount:', rightColStart, calcY + 2);
  doc.text(`${sale.subtotal.toFixed(2)}`, pageWidth - m - 1, calcY + 2, { align: 'right' });
  calcY += 4.2;

  doc.text('Less Scheme Disc:', rightColStart, calcY + 2);
  doc.text(`-${sale.discountTotal.toFixed(2)}`, pageWidth - m - 1, calcY + 2, { align: 'right' });
  calcY += 4.2;

  doc.text('Total CGST:', rightColStart, calcY + 2);
  doc.text(`${(sale.taxTotal / 2).toFixed(2)}`, pageWidth - m - 1, calcY + 2, { align: 'right' });
  calcY += 4.2;

  doc.text('Total SGST:', rightColStart, calcY + 2);
  doc.text(`${(sale.taxTotal / 2).toFixed(2)}`, pageWidth - m - 1, calcY + 2, { align: 'right' });
  calcY += 4.5;

  // Total Separator Lines
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.35);
  doc.line(rightColStart, calcY + 1, pageWidth - m, calcY + 1);
  doc.line(rightColStart, calcY + 1.5, pageWidth - m, calcY + 1.5);
  calcY += 2;

  // NET AMOUNT DUE Highlight block
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(rightColStart, calcY, rightColW, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('NET PAYABLE:', rightColStart + 2, calcY + 4.8);
  doc.text(`Rs. ${sale.grandTotal.toFixed(2)}`, pageWidth - m - 2, calcY + 4.8, { align: 'right' });

  // SAVINGS BANNER (No special character encoding)
  if (sale.discountTotal > 0) {
    calcY += 9;
    doc.setFillColor(236, 253, 245); // light green bg
    doc.rect(rightColStart, calcY - 1, rightColW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129); // success green text
    doc.text(`TOTAL SAVINGS: Rs. ${sale.discountTotal.toFixed(2)}`, rightColStart + 3.5, calcY + 3.2);
  }

  const totalsEndY = calcY + 8;
  y = Math.max(gstTableEndY, totalsEndY) + 6;

  if (y > pageHeight - 45) {
    doc.addPage();
    y = 12;
  }

  // --- 5. UPI PAYMENT SCANNER & CASHIER SIGNATURE BAR ---
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(m, y, pageWidth - m, y); // divider
  y += 4;

  // Mock QR payment box
  const qrSize = 16;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.rect(m, y, qrSize, qrSize);
  
  // Design mock internal QR details
  doc.setFillColor(15, 23, 42);
  doc.rect(m + 1, y + 1, 3.5, 3.5, 'F');
  doc.rect(m + qrSize - 4.5, y + 1, 3.5, 3.5, 'F');
  doc.rect(m + 1, y + qrSize - 4.5, 3.5, 3.5, 'F');
  doc.rect(m + 5.5, y + 5.5, 2, 2, 'F');
  doc.rect(m + 9, y + 3.5, 3, 1.8, 'F');
  doc.rect(m + 3.5, y + 8, 2.5, 2.5, 'F');
  doc.rect(m + 8, y + 10, 3.5, 1.8, 'F');
  doc.rect(m + 11, y + 11, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('PAYMENT DETAILS:', m + qrSize + 3, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Mode of Payment: UPI / CARD / CASH', m + qrSize + 3, y + 6.5);
  doc.text('Transaction ID: TXN998877665544', m + qrSize + 3, y + 10);
  doc.text('Scan QR code using UPI apps to pay instantly.', m + qrSize + 3, y + 13.5);

  // Cashier signatory box (Right aligned)
  const sigX = pageWidth - m - 45;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('E.&O.E.', sigX, y + 3);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(sigX, y + 10, sigX + 45, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED SIGNATURE', sigX + 4, y + 13.5);

  y += qrSize + 6;

  // --- 6. CORPORATE RETAIL TERMS & CONDITIONS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('TERMS OF SALE & DISCLOSURES:', m, y);

  const mncTerms = 
    `1. Exchange policies: Items in clean sellable package will be exchanged within 7 days of purchase. No cash refunds.\n` +
    `2. Fresh dairy, fruits, vegetables, baby care products, undergarments, and promotional items are non-returnable.\n` +
    `3. GST tax rates are declared in accordance with HSN code lists. Please check all calculations before exiting counter.\n` +
    `4. All legal matters and transactions are subject to local municipal jurisdiction. Thank you for shopping with us!`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitMncTerms = doc.splitTextToSize(mncTerms, contentWidth);
  doc.text(splitMncTerms, m, y + 2.5);

  // Footer Pagination Info
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175); // gray 400
    doc.text(
      `Page ${i} of ${totalPages}  |  Powered by Invoxa Retail Suite Engine (Offline)`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // --- 7. Execute PDF Output Action ---
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
