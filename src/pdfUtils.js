import { jsPDF } from 'jspdf';

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' });
  } catch (_) {
    return '—';
  }
}

function clip(str, n) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function generateCertificatePDF(firma) {
  const {
    fileName = '—',
    fileSize,
    fileType = '—',
    hash = '—',
    userEmail = '—',
    signedAt,
    id: docId = '—',
    signature: signatureBase64,
  } = firma;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const m = 14;
  const cW = W - m * 2;

  // ─── Header ──────────────────────────────────────────────────────
  pdf.setFillColor(10, 10, 15);
  pdf.rect(0, 0, W, 28, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(228, 228, 228);
  pdf.text('SSRS', m, 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text('VALIDADOR DE DOCUMENTOS DIGITALES', m, 20.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(74, 108, 247);
  pdf.text('CERTIFICADO DIGITAL', W - m, 17, { align: 'right' });

  // ─── Status badge ─────────────────────────────────────────────────
  pdf.setFillColor(230, 255, 245);
  pdf.setDrawColor(0, 180, 110);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(m, 34, 74, 8, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(0, 160, 100);
  pdf.text('● FIRMADO Y VERIFICADO', m + 4, 39.5);

  // ─── Title ────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(21);
  pdf.setTextColor(10, 10, 15);
  pdf.text('Certificado de Firma Digital', m, 57);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(107, 107, 123);
  pdf.text('Sistema de Seguimiento y Registro de Seguridad · 2026', m, 65);

  // ─── Divider ──────────────────────────────────────────────────────
  pdf.setDrawColor(220, 220, 228);
  pdf.setLineWidth(0.3);
  pdf.line(m, 72, W - m, 72);

  // ─── Two-column info ──────────────────────────────────────────────
  const colL = m;
  const colR = 112;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text('DOCUMENTO', colL, 82);

  [
    ['Nombre', clip(fileName, 34)],
    ['Tamaño', fmtSize(fileSize)],
    ['Tipo', (fileType.split('/').pop() || fileType).toUpperCase()],
  ].forEach(([label, val], i) => {
    const y = 91 + i * 8.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 107, 123);
    pdf.text(label + ':', colL, y);
    pdf.setTextColor(26, 26, 37);
    pdf.text(val, colL + 20, y);
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text('FIRMANTE', colR, 82);

  [
    ['Email', clip(userEmail, 28)],
    ['Fecha', clip(fmtDate(signedAt), 28)],
  ].forEach(([label, val], i) => {
    const y = 91 + i * 8.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 107, 123);
    pdf.text(label + ':', colR, y);
    pdf.setTextColor(26, 26, 37);
    pdf.text(val, colR + 16, y);
  });

  // ─── Hash ─────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text('INTEGRIDAD · SHA-256', colL, 120);

  pdf.setFillColor(245, 245, 247);
  pdf.setDrawColor(220, 220, 228);
  pdf.roundedRect(colL, 124, cW, 21, 1.5, 1.5, 'FD');

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(74, 108, 247);
  pdf.text(hash.slice(0, 32), colL + 4, 132);
  pdf.text(hash.slice(32) || '', colL + 4, 139);

  // ─── Certificate ID ───────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text('IDENTIFICADOR DE CERTIFICADO', colL, 154);

  pdf.setFillColor(245, 245, 247);
  pdf.setDrawColor(220, 220, 228);
  pdf.roundedRect(colL, 158, cW, 12, 1.5, 1.5, 'FD');

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(26, 26, 37);
  pdf.text(docId, colL + 4, 166);

  // ─── Divider ──────────────────────────────────────────────────────
  pdf.setDrawColor(220, 220, 228);
  pdf.setLineWidth(0.3);
  pdf.line(m, 178, W - m, 178);

  // ─── Signature ────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text('FIRMA DIGITAL', colL, 186);

  const bX = colL, bY = 190, bW = cW, bH = 52;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 220, 228);
  pdf.roundedRect(bX, bY, bW, bH, 2, 2, 'FD');

  if (signatureBase64) {
    // canvas es 700×250 → ratio 2.8:1
    const iW = Math.min(bW - 12, 130);
    const iH = iW / 2.8;
    try {
      pdf.addImage(signatureBase64, 'PNG', bX + (bW - iW) / 2, bY + (bH - iH) / 2, iW, iH);
    } catch (_) { /* skip si falla */ }
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(136, 136, 160);
  pdf.text(
    'Firma capturada digitalmente · Verificable mediante el hash SHA-256 del documento',
    colL, bY + bH + 6
  );

  // ─── Footer ───────────────────────────────────────────────────────
  const fY = 258;
  pdf.setFillColor(245, 245, 247);
  pdf.rect(0, fY, W, 297 - fY, 'F');
  pdf.setDrawColor(220, 220, 228);
  pdf.setLineWidth(0.3);
  pdf.line(0, fY, W, fY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(10, 10, 15);
  pdf.text('SSRS · Derecho Informático · 2026', m, fY + 9);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 107, 123);
  pdf.text(
    'Este certificado verifica la autenticidad del documento mediante hash criptográfico SHA-256.',
    m, fY + 17
  );
  pdf.text(
    'Generado: ' + new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }),
    m, fY + 25
  );

  return pdf;
}
