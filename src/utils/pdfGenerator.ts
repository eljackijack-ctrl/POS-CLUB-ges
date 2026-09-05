import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Payment, 
  CompanyProfile, 
  DailyReport, 
  MonthlyReport, 
  SectionClosingRecord, 
  Product
} from '../types';
import { formatFCFA, formatFullDateTime, formatDateShort } from './formatters';

/**
 * Generate and download a high-definition PDF invoice/receipt for a payment
 */
export function exportReceiptPDF(payment: Payment, company: CompanyProfile): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 220] // 80mm standard receipt format
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 10;

  // Header - Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text((company.name || 'CLUBPOS FCFA').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Slogan
  if (company.slogan) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(company.slogan, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
  }

  // Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  if (company.address || company.cityCountry) {
    doc.text(`${company.address || ''} - ${company.cityCountry || ''}`.trim(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 3.5;
  }
  if (company.phone) {
    doc.text(`Tél: ${company.phone} ${company.email ? `| ${company.email}` : ''}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3.5;
  }

  // Tax Identifiers (NIF / RCCM)
  if (company.nif || company.rccm) {
    doc.text(`${company.nif || ''}  ${company.rccm || ''}`.trim(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
  }

  // Divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, currentY, pageWidth - 4, currentY);
  doc.setLineDashPattern([], 0);
  currentY += 4;

  // Ticket Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`FACTURE N° ${payment.id}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Date : ${formatFullDateTime(payment.timestamp)}`, 4, currentY);
  currentY += 3.5;
  doc.text(`Table : ${payment.tableName}`, 4, currentY);
  doc.text(`Serveur : ${payment.serverName}`, pageWidth - 4, currentY, { align: 'right' });
  currentY += 3.5;
  doc.text(`Caisse : ${payment.cashierName}`, 4, currentY);
  doc.text(`Règlement : ${payment.paymentMethod}`, pageWidth - 4, currentY, { align: 'right' });
  currentY += 4;

  // Items Table
  const tableData = (payment.itemsSnapshot || []).map((item) => [
    `${item.quantity}x`,
    `${item.productName} (${item.format || 'BTL'})`,
    formatFCFA(item.totalPriceFCFA)
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 4, right: 4 },
    head: [['Qté', 'Désignation', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1,
      textColor: [20, 20, 20],
      overflow: 'linebreak'
    },
    headStyles: {
      fontStyle: 'bold',
      textColor: [0, 0, 0],
      lineColor: [180, 180, 180],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'left' },
      1: { cellWidth: 38, halign: 'left' },
      2: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 3;

  // Divider
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, currentY, pageWidth - 4, currentY);
  doc.setLineDashPattern([], 0);
  currentY += 4;

  // Financial Totals
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Sous-Total Brut :', 4, currentY);
  doc.text(formatFCFA(payment.subTotalFCFA), pageWidth - 4, currentY, { align: 'right' });
  currentY += 3.5;

  if (payment.discountFCFA > 0) {
    doc.setTextColor(180, 30, 30);
    doc.text(`Remise accordée :`, 4, currentY);
    doc.text(`- ${formatFCFA(payment.discountFCFA)}`, pageWidth - 4, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    currentY += 3.5;
  }

  // Net Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL PAYÉ (TTC) :', 4, currentY);
  doc.text(formatFCFA(payment.totalPaidFCFA), pageWidth - 4, currentY, { align: 'right' });
  currentY += 5;

  if (payment.paymentMethod === 'ESPECES' && payment.cashGivenFCFA) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Espèces reçues :', 4, currentY);
    doc.text(formatFCFA(payment.cashGivenFCFA), pageWidth - 4, currentY, { align: 'right' });
    currentY += 3.5;
    doc.text('Monnaie rendue :', 4, currentY);
    doc.text(formatFCFA(payment.changeReturnedFCFA || 0), pageWidth - 4, currentY, { align: 'right' });
    currentY += 4.5;
  }

  // Footer / Legal mention
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, currentY, pageWidth - 4, currentY);
  doc.setLineDashPattern([], 0);
  currentY += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  const footerMsg = company.receiptFooterMessage || 'Merci pour votre confiance ! À très bientôt.';
  const splitFooter = doc.splitTextToSize(footerMsg, pageWidth - 8);
  doc.text(splitFooter, pageWidth / 2, currentY, { align: 'center' });
  currentY += splitFooter.length * 3 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Document certifié • ClubPOS FCFA', pageWidth / 2, currentY, { align: 'center' });

  // Save the PDF
  doc.save(`Facture_${payment.id}_${payment.tableName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generate and download a full A4 PDF for Daily Z-Report
 */
export function exportDailyZReportPDF(
  dailyReport: DailyReport, 
  company: CompanyProfile, 
  dateStr: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(245, 158, 11); // Amber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((company.name || 'CLUBPOS').toUpperCase(), 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`RAPPORT DE CLÔTURE JOURNALIÈRE (RAPPORT Z)`, 14, 18);

  doc.setTextColor(180, 190, 205);
  doc.setFontSize(8);
  doc.text(`Date de session : ${formatDateShort(dateStr)} | Généré le : ${formatFullDateTime(new Date().toISOString())}`, 14, 23);

  currentY = 36;

  const totalDiscounts = dailyReport.payments ? dailyReport.payments.reduce((acc, p) => acc + (p.discountFCFA || 0), 0) : 0;
  const totalItemsSold = dailyReport.topProducts.reduce((acc, p) => acc + (p.quantitySold || 0), 0);

  // Key KPI Cards Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. SYNTHÈSE DES ENCAISSEMENTS', 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Indicateur', 'Valeur en FCFA / Unités']],
    body: [
      ['Chiffre d’Affaires Total Net', formatFCFA(dailyReport.totalRevenueFCFA)],
      ['Total des Remises Accordées', formatFCFA(totalDiscounts)],
      ['Nombre Total d’Encaissements / Factures', `${dailyReport.totalOrdersCount} commandes`],
      ['Panier Moyen par Commande', formatFCFA(dailyReport.averageBasketFCFA)],
      ['Total Articles / Bouteilles Servies', `${totalItemsSold} unités`],
      ['Clients / Invités Reçus', `${dailyReport.totalGuests || 0} personnes`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8;

  // Payment Methods Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. RÉPARTITION PAR MODE DE RÈGLEMENT', 14, currentY);
  currentY += 5;

  const paymentData = Object.entries(dailyReport.paymentsByMethod || {}).map(([method, amount]) => [
    method,
    formatFCFA(Number(amount)),
    dailyReport.totalRevenueFCFA > 0 ? `${Math.round((Number(amount) / dailyReport.totalRevenueFCFA) * 100)} %` : '0 %'
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Mode de Paiement', 'Montant Net (FCFA)', 'Part %']],
    body: paymentData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8;

  // Category Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. VENTES PAR CATÉGORIE', 14, currentY);
  currentY += 5;

  const categoryData = (dailyReport.salesByCategory || []).map((cat) => [
    cat.categoryLabel || cat.category,
    `${cat.quantitySold} unité(s)`,
    formatFCFA(cat.totalFCFA),
    dailyReport.totalRevenueFCFA > 0 ? `${Math.round((cat.totalFCFA / dailyReport.totalRevenueFCFA) * 100)} %` : '0 %'
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Catégorie de Boisson', 'Quantité Vendue', 'Recette (FCFA)', 'Part %']],
    body: categoryData,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8;

  // Check if we need a second page for Top Products & Staff
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // Top Products Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('4. TOP ARTICLES & BOUTEILLES LES PLUS VENDUES', 14, currentY);
  currentY += 5;

  const topProductsData = (dailyReport.topProducts || []).slice(0, 15).map((p, idx) => [
    `#${idx + 1}`,
    p.productName,
    p.categoryName || p.category || 'DIVERS',
    `${p.quantitySold} vendus`,
    formatFCFA(p.totalFCFA)
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Rang', 'Article / Bouteille', 'Catégorie', 'Volume Vendu', 'Total Encaissé']],
    body: topProductsData,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 }
  });

  // Footer Signatures
  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  let signY = doc.lastAutoTable.finalY + 15;
  if (signY > 260) {
    doc.addPage();
    signY = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Signature du Chef de Caisse :', 20, signY);
  doc.text('Signature de la Direction / Gérance :', pageWidth - 80, signY);

  doc.setDrawColor(180, 180, 180);
  doc.line(20, signY + 15, 75, signY + 15);
  doc.line(pageWidth - 80, signY + 15, pageWidth - 20, signY + 15);

  doc.save(`Rapport_Z_${dateStr}_${(company.name || 'ClubPOS').replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generate and download a PDF for Section / Zone Closing Record
 */
export function exportSectionClosingPDF(
  record: SectionClosingRecord, 
  company: CompanyProfile
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(23, 23, 37);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((company.name || 'CLUBPOS').toUpperCase(), 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`CLÔTURE DE SECTION / ZONE : ${(record.zoneLabel || record.zone).toUpperCase()}`, 14, 18);

  doc.setTextColor(180, 190, 205);
  doc.setFontSize(8);
  doc.text(`Réf : ${record.id} | Session : ${formatFullDateTime(record.closedAt)} | Responsable : ${record.closedByName} (${record.closedByRole})`, 14, 23);

  let currentY = 34;

  const totalItemsSold = (record.topProducts || []).reduce((acc, p) => acc + p.quantitySold, 0);

  // Key KPI Cards
  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Métrique de Section', 'Valeur']],
    body: [
      ['Zone de Salle', record.zoneLabel || record.zone],
      ['Chiffre d’Affaires Réalisé', formatFCFA(record.totalRevenueFCFA)],
      ['Commandes / Encaissements', `${record.totalOrdersCount} commandes`],
      ['Total Articles / Bouteilles', `${totalItemsSold} unités`],
      ['Clients / Invités Reçus', `${record.totalGuestsServed || 0} personnes`],
      ['Tables Traitées', `${record.tablesClosedCount} table(s)`],
      ['Notes / Remarques', record.notes || 'Aucune anomalie signalée']
    ],
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8;

  // Breakdown by Server
  if (record.salesByServer && record.salesByServer.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('PERFORMANCES DES SERVEURS DE LA SECTION', 14, currentY);
    currentY += 5;

    const serverData = record.salesByServer.map(s => [
      s.serverName,
      `${s.ordersCount} commande(s)`,
      formatFCFA(s.totalFCFA)
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [['Serveur / Serveuse', 'Commandes', 'Total Encaissé']],
      body: serverData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2 }
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // Breakdown by Top Products
  if (record.topProducts && record.topProducts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('BOISSONS LES PLUS VENDUES DANS CETTE SECTION', 14, currentY);
    currentY += 5;

    const topProdData = record.topProducts.map(p => [
      p.productName,
      `${p.quantitySold} vendus`,
      formatFCFA(p.totalFCFA)
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [['Article / Bouteille', 'Quantité', 'Recette (FCFA)']],
      body: topProdData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2 }
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 15;
  } else {
    currentY += 15;
  }

  const signY = currentY > 260 ? 30 : currentY;
  if (currentY > 260) {
    doc.addPage();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Signature du Responsable de Salle :', 20, signY);
  doc.text('Signature du Gérant :', pageWidth - 80, signY);

  doc.setDrawColor(180, 180, 180);
  doc.line(20, signY + 15, 75, signY + 15);
  doc.line(pageWidth - 80, signY + 15, pageWidth - 20, signY + 15);

  doc.save(`Cloture_Section_${record.zone}_${record.id}.pdf`);
}

/**
 * Generate and download Stock Inventory Valuation PDF
 */
export function exportInventoryPDF(
  products: Product[], 
  company: CompanyProfile
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((company.name || 'CLUBPOS').toUpperCase(), 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`ÉTAT D’INVENTAIRE & VALORISATION DES STOCKS`, 14, 18);

  doc.setTextColor(180, 190, 205);
  doc.setFontSize(8);
  doc.text(`Édité le : ${formatFullDateTime(new Date().toISOString())} | Total références : ${products.length}`, 14, 23);

  let currentY = 32;

  // Global Valuation Summary
  const totalCostValuation = products.reduce((acc, p) => acc + (p.currentStock * (p.costPriceFCFA || 0)), 0);
  const totalSaleValuation = products.reduce((acc, p) => acc + (p.currentStock * p.priceFCFA), 0);
  const lowStockCount = products.filter(p => p.currentStock <= p.minStockThreshold).length;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Indicateur de Stock', 'Valeur Globale']],
    body: [
      ['Valorisation au Prix d’Achat (Coût Réel)', formatFCFA(totalCostValuation)],
      ['Valorisation au Prix de Vente (CA Potentiel)', formatFCFA(totalSaleValuation)],
      ['Marge Brute Potentielle sur Stock', formatFCFA(totalSaleValuation - totalCostValuation)],
      ['Articles en Alerte / Rupture de Stock', `${lowStockCount} référence(s)`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8;

  // Inventory Table
  const inventoryRows = products.map((p) => [
    p.name,
    p.category,
    p.format || 'BOUTEILLE',
    `${p.currentStock} un.`,
    `${p.minStockThreshold} un.`,
    p.currentStock <= p.minStockThreshold ? 'ALERTE' : 'OK',
    formatFCFA(p.costPriceFCFA || 0),
    formatFCFA(p.priceFCFA),
    formatFCFA(p.currentStock * (p.costPriceFCFA || 0)),
    formatFCFA(p.currentStock * p.priceFCFA)
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [['Article', 'Catégorie', 'Format', 'Stock', 'Seuil', 'État', 'P.A', 'P.V', 'Val. Achat', 'Val. Vente']],
    body: inventoryRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      5: { halign: 'center', fontStyle: 'bold' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.save(`Inventaire_Stocks_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Generate and download Monthly Report PDF
 */
export function exportMonthlyReportPDF(
  monthlyReport: MonthlyReport, 
  company: CompanyProfile
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((company.name || 'CLUBPOS').toUpperCase(), 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`BILAN MENSUEL CONSOLIDÉ : ${monthlyReport.monthLabel.toUpperCase()}`, 14, 18);

  doc.setTextColor(180, 190, 205);
  doc.setFontSize(8);
  doc.text(`Édité le : ${formatFullDateTime(new Date().toISOString())}`, 14, 23);

  let currentY = 34;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Indicateur Mensuel', 'Valeur']],
    body: [
      ['Chiffre d’Affaires Total du Mois', formatFCFA(monthlyReport.totalRevenueFCFA)],
      ['Total des Commandes Encaissées', `${monthlyReport.totalOrdersCount} commandes`],
      ['Moyenne Quotidienne de CA', formatFCFA(monthlyReport.averageDailyRevenueFCFA)],
      ['Panier Moyen Mensuel', formatFCFA(monthlyReport.averageBasketFCFA)],
      ['Meilleure Soirée du Mois', monthlyReport.bestDay ? `${monthlyReport.bestDay.dateFormatted} (${formatFCFA(monthlyReport.bestDay.revenueFCFA)})` : 'N/A']
    ],
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8;

  // Daily Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('DÉTAIL JOUR PAR JOUR', 14, currentY);
  currentY += 5;

  const dailyRows = (monthlyReport.dailyBreakdown || []).map(d => [
    d.dayLabel,
    `${d.ordersCount} commande(s)`,
    formatFCFA(d.revenueFCFA)
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Jour du Mois', 'Nombre de Commandes', 'Recette Journalière (FCFA)']],
    body: dailyRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 1.8 }
  });

  doc.save(`Bilan_Mensuel_${monthlyReport.yearMonth}.pdf`);
}
