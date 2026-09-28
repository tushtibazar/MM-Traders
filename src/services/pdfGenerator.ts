import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  BusinessSettings,
  Customer,
  CustomerLedgerEntry,
  DailyAccountSheet,
  Product,
  Sale,
  SalesRepresentative,
} from '../types';

interface PDFHeaderOptions {
  doc: jsPDF;
  settings: BusinessSettings;
  title: string;
  subtitle?: string;
  dateRange?: string;
}

function drawHeader({ doc, settings, title, subtitle, dateRange }: PDFHeaderOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top accent bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(settings.businessName, pageWidth / 2, 16, { align: 'center' });

  // Subtitle / Address / Phone
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`${settings.address} | Phone: ${settings.phone}`, pageWidth / 2, 22, { align: 'center' });

  // Divider line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(14, 26, pageWidth - 14, 26);

  // Report Title Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(title.toUpperCase(), 14, 33);

  // Date / Subtitle on Right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (subtitle) {
    doc.text(subtitle, 14, 38);
  }

  const dateText = dateRange ? `Period: ${dateRange}` : `Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateText, pageWidth - 14, 33, { align: 'right' });

  return 42; // Next Y coordinate
}

function drawFooter(doc: jsPDF, settings: BusinessSettings) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(
      `${settings.businessName} - Private Business Manager | Printed: ${new Date().toLocaleString()}`,
      14,
      pageHeight - 7,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

// 1. Daily Business Report PDF
export function generateDailyReportPDF(
  settings: BusinessSettings,
  date: string,
  sales: Sale[],
  collections: { srName: string; amount: number; customerName: string; method: string }[],
  expenses: { category: string; amount: number; description: string }[],
  summary: {
    totalSales: number;
    totalCollection: number;
    totalNewDue: number;
    totalExpense: number;
    netCash: number;
  },
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: 'Daily Business Report (দৈনিক হিসাব বিবরণী)',
    subtitle: `Date: ${date}`,
    dateRange: date,
  });

  // Summary Metrics Banner
  const currency = settings.currency || 'BDT';
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const colWidth = (doc.internal.pageSize.getWidth() - 28) / 5;
  const metrics = [
    { label: 'Total Sales', val: `${currency} ${summary.totalSales.toLocaleString()}` },
    { label: 'Collection', val: `${currency} ${summary.totalCollection.toLocaleString()}` },
    { label: 'New Due', val: `${currency} ${summary.totalNewDue.toLocaleString()}` },
    { label: 'Expense', val: `${currency} ${summary.totalExpense.toLocaleString()}` },
    { label: 'Net Cash Inflow', val: `${currency} ${summary.netCash.toLocaleString()}` },
  ];

  metrics.forEach((m, idx) => {
    const x = 18 + idx * colWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, x, startY + 13);
  });

  // Section 1: Sales Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Today's Sales Records", 14, startY + 26);

  const salesTableData = sales.map((s, i) => [
    i + 1,
    s.memoNo,
    s.shopName ? `${s.customerName} (${s.shopName})` : s.customerName,
    s.srName || '-',
    `${currency} ${s.totalProductAmount.toLocaleString()}`,
    `${currency} ${s.totalDiscount.toLocaleString()}`,
    `${currency} ${s.netSales.toLocaleString()}`,
    `${currency} ${s.paymentReceived.toLocaleString()}`,
    `${currency} ${s.newDue.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: startY + 29,
    head: [['#', 'Memo', 'Customer / Shop', 'SR', 'Total', 'Disc', 'Net Sale', 'Paid', 'New Due']],
    body: salesTableData.length > 0 ? salesTableData : [['-', '-', 'No sales recorded for this date', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 45 },
      3: { cellWidth: 28 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        '',
        'TOTAL',
        '',
        '',
        '',
        '',
        `${currency} ${summary.totalSales.toLocaleString()}`,
        `${currency} ${summary.totalCollection.toLocaleString()}`,
        `${currency} ${summary.totalNewDue.toLocaleString()}`,
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Collections
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Today's Collections (টাকা আদায়)", 14, nextY);

  const collectionTableData = collections.map((c, i) => [
    i + 1,
    c.customerName,
    c.srName || '-',
    c.method.toUpperCase(),
    `${currency} ${c.amount.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: nextY + 3,
    head: [['#', 'Customer', 'Collected By (SR)', 'Method', 'Amount']],
    body: collectionTableData.length > 0 ? collectionTableData : [['-', 'No collections recorded', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  drawFooter(doc, settings);
  doc.save(`Daily_Report_${date}.pdf`);
}

// 2. Customer Ledger PDF
export function generateCustomerLedgerPDF(
  settings: BusinessSettings,
  customer: Customer,
  ledgers: CustomerLedgerEntry[],
  dateRangeStr?: string,
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: 'Customer Ledger Statement (খতিয়ান)',
    subtitle: `Customer: ${customer.name} | Shop: ${customer.shopName} | Phone: ${customer.phone}`,
    dateRange: dateRangeStr,
  });

  const currency = settings.currency || 'BDT';

  // Customer Summary Block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Address: ${customer.address || 'N/A'}`, 18, startY + 6);
  doc.text(`Assigned SR: ${customer.assignedSrName || 'General'}`, 18, startY + 12);

  doc.text(`Opening Due: ${currency} ${customer.openingBalance.toLocaleString()}`, 110, startY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(185, 28, 28); // red for due
  doc.text(`Current Outstanding Due: ${currency} ${customer.currentDue.toLocaleString()}`, 110, startY + 13);

  const tableData = ledgers.map((entry, idx) => [
    idx + 1,
    entry.date,
    entry.referenceId || '-',
    entry.description,
    entry.debit > 0 ? `${currency} ${entry.debit.toLocaleString()}` : '-',
    entry.credit > 0 ? `${currency} ${entry.credit.toLocaleString()}` : '-',
    `${currency} ${entry.balance.toLocaleString()}`,
  ]);

  const totalDebit = ledgers.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = ledgers.reduce((sum, l) => sum + (l.credit || 0), 0);

  autoTable(doc, {
    startY: startY + 24,
    head: [['#', 'Date', 'Ref / Memo #', 'Particulars / Description', 'Sales / Debit (+)', 'Payment / Credit (-)', 'Balance']],
    body: tableData.length > 0 ? tableData : [['-', '-', '-', 'No transactions recorded', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 28 },
      3: { cellWidth: 55 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        '',
        'TOTALS',
        '',
        '',
        `${currency} ${totalDebit.toLocaleString()}`,
        `${currency} ${totalCredit.toLocaleString()}`,
        `${currency} ${customer.currentDue.toLocaleString()}`,
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
  });

  drawFooter(doc, settings);
  doc.save(`Ledger_${customer.shopName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 3. Due / Outstanding Report PDF
export function generateDueReportPDF(
  settings: BusinessSettings,
  customersWithDue: Customer[],
  totalDueAmount: number,
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: 'Customer Due / Outstanding Statement (বাকি তালিকা)',
    subtitle: `Total Outstanding Due: ${settings.currency || 'BDT'} ${totalDueAmount.toLocaleString()} | Total Accounts: ${customersWithDue.length}`,
  });

  const currency = settings.currency || 'BDT';

  const tableData = customersWithDue.map((c, i) => [
    i + 1,
    c.name,
    c.shopName,
    c.phone,
    c.address,
    c.assignedSrName || '-',
    `${currency} ${c.currentDue.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: startY + 4,
    head: [['#', 'Customer Name', 'Shop Name', 'Phone', 'Address / Area', 'SR', 'Current Due']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No outstanding due', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 40 },
      5: { cellWidth: 24 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
    },
    foot: [
      ['', 'TOTAL OUTSTANDING', '', '', '', '', `${currency} ${totalDueAmount.toLocaleString()}`],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
  });

  drawFooter(doc, settings);
  doc.save(`Due_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 4. Monthly Business Report PDF
export function generateMonthlyReportPDF(
  settings: BusinessSettings,
  monthYearStr: string,
  summary: {
    totalSales: number;
    totalCollection: number;
    totalNewDue: number;
    totalExpense: number;
    totalProfitEstimate?: number;
  },
  srPerformance: { name: string; sales: number; collections: number; newDue: number }[],
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: `Monthly Business Report (${monthYearStr})`,
    subtitle: `Dealer Comprehensive Accounting & Performance`,
  });

  const currency = settings.currency || 'BDT';

  // Key KPI grid
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 24, 2, 2, 'F');

  const kpis = [
    { label: 'Monthly Gross Sales', val: `${currency} ${summary.totalSales.toLocaleString()}` },
    { label: 'Monthly Collections', val: `${currency} ${summary.totalCollection.toLocaleString()}` },
    { label: 'Monthly New Due', val: `${currency} ${summary.totalNewDue.toLocaleString()}` },
    { label: 'Monthly Expenses', val: `${currency} ${summary.totalExpense.toLocaleString()}` },
  ];

  const colW = (doc.internal.pageSize.getWidth() - 28) / 4;
  kpis.forEach((k, i) => {
    const x = 18 + i * colW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, x, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(k.val, x, startY + 17);
  });

  // SR breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Sales Representative (SR) Monthly Performance', 14, startY + 34);

  const srData = srPerformance.map((sr, i) => [
    i + 1,
    sr.name,
    `${currency} ${sr.sales.toLocaleString()}`,
    `${currency} ${sr.collections.toLocaleString()}`,
    `${currency} ${sr.newDue.toLocaleString()}`,
    sr.sales > 0 ? `${((sr.collections / sr.sales) * 100).toFixed(1)}%` : '0%',
  ]);

  autoTable(doc, {
    startY: startY + 38,
    head: [['#', 'SR Name', 'Total Sales', 'Total Collection', 'Net Due', 'Recovery Rate']],
    body: srData.length > 0 ? srData : [['-', 'No SR performance data', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center' },
    },
  });

  drawFooter(doc, settings);
  doc.save(`Monthly_Report_${monthYearStr.replace(/\s+/g, '_')}.pdf`);
}

// 5. Stock Inventory Report PDF
export function generateStockReportPDF(
  settings: BusinessSettings,
  products: Product[],
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: 'Product Stock & Inventory Valuation Report (স্টক বিবরণী)',
    subtitle: `Total Products: ${products.length}`,
  });

  const currency = settings.currency || 'BDT';

  let totalSaleValue = 0;
  let totalPurchaseValue = 0;

  const tableData = products.map((p, i) => {
    const saleVal = p.currentStock * p.salePrice;
    const purchaseVal = p.currentStock * p.purchasePrice;
    totalSaleValue += saleVal;
    totalPurchaseValue += purchaseVal;

    const isLow = p.currentStock <= p.minStockAlert;
    return [
      i + 1,
      p.code,
      p.name,
      p.category,
      p.unit,
      p.currentStock,
      `${currency} ${p.salePrice.toLocaleString()}`,
      `${currency} ${saleVal.toLocaleString()}`,
      isLow ? 'LOW STOCK' : 'IN STOCK',
    ];
  });

  autoTable(doc, {
    startY: startY + 4,
    head: [['#', 'Code', 'Product Name', 'Category', 'Unit', 'Stock Qty', 'Sale Rate', 'Stock Value', 'Status']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No products registered', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 45, fontStyle: 'bold' },
      3: { cellWidth: 25 },
      4: { cellWidth: 24 },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 20, halign: 'center' },
    },
    foot: [
      ['', 'TOTAL', '', '', '', '', '', `${currency} ${totalSaleValue.toLocaleString()}`, ''],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
  });

  drawFooter(doc, settings);
  doc.save(`Stock_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 6. SR Sales Report PDF
export function generateSrReportPDF(
  settings: BusinessSettings,
  sr: SalesRepresentative,
  sales: Sale[],
  dateRangeStr: string,
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: `Sales Representative Report - ${sr.name}`,
    subtitle: `Phone: ${sr.phone} | Territory: ${sr.territory || 'General'}`,
    dateRange: dateRangeStr,
  });

  const currency = settings.currency || 'BDT';

  const totalSales = sales.reduce((acc, s) => acc + s.netSales, 0);
  const totalCollections = sales.reduce((acc, s) => acc + s.paymentReceived, 0);
  const totalNewDue = sales.reduce((acc, s) => acc + (s.netSales - s.paymentReceived), 0);

  const tableData = sales.map((s, i) => [
    i + 1,
    s.date,
    s.memoNo,
    s.shopName ? `${s.customerName} (${s.shopName})` : s.customerName,
    `${currency} ${s.netSales.toLocaleString()}`,
    `${currency} ${s.paymentReceived.toLocaleString()}`,
    `${currency} ${s.newDue.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: startY + 4,
    head: [['#', 'Date', 'Memo #', 'Customer / Shop', 'Net Sale', 'Collected', 'New Due']],
    body: tableData.length > 0 ? tableData : [['-', '-', '-', 'No sales recorded for this SR', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        '',
        'TOTALS',
        '',
        '',
        `${currency} ${totalSales.toLocaleString()}`,
        `${currency} ${totalCollections.toLocaleString()}`,
        `${currency} ${totalNewDue.toLocaleString()}`,
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
  });

  drawFooter(doc, settings);
  doc.save(`SR_Report_${sr.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 7. Printable Sale Memo / Invoice Receipt
export function generateSaleMemoPDF(
  settings: BusinessSettings,
  sale: Sale,
) {
  const doc = new jsPDF({
    format: 'a5',
    orientation: 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = settings.currency || 'BDT';

  // Business Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.businessName, pageWidth / 2, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${settings.address} | ফোন: ${settings.phone}`, pageWidth / 2, 17, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('বিক্রয় মেমো / ক্যাশ মেমো (SALES MEMO)', pageWidth / 2, 23, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(10, 26, pageWidth - 10, 26);

  // Meta grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  doc.text(`মেমো নং: ${sale.memoNo}`, 10, 31);
  doc.text(`তারিখ: ${sale.date}`, pageWidth - 10, 31, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(`দোকান: ${sale.shopName || sale.customerName}`, 10, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`প্রোপাইটার: ${sale.customerName}`, 10, 40);
  if (sale.customerPhone) {
    doc.text(`মোবাইল: ${sale.customerPhone}`, 10, 44);
  }

  doc.text(`এস আর (SR): ${sale.srName || '-'}`, pageWidth - 10, 36, { align: 'right' });

  // Items table
  const tableData = sale.items.map((item, idx) => [
    idx + 1,
    item.productName,
    item.quantity,
    item.returnQuantity > 0 ? item.returnQuantity : '-',
    `${item.rate}`,
    item.discount > 0 ? `${item.discount}` : '-',
    `${item.lineTotal.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 48,
    margin: { left: 10, right: 10 },
    head: [['#', 'পণ্যের বিবরণ', 'পরিমাণ', 'ফেরত', 'দর', 'ছাড়', 'মোট টাকা']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5, halign: 'center' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Calculation box on right
  const boxWidth = 65;
  const boxX = pageWidth - 10 - boxWidth;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, finalY, boxWidth, 38, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(boxX, finalY, boxWidth, 38, 'S');

  const lines = [
    { label: 'মোট পণ্যের দাম:', val: `${currency} ${sale.totalProductAmount.toLocaleString()}` },
    { label: 'মোট ছাড়:', val: `${currency} ${sale.totalDiscount.toLocaleString()}` },
    { label: 'নিট বিক্রয়:', val: `${currency} ${sale.netSales.toLocaleString()}`, bold: true },
    { label: 'পূর্বের বকেয়া (Due):', val: `${currency} ${sale.previousDue.toLocaleString()}` },
    { label: 'নগদ জমা (Payment):', val: `${currency} ${sale.paymentReceived.toLocaleString()}`, bold: true },
    { label: 'বর্তমান বাকি (New Due):', val: `${currency} ${sale.newDue.toLocaleString()}`, bold: true, alert: true },
  ];

  lines.forEach((l, i) => {
    const yPos = finalY + 5 + i * 5.5;
    doc.setFont('helvetica', l.bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(l.alert ? 185 : 51, l.alert ? 28 : 65, l.alert ? 28 : 85);
    doc.text(l.label, boxX + 3, yPos);
    doc.text(l.val, boxX + boxWidth - 3, yPos, { align: 'right' });
  });

  // Signatures
  const bottomY = doc.internal.pageSize.getHeight() - 14;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(12, bottomY, 50, bottomY);
  doc.line(pageWidth - 50, bottomY, pageWidth - 12, bottomY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('গ্রাহকের স্বাক্ষর', 31, bottomY + 4, { align: 'center' });
  doc.text('বিক্রেতার স্বাক্ষর', pageWidth - 31, bottomY + 4, { align: 'center' });

  doc.save(`${sale.memoNo}.pdf`);
}

// Aliases for Stock and SR Reports
export const generateStockValuationPDF = generateStockReportPDF;

export function generateSRPerformancePDF(
  settings: BusinessSettings,
  srList: { name: string; territory?: string; customerCount?: number; sales: number; collection: number; due: number }[],
) {
  const doc = new jsPDF();
  const startY = drawHeader({
    doc,
    settings,
    title: 'SR Performance & Recovery Statement',
    subtitle: `Sales Representative Field Operations Evaluation`,
  });

  const currency = settings.currency || 'BDT';

  const tableData = srList.map((sr, idx) => [
    idx + 1,
    sr.name,
    sr.territory || '-',
    sr.customerCount ?? '-',
    `${currency} ${sr.sales.toLocaleString()}`,
    `${currency} ${sr.collection.toLocaleString()}`,
    `${currency} ${sr.due.toLocaleString()}`,
    sr.sales > 0 ? `${((sr.collection / sr.sales) * 100).toFixed(1)}%` : '0%',
  ]);

  const totalSales = srList.reduce((sum, s) => sum + s.sales, 0);
  const totalColl = srList.reduce((sum, s) => sum + s.collection, 0);
  const totalDue = srList.reduce((sum, s) => sum + s.due, 0);

  autoTable(doc, {
    startY: startY + 4,
    head: [['#', 'SR Name', 'Territory', 'Outlets', 'Sales', 'Collection', 'Customer Due', 'Recovery']],
    body: tableData.length > 0 ? tableData : [['-', 'No SR records found', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
      7: { halign: 'center' },
    },
    foot: [
      [
        '',
        'TOTALS',
        '',
        '',
        `${currency} ${totalSales.toLocaleString()}`,
        `${currency} ${totalColl.toLocaleString()}`,
        `${currency} ${totalDue.toLocaleString()}`,
        totalSales > 0 ? `${((totalColl / totalSales) * 100).toFixed(1)}%` : '0%',
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
  });

  drawFooter(doc, settings);
  doc.save(`SR_Performance_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates the official Daily Business Accounting PDF for MM TRADERS DISTRIBUTOR
 * Flow: Stock -> Issue -> Return -> Net Sold -> Damage -> Final Net Amount -> Cash & Expense
 */
export function generateDailyAccountingSheetPDF(
  settings: BusinessSettings,
  sheet: DailyAccountSheet
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const currency = settings.currency || 'Tk';

  const startY = drawHeader({
    doc,
    settings,
    title: 'Daily Business Accounting Statement (দৈনিক হিসাব বিবরণী)',
    subtitle: `Date: ${sheet.date} | Route/Van: ${sheet.routeOrVan || 'Standard Market Route'} | In-Charge: ${sheet.srName || settings.proprietorName} | Sheet #: ${sheet.sheetNo || sheet.id}`,
    dateRange: sheet.date,
  });

  const tableData = sheet.items.map((item, idx) => [
    (idx + 1).toString(),
    `${item.productName}\n[${item.productCode}]`,
    `${item.packSize || item.unit}`,
    item.openingStock.toString(),
    item.issuedQty.toString(),
    item.returnQty.toString(),
    item.netSoldQty.toString(),
    `${currency} ${item.sellingPrice.toLocaleString()}`,
    `${currency} ${item.grossAmount.toLocaleString()}`,
    item.damageQty > 0 ? `${item.damageQty}` : '-',
    item.damageValue > 0 ? `${currency} ${item.damageValue.toLocaleString()}` : '-',
    `${currency} ${item.finalNetAmount.toLocaleString()}`,
    item.closingStock.toString(),
  ]);

  autoTable(doc, {
    startY: startY + 2,
    head: [
      [
        '#',
        'Product & Code',
        'Pack / Unit',
        'Opening',
        'Issue (বের)',
        'Return (ফেরত)',
        'Net Sold (বিক্রয়)',
        'Rate (দর)',
        'Gross Amt (মোট)',
        'Dmg Qty',
        'Dmg Val',
        'Net Sales (নিট)',
        'Balance',
      ],
    ],
    body: tableData.length > 0 ? tableData : [['-', 'No items recorded in this sheet', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 24 },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold', textColor: [30, 64, 175] },
      5: { halign: 'center', textColor: [180, 83, 9] },
      6: { halign: 'center', fontStyle: 'bold', textColor: [4, 120, 87] },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'center', textColor: [185, 28, 28] },
      10: { halign: 'right', textColor: [185, 28, 28] },
      11: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      12: { halign: 'center', fontStyle: 'bold' },
    },
    foot: [
      [
        '',
        'TOTALS',
        `${sheet.items.length} Items`,
        '',
        sheet.totalIssuedQty.toString(),
        sheet.totalReturnQty.toString(),
        sheet.totalNetSoldQty.toString(),
        '',
        `${currency} ${sheet.totalGrossAmount.toLocaleString()}`,
        sheet.totalDamageQty.toString(),
        `${currency} ${sheet.totalDamageValue.toLocaleString()}`,
        `${currency} ${sheet.finalNetSalesAmount.toLocaleString()}`,
        '',
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
  });

  // Summary box
  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 60) + 6;
  const pageWidth = doc.internal.pageSize.getWidth();

  if (finalY < 185) {
    // Summary Cards / Reconciliation
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY, pageWidth - 28, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, finalY, pageWidth - 28, 24, 2, 2, 'D');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    const colWidth = (pageWidth - 28) / 4;
    
    // Col 1: Sales
    doc.text(`1. Total Gross Sales: ${currency} ${sheet.totalGrossAmount.toLocaleString()}`, 18, finalY + 7);
    doc.text(`2. Damage Deducted: -${currency} ${sheet.totalDamageValue.toLocaleString()}`, 18, finalY + 14);
    doc.setTextColor(5, 150, 105);
    doc.text(`Final Net Sales: ${currency} ${sheet.finalNetSalesAmount.toLocaleString()}`, 18, finalY + 20);

    // Col 2: Cash
    doc.setTextColor(30, 41, 59);
    doc.text(`3. Cash Collected: ${currency} ${sheet.cashCollected.toLocaleString()}`, 18 + colWidth, finalY + 7);
    doc.text(`4. Market Expense: -${currency} ${sheet.marketExpense.toLocaleString()}`, 18 + colWidth, finalY + 14);
    doc.setTextColor(37, 99, 235);
    doc.text(`Net Cash Deposited: ${currency} ${sheet.netCashSubmitted.toLocaleString()}`, 18 + colWidth, finalY + 20);

    // Col 3: Due
    doc.setTextColor(30, 41, 59);
    doc.text(`5. Today Market Due:`, 18 + colWidth * 2, finalY + 7);
    doc.setTextColor(225, 29, 72);
    doc.text(`${currency} ${sheet.marketDue.toLocaleString()}`, 18 + colWidth * 2, finalY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`(Unpaid goods left in market)`, 18 + colWidth * 2, finalY + 20);

    // Col 4: Status & Notes
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Status: ${sheet.status.toUpperCase()}`, 18 + colWidth * 3, finalY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const notePreview = sheet.notes ? sheet.notes.slice(0, 38) : 'All accounts reconciled.';
    doc.text(`Note: ${notePreview}`, 18 + colWidth * 3, finalY + 14);
    doc.text(`Distributor: ${settings.businessName}`, 18 + colWidth * 3, finalY + 20);

    // Signature lines
    const sigY = finalY + 36;
    if (sigY < 195) {
      doc.setDrawColor(148, 163, 184);
      doc.line(20, sigY, 70, sigY);
      doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Sales In-charge / SR Signature', 45, sigY + 4, { align: 'center' });
      doc.text('Accounts Verified By', pageWidth / 2, sigY + 4, { align: 'center' });
      doc.text(`Proprietor: ${settings.proprietorName}`, pageWidth - 45, sigY + 4, { align: 'center' });
    }
  }

  drawFooter(doc, settings);
  doc.save(`MM_TRADERS_Daily_${sheet.date}.pdf`);
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the clean Letterhead Daily হিসাব PDF for MM TRADERS — DISTRIBUTOR
 * Uses an offscreen styled HTML preview rendered with Bengali fonts (Hind Siliguri / Noto Sans Bengali)
 * captured via html2canvas into jsPDF to ensure all Bengali conjuncts, ligatures, and numbers render sharply and flawlessly.
 */
export async function generateDailySalesPDF(
  settings: BusinessSettings,
  sheet: DailyAccountSheet
): Promise<void> {
  const currency = settings.currency || '৳';
  const isCompleted = sheet.status === 'confirmed' || sheet.status === 'completed';

  // Build the styled HTML document for capture
  const container = document.createElement('div');
  container.id = 'print-preview-render-node';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.padding = '28px 32px';
  container.style.boxSizing = 'border-box';
  container.style.lineHeight = '1.4';
  container.style.zIndex = '-1000';

  const itemsHtml = sheet.items.map((it, idx) => {
    const issueDisplay = it.issuedUnit === 'C'
      ? `${it.rawIssuedQty ?? it.issuedQty} C <span style="font-size: 10px; color: #475569;">(${it.issuedQty})</span>`
      : `${it.issuedQty}`;
    const returnDisplay = it.returnUnit === 'C'
      ? `${it.rawReturnQty ?? it.returnQty} C <span style="font-size: 10px; color: #475569;">(${it.returnQty})</span>`
      : `${it.returnQty}`;

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">
          ${escapeHtml(it.productName)}
          ${it.packSize ? `<span style="font-size: 10px; color: #64748b; font-weight: normal;"> (${escapeHtml(it.packSize)})</span>` : ''}
        </td>
        <td style="padding: 6px 8px; text-align: center; color: #1e40af; font-weight: 600;">${issueDisplay}</td>
        <td style="padding: 6px 8px; text-align: center; color: #b45309;">${returnDisplay}</td>
        <td style="padding: 6px 8px; text-align: center; color: #047857; font-weight: bold;">${it.netSoldQty}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${currency} ${it.sellingPrice.toLocaleString()}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #0f172a;">${currency} ${it.grossAmount.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  // Damage items HTML (if any)
  let damageSectionHtml = '';
  if (sheet.damageItems && sheet.damageItems.length > 0) {
    const damageRowsHtml = sheet.damageItems.map((it, idx) => {
      const damageQtyDisplay = it.damageUnit === 'C'
        ? `${it.rawDamageQty ?? it.damageQty ?? it.issuedQty} C <span style="font-size: 10px; color: #991b1b;">(${it.damageQty ?? it.issuedQty})</span>`
        : `${it.damageQty ?? it.issuedQty}`;

      return `
        <tr style="border-bottom: 1px solid #fee2e2; font-size: 11px;">
          <td style="padding: 5px 8px; text-align: center; color: #991b1b; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 5px 8px; font-weight: 600; color: #991b1b;">
            ${escapeHtml(it.productName)}
            ${it.packSize ? `<span style="font-size: 10px; color: #b91c1c;"> (${escapeHtml(it.packSize)})</span>` : ''}
          </td>
          <td style="padding: 5px 8px; text-align: center; color: #b91c1c; font-weight: 600;">${damageQtyDisplay}</td>
          <td style="padding: 5px 8px; text-align: center; color: #94a3b8;">0</td>
          <td style="padding: 5px 8px; text-align: center; color: #b91c1c; font-weight: bold;">${it.damageQty ?? it.issuedQty}</td>
          <td style="padding: 5px 8px; text-align: right; font-family: monospace;">${currency} ${it.sellingPrice.toLocaleString()}</td>
          <td style="padding: 5px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #b91c1c;">${currency} ${(it.damageValue || it.grossAmount || 0).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    damageSectionHtml = `
      <div style="margin-top: 14px;">
        <div style="font-size: 12px; font-weight: bold; color: #b91c1c; margin-bottom: 4px;">
          ড্যামেজ বিবরণী (Market Damage)
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #fecaca; background: #fffafb;">
          <thead>
            <tr style="background: #ef4444; color: #ffffff; font-size: 11px; font-weight: bold;">
              <th style="padding: 6px 8px; width: 35px; text-align: center;">#</th>
              <th style="padding: 6px 8px; text-align: left;">পণ্যের নাম</th>
              <th style="padding: 6px 8px; width: 85px; text-align: center;">পরিমাণ</th>
              <th style="padding: 6px 8px; width: 70px; text-align: center;">ফেরত</th>
              <th style="padding: 6px 8px; width: 75px; text-align: center;">ড্যামেজ</th>
              <th style="padding: 6px 8px; width: 80px; text-align: right;">দর</th>
              <th style="padding: 6px 8px; width: 95px; text-align: right;">মোট ক্ষতি</th>
            </tr>
          </thead>
          <tbody>
            ${damageRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #fee2e2; color: #991b1b; font-weight: bold; font-size: 11px;">
              <td colspan="4" style="padding: 6px 8px; text-align: right;">মোট ড্যামেজ (${sheet.damageItems.length} টি পণ্য):</td>
              <td style="padding: 6px 8px; text-align: center;">${sheet.totalDamageQty || 0}</td>
              <td></td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${currency} ${(sheet.totalDamageValue || 0).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // Today Due Entries & Due Collection Entries (if any)
  const validTodayDues = (sheet.todayDueEntries || []).filter(
    (e) => (e.description && e.description.trim()) || (Number(e.amount) > 0)
  );
  const validDueCollections = (sheet.dueCollectionEntries || []).filter(
    (e) => (e.description && e.description.trim()) || (Number(e.amount) > 0)
  );

  let dueSectionHtml = '';
  if (validTodayDues.length > 0 || validDueCollections.length > 0) {
    const totalNewDue = validTodayDues.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCollected = validDueCollections.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    dueSectionHtml = `
      <div style="margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${validTodayDues.length > 0 ? `
          <div style="border: 1px solid #fed7aa; border-radius: 8px; background: #fffaf5; overflow: hidden;">
            <div style="background: #ea580c; color: white; padding: 5px 10px; font-size: 11px; font-weight: bold;">
              আজকের নতুন বাকি (${validTodayDues.length} টি এন্ট্রি)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <tbody>
                ${validTodayDues.map((e, i) => `
                  <tr style="border-bottom: 1px solid #ffedd5;">
                    <td style="padding: 4px 8px; width: 24px; color: #9a3412;">${i + 1}.</td>
                    <td style="padding: 4px 8px; font-weight: 600; color: #1e293b;">${escapeHtml(e.description || e.customerName || 'বাকি')}</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #c2410c;">${currency} ${(Number(e.amount) || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #ffedd5; font-weight: bold; color: #9a3412;">
                  <td colspan="2" style="padding: 4px 8px; text-align: right;">মোট নতুন বাকি:</td>
                  <td style="padding: 4px 8px; text-align: right; font-family: monospace;">${currency} ${totalNewDue.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : '<div></div>'}

        ${validDueCollections.length > 0 ? `
          <div style="border: 1px solid #a7f3d0; border-radius: 8px; background: #f0fdf4; overflow: hidden;">
            <div style="background: #059669; color: white; padding: 5px 10px; font-size: 11px; font-weight: bold;">
              বকেয়া আদায় / কালেকশন (${validDueCollections.length} টি এন্ট্রি)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <tbody>
                ${validDueCollections.map((e, i) => `
                  <tr style="border-bottom: 1px solid #d1fae5;">
                    <td style="padding: 4px 8px; width: 24px; color: #065f46;">${i + 1}.</td>
                    <td style="padding: 4px 8px; font-weight: 600; color: #1e293b;">${escapeHtml(e.description || 'কালেকশন')}</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #047857;">${currency} ${(Number(e.amount) || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #d1fae5; font-weight: bold; color: #065f46;">
                  <td colspan="2" style="padding: 4px 8px; text-align: right;">মোট আদায়:</td>
                  <td style="padding: 4px 8px; text-align: right; font-family: monospace;">${currency} ${totalCollected.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : '<div></div>'}
      </div>
    `;
  }

  // Final Net Sales calculation
  const grossSales = sheet.totalGrossAmount || 0;
  const damageValue = sheet.totalDamageValue || 0;
  const netDailySales = typeof sheet.finalNetSalesAmount === 'number'
    ? sheet.finalNetSalesAmount
    : grossSales - damageValue;

  container.innerHTML = `
    <div>
      <!-- Top Dark Accent Bar -->
      <div style="height: 4px; background: #0f172a; margin-bottom: 16px; border-radius: 2px;"></div>

      <!-- Letterhead Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <!-- MM TRADERS Logo Emblem -->
          <div style="width: 54px; height: 54px; border-radius: 10px; background: #0f172a; border: 1.5px solid #f59e0b; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <span style="color: #fbbf24; font-weight: 900; font-size: 16px; line-height: 1; letter-spacing: 0.5px;">MM</span>
            <span style="color: #e2e8f0; font-weight: bold; font-size: 7px; letter-spacing: 0.5px; margin-top: 2px;">TRADERS</span>
          </div>

          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; text-transform: uppercase;">
              ${escapeHtml(settings.businessName || 'MM TRADERS — DISTRIBUTOR')}
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              ${escapeHtml(settings.address || 'Dhaka, Bangladesh')} • ফোন: ${escapeHtml(settings.phone || '01711-XXXXXX')}
              ${settings.proprietorName ? ` • স্বত্বাধিকারী: ${escapeHtml(settings.proprietorName)}` : ''}
            </div>
          </div>
        </div>

        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; ${
            isCompleted
              ? 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;'
              : 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
          }">
            ${isCompleted ? '✓ হিসাব সম্পন্ন (Completed)' : '⏳ চলমান খাতা (Pending)'}
          </span>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">
            শিট নং: #${sheet.sheetNo || sheet.id.slice(0, 8)}
          </div>
        </div>
      </div>

      <!-- Report Title -->
      <div style="margin-top: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div style="font-size: 14px; font-weight: 800; color: #1e293b;">
          দৈনিক হিসাব ও বিক্রয় চালান বিবরণী (Daily Sales Sheet)
        </div>
        <div style="font-size: 10px; color: #64748b;">
          প্রিন্ট তারিখ: ${new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      <!-- 4 Header Meta Fields -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px;">
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600;">১. রুট (Route)</div>
          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 1px;">${escapeHtml(sheet.routeOrVan || 'সাধারণ রুট')}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600;">২. তারিখ (Date)</div>
          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 1px; font-family: monospace;">${escapeHtml(sheet.date)}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600;">৩. এস আর (SR Name)</div>
          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 1px;">${escapeHtml(sheet.srName || '-')}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600;">৪. ডি এস আর (DSR Name)</div>
          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 1px;">${escapeHtml(sheet.dsrName || '-')}</div>
        </div>
      </div>

      <!-- Main Products Sales Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: bold;">
            <th style="padding: 7px 8px; width: 35px; text-align: center;">#</th>
            <th style="padding: 7px 8px; text-align: left;">পণ্যের নাম (Product Name)</th>
            <th style="padding: 7px 8px; width: 85px; text-align: center;">বিতরণ (Issue)</th>
            <th style="padding: 7px 8px; width: 70px; text-align: center;">ফেরত (Return)</th>
            <th style="padding: 7px 8px; width: 75px; text-align: center;">মোট বিক্রি</th>
            <th style="padding: 7px 8px; width: 80px; text-align: right;">দর (Rate)</th>
            <th style="padding: 7px 8px; width: 95px; text-align: right;">মোট টাকা</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || `
            <tr>
              <td colspan="7" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 11px;">
                কোন পণ্য যোগ করা হয়নি
              </td>
            </tr>
          `}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; color: #0f172a; font-weight: bold; font-size: 11.5px; border-top: 2px solid #cbd5e1;">
            <td style="padding: 7px 8px; text-align: center;"></td>
            <td style="padding: 7px 8px; text-align: left;">সর্বমোট (${sheet.items.length} টি পণ্য):</td>
            <td style="padding: 7px 8px; text-align: center; color: #1e40af;">${sheet.totalIssuedQty || 0}</td>
            <td style="padding: 7px 8px; text-align: center; color: #b45309;">${sheet.totalReturnQty || 0}</td>
            <td style="padding: 7px 8px; text-align: center; color: #047857;">${sheet.totalNetSoldQty || 0}</td>
            <td></td>
            <td style="padding: 7px 8px; text-align: right; font-family: monospace; color: #0f172a;">${currency} ${(sheet.totalGrossAmount || 0).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Damage Section (if present) -->
      ${damageSectionHtml}

      <!-- Due & Collection Section (if present) -->
      ${dueSectionHtml}

      <!-- Financial Reconciliation Summary (2 Column Box) -->
      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <!-- Left: Due Summary -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; padding: 10px 14px;">
          <div style="font-size: 11px; font-weight: bold; color: #92400e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            বাকি বিবরণী (Due Summary)
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #475569;">
            <span>পূর্বের মোট বাকি:</span>
            <span style="font-family: monospace; font-weight: 600;">${currency} ${(sheet.previousDue || 0).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #c2410c;">
            <span>আজকের নতুন বাকি (+):</span>
            <span style="font-family: monospace; font-weight: bold;">${currency} ${(sheet.marketDue || sheet.todayDue || 0).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #047857;">
            <span>আজকের বকেয়া আদায় (-):</span>
            <span style="font-family: monospace; font-weight: bold;">${currency} ${(sheet.cashCollected || sheet.dueCollection || 0).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; border-top: 1px solid #cbd5e1; padding-top: 4px; font-weight: bold; color: #78350f;">
            <span>বর্তমান অবশিষ্ট বাকি:</span>
            <span style="font-family: monospace;">${currency} ${(sheet.totalClosingDue || 0).toLocaleString()}</span>
          </div>
        </div>

        <!-- Right: Sales & Cash Reconciliation -->
        <div style="border: 1px solid #bbf7d0; border-radius: 8px; background: #f0fdf4; padding: 10px 14px;">
          <div style="font-size: 11px; font-weight: bold; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px; margin-bottom: 6px;">
            বিক্রি ও ক্যাশ সারসংক্ষেপ (Sales & Cash Summary)
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #475569;">
            <span>১. মূল বিক্রি (Gross Sales):</span>
            <span style="font-family: monospace; font-weight: 600;">${currency} ${grossSales.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #dc2626;">
            <span>২. বাদ ড্যামেজ (Damage):</span>
            <span style="font-family: monospace; font-weight: 600;">- ${currency} ${damageValue.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; font-weight: bold; color: #065f46;">
            <span>৩. নিট মোট বিক্রি (Net Sales):</span>
            <span style="font-family: monospace;">${currency} ${netDailySales.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #475569;">
            <span>৪. খরচ (${currency} ${(sheet.marketExpense || 0).toLocaleString()}) + লেস (${currency} ${(sheet.dailyLess || 0).toLocaleString()}):</span>
            <span style="font-family: monospace;">- ${currency} ${((sheet.marketExpense || 0) + (sheet.dailyLess || 0)).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; border-top: 1.5px solid #86efac; padding-top: 4px; font-weight: 900; color: #047857;">
            <span>৫. চূড়ান্ত জমা ক্যাশ (Cash Submitted):</span>
            <span style="font-family: monospace;">${currency} ${(sheet.netCashSubmitted || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Signatures Block -->
      <div style="margin-top: 36px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center;">
        <div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10.5px; color: #475569;">
            বিক্রয় প্রতিনিধি (SR) স্বাক্ষর
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px;">
            ${escapeHtml(sheet.srName || 'SR Name')}
          </div>
        </div>

        <div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10.5px; color: #475569;">
            ডেলিভারি প্রতিনিধি (DSR) স্বাক্ষর
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px;">
            ${escapeHtml(sheet.dsrName || 'DSR Name')}
          </div>
        </div>

        <div>
          <div style="border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10.5px; color: #475569;">
            হিসাবরক্ষক / স্বত্বাধিকারী স্বাক্ষর
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px;">
            ${escapeHtml(settings.proprietorName || 'MM TRADERS')}
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 24px; padding-top: 8px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 9px; color: #94a3b8;">
        মুদ্রণ সময়: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • MM TRADERS — DISTRIBUTOR Management System • কম্পিউটার জেনারেটেড চালান বিবরণী
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for web fonts (Hind Siliguri, Noto Sans Bengali) to be ready
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Capture styled node at 2x resolution for retina-crisp typography
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Multi-page slicing if content exceeds single A4 page
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
    }

    const safeRoute = (sheet.routeOrVan || 'Daily_Sheet').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
    pdf.save(`MM_TRADERS_Daily_${sheet.date}_${safeRoute}.pdf`);
  } finally {
    // Cleanup DOM node
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}


