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

  // Colors (Corporate Slate & Royal Blue theme for MNC feel)
  const primaryColor = [29, 78, 216]; // #1d4ed8 - Royal Blue
  const secondaryColor = [15, 23, 42]; // #0f172a - Deep Slate
  const textColor = [51, 65, 85]; // #334155 - Slate 700
  const lightBg = [241, 245, 249]; // #f1f5f9 - Slate 100

  // --- 1. MNC Barcode Header ---
  // Draw a simulated barcode in the top-right
  const barcodeX = pageWidth - 65;
  const barcodeY = 15;
  doc.setDrawColor(15, 23, 42);
  let currentBarX = barcodeX;
  const barPattern = [1, 2, 0.5, 1.5, 0.5, 2, 1, 0.5, 1.5, 2, 0.5, 1, 1, 2, 0.5, 1, 1.5]; // random bar widths
  barPattern.forEach((width) => {
    doc.setLineWidth(width * 0.4);
    doc.line(currentBarX, barcodeY, currentBarX, barcodeY + 8);
    currentBarX += (width * 0.4) + 0.6;
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`*${sale.invoiceNumber || sale.id}*`, barcodeX + 12, barcodeY + 11);

  // --- 2. Corporate Brand & Logo Header ---
  let logoHeight = 0;
  if (shop.logo) {
    try {
      doc.addImage(shop.logo, 'JPEG', 15, 14, 20, 20);
      logoHeight = 20;
    } catch (e) {
      console.error("Error adding logo image to PDF:", e);
    }
  }

  // Shop Info (MNC alignment)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(shop.shopName.toUpperCase(), shop.logo ? 38 : 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  let currentY = 22;
  const addressStartLabel = shop.logo ? 38 : 15;
  if (shop.address) {
    const splitAddress = doc.splitTextToSize(shop.address, 90);
    doc.text(splitAddress, addressStartLabel, currentY);
    currentY += splitAddress.length * 3.5;
  }
  doc.text(`Tel: ${shop.phone}  |  Owner: ${shop.ownerName}`, addressStartLabel, currentY);
  currentY += 3.5;
  doc.text(`Store ID: MS-${String(shop.phone).slice(-4)}  |  GSTIN: 33AAAAA0000A1Z2`, addressStartLabel, currentY);

  // Line separator
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(15, 42, pageWidth - 15, 42);

  // --- 3. MNC Invoice Meta Panel ---
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 46, pageWidth - 30, 20, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('BILL TO / CUSTOMER:', 20, 51);
  
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName || 'WALK-IN CUSTOMER', 20, 56);
  doc.text(`Contact: ${sale.customerPhone || 'N/A'}`, 20, 61);

  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE NO:', 115, 51);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.invoiceNumber || `INV-${sale.id}`, 148, 51);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE & TIME:', 115, 56);
  doc.setFont('helvetica', 'normal');
  const dateObj = new Date(sale.timestamp);
  doc.text(`${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 148, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('POS COUNTER:', 115, 61);
  doc.setFont('helvetica', 'normal');
  doc.text('C-01 (CASHIER: SYSTEM)', 148, 61);

  // --- 4. High-Density Items Table ---
  // HSN, Split CGST and SGST columns
  const tableColumn = ['#', 'Item Name', 'HSN', 'Base Price', 'Qty', 'Disc %', 'CGST %', 'SGST %', 'Total'];
  const tableRows = [];

  const items = Array.isArray(sale.items) ? sale.items : JSON.parse(sale.items || '[]');

  items.forEach((item, index) => {
    const basePrice = item.price * item.quantity;
    const discountAmt = basePrice * ((item.discountPercent || 0) / 100);
    const afterDiscount = basePrice - discountAmt;
    
    // Split tax 50/50 (CGST & SGST)
    const taxPercent = item.taxPercent || 0;
    const splitTaxRate = taxPercent / 2;
    const taxAmt = afterDiscount * (taxPercent / 100);
    const finalItemTotal = afterDiscount + taxAmt;

    // Simulated HSN Code (MNC requirement)
    const mockHSN = item.hsn || String(1000 + Math.floor(Math.random() * 9000));

    const rowData = [
      index + 1,
      item.name.toUpperCase(),
      mockHSN,
      `${item.price.toFixed(2)}`,
      item.quantity,
      item.discountPercent > 0 ? `${item.discountPercent}%` : '0%',
      splitTaxRate > 0 ? `${splitTaxRate}%` : '0%',
      splitTaxRate > 0 ? `${splitTaxRate}%` : '0%',
      `${finalItemTotal.toFixed(2)}`
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    startY: 72,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 22, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });

  let finalY = doc.lastAutoTable.finalY + 8;

  if (finalY > pageHeight - 75) {
    doc.addPage();
    finalY = 20;
  }

  // --- 5. MNC GST Tax Summary Table ---
  // Columns: Tax Slab, Taxable Value, CGST, SGST, Total Tax
  const taxSlabs = {};
  items.forEach(item => {
    const taxRate = item.taxPercent || 0;
    const baseVal = item.price * item.quantity;
    const disc = baseVal * ((item.discountPercent || 0) / 100);
    const taxableVal = baseVal - disc;
    
    if (!taxSlabs[taxRate]) {
      taxSlabs[taxRate] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
    }
    const taxAmt = taxableVal * (taxRate / 100);
    taxSlabs[taxRate].taxable += taxableVal;
    taxSlabs[taxRate].cgst += taxAmt / 2;
    taxSlabs[taxRate].sgst += taxAmt / 2;
    taxSlabs[taxRate].totalTax += taxAmt;
  });

  const taxSummaryRows = Object.keys(taxSlabs).map(slab => {
    const data = taxSlabs[slab];
    return [
      `${slab}% Slab`,
      `${data.taxable.toFixed(2)}`,
      `${data.cgst.toFixed(2)}`,
      `${data.sgst.toFixed(2)}`,
      `${data.totalTax.toFixed(2)}`
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('GST TAX SLAB BREAKDOWN:', 15, finalY);

  autoTable(doc, {
    startY: finalY + 2,
    head: [['Tax Rate', 'Taxable Amt', 'CGST Amt', 'SGST Amt', 'Total GST']],
    body: taxSummaryRows,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105], // slate 600
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
      0: { cellWidth: 25, halign: 'center' }
    },
    margin: { left: 15, right: 65 } // aligns it to the left side, leaving right side for grand totals
  });

  // --- 6. Totals Panel (Right Alignment) ---
  const totalsY = finalY + 2;
  const rightColumnX = pageWidth - 15;
  const labelsX = rightColumnX - 42;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  let calcY = totalsY;
  doc.text('Net Taxable Value:', labelsX, calcY);
  doc.text(`${(sale.subtotal - sale.discountTotal).toFixed(2)}`, rightColumnX, calcY, { align: 'right' });
  calcY += 4.5;

  doc.text('Total CGST (Split):', labelsX, calcY);
  doc.text(`${(sale.taxTotal / 2).toFixed(2)}`, rightColumnX, calcY, { align: 'right' });
  calcY += 4.5;

  doc.text('Total SGST (Split):', labelsX, calcY);
  doc.text(`${(sale.taxTotal / 2).toFixed(2)}`, rightColumnX, calcY, { align: 'right' });
  calcY += 4.5;

  doc.text('Total Discount Given:', labelsX, calcY);
  doc.text(`-${(sale.discountTotal || 0).toFixed(2)}`, rightColumnX, calcY, { align: 'right' });
  calcY += 5;

  // Double border line for Grand Total
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.4);
  doc.line(labelsX, calcY - 2.5, rightColumnX, calcY - 2.5);
  doc.line(labelsX, calcY - 1.8, rightColumnX, calcY - 1.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('NET AMOUNT DUE:', labelsX, calcY + 2);
  doc.text(`INR ${(sale.grandTotal || 0).toFixed(2)}`, rightColumnX, calcY + 2, { align: 'right' });

  // Get new Y coordinate after the tables
  const endOfGSTTableY = doc.lastAutoTable.finalY;
  const endOfTotalsBlockY = calcY + 12;
  let summaryY = Math.max(endOfGSTTableY, endOfTotalsBlockY) + 10;

  if (summaryY > pageHeight - 55) {
    doc.addPage();
    summaryY = 20;
  }

  // --- 7. MNC Payment QR & Signatory Section ---
  // Draw mock UPI QR Code
  const qrX = 15;
  const qrY = summaryY;
  const qrSize = 20;
  
  // Outer border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.rect(qrX, qrY, qrSize, qrSize);
  // Three corner position boxes
  doc.setFillColor(15, 23, 42);
  doc.rect(qrX + 1, qrY + 1, 5, 5, 'F');
  doc.rect(qrX + qrSize - 6, qrY + 1, 5, 5, 'F');
  doc.rect(qrX + 1, qrY + qrSize - 6, 5, 5, 'F');
  // Mock internal data blobs
  doc.rect(qrX + 8, qrY + 3, 2, 2, 'F');
  doc.rect(qrX + 12, qrY + 8, 3, 2, 'F');
  doc.rect(qrX + 4, qrY + 10, 2, 4, 'F');
  doc.rect(qrX + 9, qrY + 12, 4, 2, 'F');
  doc.rect(qrX + 14, qrY + 14, 3, 3, 'F');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SCAN TO PAY (UPI)', qrX, qrY + qrSize + 3);

  // Authorized Signatory
  const sigX = pageWidth - 60;
  const sigY = summaryY + 15;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sigX, sigY, sigX + 45, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('AUTHORIZED SIGNATORY', sigX + 5, sigY + 4.5);

  // --- 8. Standard Corporate Terms & Conditions ---
  const termsY = summaryY + qrSize + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('MNC STORE TERMS & CONDITIONS:', 15, termsY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const corporateTerms = 
    `1. Goods once sold will not be taken back or exchanged without a valid cash receipt.\n` +
    `2. Maximum retail price (MRP) is inclusive of all taxes. Offers/Discounts apply strictly as per POS campaign rules.\n` +
    `3. Warranty on electronics and appliances is directly offered by manufacturer/brand partners. Retailer holds no liability.\n` +
    `4. Disputes, if any, shall be subject to exclusive local jurisdiction. Thank you for shopping at ${shop.shopName.toUpperCase()}!`;
  
  const splitCorporateTerms = doc.splitTextToSize(corporateTerms, pageWidth - 30);
  doc.text(splitCorporateTerms, 15, termsY + 3.5);

  // Footer Pagination
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${totalPages}  |  Generated offline with Sabari Billing Enterprise Suite`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // --- 9. Execute Output Action ---
  const fileName = `Invoice_${sale.invoiceNumber || sale.id}.pdf`;
  
  if (action === 'share') {
    // Generate Blob and utilize Web Share API
    try {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${sale.invoiceNumber || sale.id}`,
          text: `Please find attached your invoice from ${shop.shopName}.`
        });
      } else {
        // Fallback for browsers without share API
        doc.save(fileName);
        alert("Web Sharing is not supported on this browser/device. Invoice has been downloaded locally instead.");
      }
    } catch (err) {
      console.error("Web Share failed, downloading file instead:", err);
      doc.save(fileName);
    }
  } else {
    // Standard direct file download
    doc.save(fileName);
  }
}
