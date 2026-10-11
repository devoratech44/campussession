// frontend/src/utils/reportExporters.js
import env from '../config/env';
import brand from '../config/brand';
import { TIMEZONE, TIMEZONE_LABEL } from './presence';

const stamp = () => new Date().toISOString().slice(0, 10);
const editedOn = () => `${new Date().toLocaleDateString('fr-FR', { timeZone: TIMEZONE })} (${TIMEZONE_LABEL})`;

async function toDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportTablePdf({ title, subtitle, head, rows, filename }) {
  const [{ jsPDF }, autoTableModule, QRCode] = await Promise.all([import('jspdf'), import('jspdf-autotable'), import('qrcode')]);
  const autoTable = autoTableModule.default;
  const [logo, qr] = await Promise.all([toDataUrl('/logo.png'), QRCode.toDataURL(env.authorUrl, { margin: 1, width: 180 })]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.addImage(logo, 'PNG', 12, 8, 18, 18);
  doc.setFontSize(18);
  doc.setTextColor(brand.green);
  doc.text(`${env.appName} - ${title}`, 34, 15);
  doc.setFontSize(10);
  doc.setTextColor('#444444');
  doc.text(subtitle, 34, 21);
  doc.text(`${rows.length} ligne(s)  |  Édité le ${editedOn()}`, 34, 26);

  autoTable(doc, {
    startY: 32,
    head: [head],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: brand.green, textColor: '#ffffff' },
    alternateRowStyles: { fillColor: '#f0f7f3' },
    margin: { left: 12, right: 12, bottom: 22 },
    didDrawPage: () => {
      doc.setDrawColor(brand.gold);
      doc.setLineWidth(0.6);
      doc.line(12, height - 19, width - 12, height - 19);
      doc.setFontSize(8);
      doc.setTextColor('#444444');
      doc.text(env.copyright, 12, height - 13);
      doc.text(`Conçu et développé par ${env.authorName} - ${env.authorUrl}`, 12, height - 8);
      doc.addImage(qr, 'PNG', width - 28, height - 17, 14, 14);
    },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor('#444444');
    doc.text(`Page ${i} / ${pages}`, width - 32, height - 21, { align: 'right' });
  }
  doc.save(`${filename}_${stamp()}.pdf`);
}

export async function exportTableExcel({ title, subtitle, head, rows, filename }) {
  const ExcelJS = (await import('exceljs')).default;
  const argb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`;
  const cols = head.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = env.authorName;
  const ws = wb.addWorksheet(title.slice(0, 31), { views: [{ state: 'frozen', ySplit: 4 }] });

  ws.mergeCells(1, 1, 1, cols);
  ws.getCell(1, 1).value = `${env.appName} - ${title}`;
  ws.getCell(1, 1).font = { size: 16, bold: true, color: { argb: argb(brand.green) } };
  ws.mergeCells(2, 1, 2, cols);
  ws.getCell(2, 1).value = `${subtitle}  |  Édité le ${editedOn()}`;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF555555' } };

  const header = ws.getRow(4);
  header.values = head;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(brand.green) } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  rows.forEach((row) => ws.addRow(row));
  head.forEach((h, i) => { ws.getColumn(i + 1).width = Math.max(12, String(h).length + 4, i === 0 ? 28 : 0); });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: cols } };

  ws.addRow([]);
  ws.addRow([env.copyright]).getCell(1).font = { size: 9, color: { argb: 'FF666666' } };
  const link = ws.addRow([]);
  link.getCell(1).value = { text: `Conçu et développé par ${env.authorName}`, hyperlink: env.authorUrl };
  link.getCell(1).font = { size: 9, bold: true, color: { argb: argb(brand.gold) }, underline: true };

  const buffer = await wb.xlsx.writeBuffer();
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}_${stamp()}.xlsx`);
}