// Ekspor rekap nilai ke Excel (format mengikuti sheet "Rekap Kelas" pada form penilaian)
import { INDIKATOR_A } from './rubrik.js';

export async function eksporRekap(rows, { judulKelas = 'Semua kelas', sekolah = '' } = {}) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aplikasi Presentasi PKL';
  wb.created = new Date();

  const navy = 'FF1B2340';
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6ECFD' } };
  const border = { top: { style: 'thin', color: { argb: 'FFD5DBE8' } }, left: { style: 'thin', color: { argb: 'FFD5DBE8' } }, bottom: { style: 'thin', color: { argb: 'FFD5DBE8' } }, right: { style: 'thin', color: { argb: 'FFD5DBE8' } } };

  // ---- Sheet 1: Rekap Kelas
  const ws = wb.addWorksheet('Rekap Kelas', { views: [{ state: 'frozen', ySplit: 10 }] });
  ws.columns = [{ width: 5 }, { width: 32 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 13 }, { width: 20 }, { width: 44 }];
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'Rekap Kelas – Presentasi PKL (RPL Kelas XII)';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: navy } };
  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `${sekolah ? sekolah + ' – ' : ''}${judulKelas} – diekspor ${new Date().toLocaleString('id-ID')}`;
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF6B7390' } };

  const n = rows.length;
  const last = 10 + Math.max(n, 1);
  const stats = [
    ['Jumlah murid dinilai', { formula: `COUNT(F11:F${last})` }],
    ['Rata-rata nilai akhir', { formula: `IF(C4=0,"",ROUND(AVERAGE(F11:F${last}),2))` }],
    ['Nilai tertinggi', { formula: `IF(C4=0,"",MAX(F11:F${last}))` }],
    ['Nilai terendah', { formula: `IF(C4=0,"",MIN(F11:F${last}))` }],
  ];
  stats.forEach(([k, v], i) => {
    ws.getCell(`A${4 + i}`).value = k; ws.mergeCells(`A${4 + i}:B${4 + i}`);
    ws.getCell(`C${4 + i}`).value = v; ws.getCell(`C${4 + i}`).font = { bold: true };
  });
  ws.getCell('A9').value = 'Daftar nilai murid'; ws.getCell('A9').font = { bold: true, color: { argb: navy } };
  const head = ['No', 'Nama murid', 'Kelas', 'Nilai A (maks 70)', 'Nilai B (maks 30)', 'Nilai akhir', 'Predikat', 'Catatan'];
  ws.getRow(10).values = head;
  ws.getRow(10).eachCell((c) => { c.font = { bold: true }; c.fill = headFill; c.border = border; c.alignment = { vertical: 'middle', wrapText: true }; });
  rows.forEach((r, i) => {
    const row = ws.getRow(11 + i);
    row.values = [i + 1, r.nama, r.kelas, r.nilai_a ?? null, r.nilai_b ?? null,
      r.total != null ? { formula: `D${11 + i}+E${11 + i}`, result: Number(r.total) } : null,
      r.predikat || '', r.catatan_rekap || ''];
    row.eachCell({ includeEmpty: true }, (c, col) => { if (col <= 8) { c.border = border; c.alignment = { vertical: 'top', wrapText: col === 8 }; } });
    ['D', 'E', 'F'].forEach((col) => { ws.getCell(`${col}${11 + i}`).numFmt = '0.##'; });
  });

  // ---- Sheet 2: Detail Nilai
  const wd = wb.addWorksheet('Detail Nilai', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] });
  const cols = [
    ['No', 5], ['Nama murid', 28], ['Kelas', 12], ['NIS', 12], ['Tempat PKL (DUDI)', 26], ['Judul project', 36], ['Tanggal presentasi', 16], ['Percobaan', 10],
    ['Kompleksitas', 13], ['Porsi', 10], ['Keselarasan bukti', 20], ['Jumlah penguji', 10],
    ...INDIKATOR_A.map((i, k) => [`A${k + 1} (${i.bobot})`, 9]), ['Nilai A', 10],
    ['B1 (15)', 9], ['B2 (10)', 9], ['B3 (5)', 9], ['Nilai B', 10], ['Nilai akhir', 11], ['Predikat', 18], ['Remidi', 9], ['Info remidi', 30],
    ['Evaluasi & feedback', 40], ['Saran', 30], ['Kritik', 30], ['Catatan', 30],
  ];
  wd.columns = cols.map(([header, width]) => ({ header, width }));
  wd.getRow(1).eachCell((c) => { c.font = { bold: true }; c.fill = headFill; c.border = border; c.alignment = { wrapText: true, vertical: 'middle' }; });
  wd.getRow(1).height = 32;
  rows.forEach((r, i) => {
    const row = wd.addRow([
      i + 1, r.nama, r.kelas, r.nis, r.dudi, r.judul, r.tanggal || '', r.percobaan || '',
      r.kompleksitas || '', r.porsi || '', r.keselarasan || '', r.jumlah_penguji ?? '',
      ...INDIKATOR_A.map((ind) => (r.rataA?.[ind.key] ?? null)), r.nilai_a ?? null,
      r.b1 ?? null, r.b2 ?? null, r.b3 ?? null, r.nilai_b ?? null, r.total ?? null, r.predikat || '',
      r.remidi ? 'Ya' : r.total != null ? 'Tidak' : '', r.info_remidi || '',
      r.evaluasi || '', r.saran || '', r.kritik || '', r.catatan || '',
    ]);
    row.eachCell({ includeEmpty: true }, (c) => { c.border = border; c.alignment = { vertical: 'top', wrapText: true }; });
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Rekap_Presentasi_PKL_${judulKelas.replace(/\W+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
