import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { inr, formatDate } from './format.js';

const PLUM = [107, 44, 79];
const GOLD = [184, 134, 11];
const INK = [35, 26, 31];

/**
 * Generate a branded PDF receipt for a single purchase and trigger download.
 * `purchase.customer` may be a populated object or just an id+name.
 */
export function generateReceipt(purchase, customer) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const cust = customer || purchase.customer || {};

  // ── Header band ──
  doc.setFillColor(...PLUM);
  doc.rect(0, 0, pageW, 110, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.text('Tanvi Boutique', 40, 56);
  doc.setTextColor(245, 236, 207);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Fashion Boutique · Hyderabad', 40, 76);
  doc.setFontSize(9);
  doc.text('Customer Receipt', pageW - 40, 50, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(purchase.invoiceNo || 'TB-RECEIPT', pageW - 40, 68, { align: 'right' });

  // ── Meta block ──
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Billed To', 40, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(cust.name || '—', 40, 166);
  if (cust.phone) doc.text(String(cust.phone), 40, 181);
  if (cust.email) doc.text(String(cust.email), 40, 196);

  doc.setFont('helvetica', 'bold');
  doc.text('Date', pageW - 200, 150);
  doc.text('Payment', pageW - 200, 181);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(purchase.date), pageW - 120, 150);
  doc.text(purchase.paymentMethod || '—', pageW - 120, 181);

  // ── Items table ──
  const rows = (purchase.items || []).map((it) => [
    it.name,
    it.category,
    String(it.quantity),
    inr(it.unitPrice),
    inr(it.quantity * it.unitPrice),
  ]);

  autoTable(doc, {
    startY: 220,
    head: [['Item', 'Category', 'Qty', 'Unit Price', 'Amount']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: PLUM, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 244, 247] },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 8, textColor: INK },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  const endY = doc.lastAutoTable.finalY + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PLUM);
  doc.text('Total', pageW - 200, endY);
  doc.text(inr(purchase.amount), pageW - 40, endY, { align: 'right' });

  // ── Footer ──
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(40, endY + 16, pageW - 40, endY + 16);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(120, 110, 116);
  doc.text(
    'Thank you for shopping with Tanvi Boutique. We look forward to styling you again.',
    40,
    endY + 36
  );

  doc.save(`${purchase.invoiceNo || 'receipt'}.pdf`);
}
