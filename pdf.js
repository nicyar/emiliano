const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Leer el logo desde archivo externo base64
const LOGO_BASE64 = fs.readFileSync(path.join(__dirname, 'logo_base64.txt'), 'utf8').trim();

function fmt(n) {
  return '$\u00a0' + Math.abs(Math.round(n)).toLocaleString('es-AR');
}

module.exports = function generatePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 60, right: 60 } });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const W    = doc.page.width - 120;
    const COL  = '#185FA5';   // azul principal
    const DARK = '#1F2937';
    const MUTED = '#6B7280';

    // ── ENCABEZADO ──────────────────────────────────────────────────────────
    const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
    doc.image(logoBuffer, 60, 55, {
      fit: [130, 55],
      align: 'center',
      valign: 'center'
    });

    // Nombre de la empresa
    doc.fontSize(20).fillColor(COL).font('Helvetica-Bold')
       .text('Urbana R\u00fabrica Digital', 205, 62);
    doc.fontSize(10).fillColor(MUTED).font('Helvetica')
       .text('Presupuesto de servicios', 205, 88);

    // Línea separadora
    doc.moveTo(60, 122).lineTo(60 + W, 122).strokeColor(COL).lineWidth(2).stroke();

    let y = 142;

    // ── FECHA Y NÚMERO ───────────────────────────────────────────────────────
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text('FECHA', 60, y);
    doc.fontSize(8).fillColor(MUTED).text('N\u00ba DE PRESUPUESTO', 400, y);
    y += 13;
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(data.fecha, 60, y);
    doc.fontSize(11).fillColor(DARK).text(String(data.numero || '001').padStart(3, '0'), 400, y);
    y += 32;

    // ── DESTINATARIO ─────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text('PRESUPUESTO PARA', 60, y);
    y += 13;
    doc.fontSize(15).fillColor(DARK).font('Helvetica-Bold').text(data.razonSocial, 60, y);
    y += 38;

    // ── TABLA DE SERVICIOS ───────────────────────────────────────────────────
    doc.rect(60, y, W, 26).fill(COL);
    doc.fontSize(10).fillColor('white').font('Helvetica-Bold')
       .text('DETALLE DE SERVICIOS', 70, y + 8);
    doc.fontSize(10).fillColor('white').font('Helvetica-Bold')
       .text('IMPORTE', 60, y + 8, { width: W - 10, align: 'right' });
    y += 34;

    // Filas de servicios
    let shade = false;
    data.items.forEach(item => {
      const isDiscount = item.value < 0;
      if (isDiscount) {
        doc.rect(60, y, W, 22).fill('#F0FBF4');
        doc.fontSize(10).fillColor('#0F6E56').font('Helvetica')
           .text(item.label, 70, y + 6, { width: W - 120 });
        doc.fontSize(10).fillColor('#0F6E56').font('Helvetica-Bold')
           .text('-\u00a0' + fmt(item.value), 60, y + 6, { width: W - 10, align: 'right' });
      } else {
        if (shade) doc.rect(60, y, W, 22).fill('#F3F7FC');
        doc.fontSize(10).fillColor(DARK).font('Helvetica')
           .text(item.label, 70, y + 6, { width: W - 120 });
        doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
           .text(fmt(item.value), 60, y + 6, { width: W - 10, align: 'right' });
        shade = !shade;
      }
      y += 24;
    });

    // Línea antes del total
    y += 6;
    doc.moveTo(60, y).lineTo(60 + W, y).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
    y += 10;

    // Total
    doc.rect(60, y, W, 34).fill(COL);
    doc.fontSize(11).fillColor('white').font('Helvetica-Bold')
       .text('TOTAL DEL PRESUPUESTO', 70, y + 11);
    doc.fontSize(14).fillColor('white').font('Helvetica-Bold')
       .text(fmt(data.total), 60, y + 9, { width: W - 10, align: 'right' });
    y += 50;

    // ── REGISTRO DE EMPLEADORES (si aplica) ──────────────────────────────────
    if (data.registro) {
      doc.moveTo(60, y).lineTo(60 + W, y).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      y += 14;
      doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('REGISTRO DE EMPLEADORES', 60, y);
      y += 13;
      doc.fontSize(10).fillColor(DARK).font('Helvetica')
         .text(
           `Cantidad de empleados:\u00a0${data.registro.empleados}\u2003|\u2003Fecha de realizaci\u00f3n:\u00a0${data.registro.fechaRealizacion}`,
           60, y
         );
      y += 28;
    }

    // ── NOTAS ────────────────────────────────────────────────────────────────
    doc.fontSize(9).fillColor(MUTED).font('Helvetica-Oblique')
       .text('Nota: los precios indicados no incluyen IVA salvo menci\u00f3n expresa.', 60, y, { width: W });

    // ── PIE DE PÁGINA ────────────────────────────────────────────────────────
    const footerY = doc.page.height - 70;
    doc.moveTo(60, footerY).lineTo(60 + W, footerY).strokeColor(COL).lineWidth(1).stroke();
    doc.fontSize(8).fillColor(MUTED).font('Helvetica')
       .text(
         'Este presupuesto tiene validez de 30 d\u00edas desde la fecha de emisi\u00f3n.',
         60, footerY + 10, { width: W, align: 'center' }
       );
    doc.fontSize(8).fillColor(MUTED)
       .text('Urbana R\u00fabrica Digital', 60, footerY + 22, { width: W, align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};