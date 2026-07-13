import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateInvoicePDF(sale, shop) {
  if (!sale || !shop) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (Cool tech slate theme)
  const primaryColor = [99, 102, 241]; // #6366f1
  const secondaryColor = [30, 41, 59]; // slate-800
  const textColor = [51, 65, 85]; // slate-700
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Header & Logo
  let logoHeight = 0;
  if (shop.logo) {
    try {
      // Base64 logo
      doc.addImage(shop.logo, 'JPEG', 15, 15, 24, 24);
      logoHeight = 24;
    } catch (e) {
      console.error("Error adding logo image to PDF:", e);
    }
  }

  // Shop Info (Header Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(shop.shopName, 45, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  let currentY = 25;
  if (shop.address) {
    // Wrap address text
    const splitAddress = doc.splitTextToSize(shop.address, 100);
    doc.text(splitAddress, 45, currentY);
    currentY += splitAddress.length * 4;
  }
  doc.text(`Phone: ${shop.phone}`, 45, currentY);
  currentY += 4;
  doc.text(`Owner: ${shop.ownerName}`, 45, currentY);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 45, pageWidth - 15, 45);

  // 2. Invoice Details Panel
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 50, pageWidth - 30, 25, 'F');
  
  // Left Column - Bill to
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('BILL TO:', 20, 56);
  
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName || 'Walk-in Customer', 20, 62);
  doc.text(`Phone: ${sale.customerPhone || 'N/A'}`, 20, 67);

  // Right Column - Invoice Meta
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE NO:', 130, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.invoiceNumber || `INV-${sale.id}`, 160, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE:', 130, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(sale.date).toLocaleDateString(), 160, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('TIME:', 130, 67);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 160, 67);

  // 3. Items Table
  const tableColumn = ['#', 'Item Name', 'Price', 'Qty', 'Tax %', 'Disc %', 'Total'];
  const tableRows = [];

  const items = Array.isArray(sale.items) ? sale.items : JSON.parse(sale.items || '[]');

  items.forEach((item, index) => {
    // Calculations for line item
    const basePrice = item.price * item.quantity;
    const discountAmt = basePrice * ((item.discountPercent || 0) / 100);
    const afterDiscount = basePrice - discountAmt;
    const taxAmt = afterDiscount * ((item.taxPercent || 0) / 100);
    const finalItemTotal = afterDiscount + taxAmt;

    const rowData = [
      index + 1,
      item.name,
      `${item.price.toFixed(2)}`,
      item.quantity,
      item.taxPercent > 0 ? `${item.taxPercent}%` : '0%',
      item.discountPercent > 0 ? `${item.discountPercent}%` : '0%',
      `${finalItemTotal.toFixed(2)}`
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    startY: 82,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 65 },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 15, right: 15 }
  });

  // Get Y position after table
  let finalY = doc.lastAutoTable.finalY + 10;

  // Check if we are running out of page space
  if (finalY > pageHeight - 65) {
    doc.addPage();
    finalY = 20;
  }

  // 4. Totals Block (Right side alignment)
  const rightColumnX = pageWidth - 15;
  const labelsX = rightColumnX - 60;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  doc.text('Subtotal:', labelsX, finalY);
  doc.text(`${(sale.subtotal || 0).toFixed(2)}`, rightColumnX, finalY, { align: 'right' });
  finalY += 5;

  doc.text('Total Discount:', labelsX, finalY);
  doc.text(`-${(sale.discountTotal || 0).toFixed(2)}`, rightColumnX, finalY, { align: 'right' });
  finalY += 5;

  doc.text('Total Tax:', labelsX, finalY);
  doc.text(`+ ${(sale.taxTotal || 0).toFixed(2)}`, rightColumnX, finalY, { align: 'right' });
  finalY += 6;

  // Total Border line
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(labelsX, finalY - 2, rightColumnX, finalY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Grand Total:', labelsX, finalY + 2);
  doc.text(`${(sale.grandTotal || 0).toFixed(2)}`, rightColumnX, finalY + 2, { align: 'right' });

  finalY += 15;

  // 5. Terms & Footer
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('TERMS & CONDITIONS:', 15, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const splitTerms = doc.splitTextToSize(shop.terms || 'Thank you for your business!', pageWidth - 30);
  doc.text(splitTerms, 15, finalY + 5);

  // Footer page markings
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Page ${i} of ${totalPages}  |  Generated offline with Sabari Billing`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the file
  doc.save(`Invoice_${sale.invoiceNumber || sale.id}.pdf`);
}
