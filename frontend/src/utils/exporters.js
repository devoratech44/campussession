// frontend/src/utils/exporters.js
import env from '../config/env';
import brand from '../config/brand';
import { PUBLIC_TYPES, dayLabel, formatHours, periodLabel, toMinutes, totalHours } from './schedule';
import { TIMEZONE, TIMEZONE_LABEL } from './presence';

const HEAD = ['Jour', 'Horaire', 'Module', 'Professeur', 'Public', 'Salle', 'Période'];

const sortSlots = (slots) =>
  [...slots].sort((a, b) => a.jour - b.jour || toMinutes(a.heureDebut) - toMinutes(b.heureDebut));

const rowsOf = (slots) =>
  sortSlots(slots).map((s) => [
    dayLabel(s.jour),
    `${s.heureDebut} - ${s.heureFin}`,
    `${s.enseignement.module.code} - ${s.enseignement.module.nom}`,
    `${s.enseignement.professeur.prenom} ${s.enseignement.professeur.nom}`,
    `${PUBLIC_TYPES[s.enseignement.publicType]} : ${s.enseignement.publicLabel}`,
    s.salle || '-',
    periodLabel(s),
  ]);

const stamp = () => new Date().toISOString().slice(0, 10);

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

export async function exportSchedulePdf({ slots, title, subtitle }) {
  const [{ jsPDF }, autoTableModule, QRCode] = await Promise.all([import('jspdf'), import('jspdf-autotable'), import('qrcode')]);
  const autoTable = autoTableModule.default;
  const [logo, qr] = await Promise.all([toDataUrl('/logo.png'), QRCode.toDataURL(env.authorUrl, { margin: 1, width: 180 })]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const total = formatHours(totalHours(slots));

  doc.addImage(logo, 'PNG', 12, 8, 18, 18);
  doc.setFontSize(18);
  doc.setTextColor(brand.green);
  doc.text(`${env.appName} - ${title}`, 34, 15);
  doc.setFontSize(10);
  doc.setTextColor('#444444');
  doc.text(subtitle, 34, 21);
  doc.text(`Total : ${total} par semaine  |  Édité le ${new Date().toLocaleDateString('fr-FR', { timeZone: TIMEZONE })} (${TIMEZONE_LABEL})`, 34, 26);

  autoTable(doc, {
    startY: 32,
    head: [HEAD],
    body: rowsOf(slots),
    styles: { fontSize: 9, cellPadding: 2.2 },
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

  doc.save(`emploi-du-temps_${stamp()}.pdf`);
}

export async function exportScheduleExcel({ slots, title, subtitle }) {
  const ExcelJS = (await import('exceljs')).default;
  const argb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = env.authorName;
  const ws = wb.addWorksheet('Emploi du temps', { views: [{ state: 'frozen', ySplit: 4 }] });

  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = `${env.appName} - ${title}`;
  ws.getCell('A1').font = { size: 16, bold: true, color: { argb: argb(brand.green) } };
  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = subtitle;
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF555555' } };

  const header = ws.getRow(4);
  header.values = HEAD;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(brand.green) } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  rowsOf(slots).forEach((row) => ws.addRow(row));
  [12, 14, 34, 26, 34, 14, 26].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.autoFilter = { from: 'A4', to: `G${4 + slots.length}` };

  const last = ws.addRow([]);
  last.getCell(1).value = `Total : ${formatHours(totalHours(slots))} par semaine`;
  last.getCell(1).font = { bold: true };

  const credit = ws.addRow([env.copyright]);
  credit.getCell(1).font = { size: 9, color: { argb: 'FF666666' } };
  const link = ws.addRow([]);
  link.getCell(1).value = { text: `Conçu et développé par ${env.authorName}`, hyperlink: env.authorUrl };
  link.getCell(1).font = { size: 9, bold: true, color: { argb: argb(brand.gold) }, underline: true };

  const buffer = await wb.xlsx.writeBuffer();
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `emploi-du-temps_${stamp()}.xlsx`
  );
}