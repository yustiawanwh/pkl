// Berkas murid: draft laporan, file presentasi, dan lembar bimbingan
import { sb } from '../lib/supa.js';
import { $, $$, esc, icon, toast, modal, fmtTanggal, fmtWaktu, badge, emptyState } from '../lib/ui.js';
import { fileUrl, ukuran } from '../lib/files.js';
import { daftarBerkas } from './murid.js';

const JENIS = [
  ['file_laporan', 'Draft laporan', 'file'],
  ['file_ppt', 'File presentasi', 'slides'],
  ['file_bimbingan', 'Lembar bimbingan', 'book'],
];
const SEL_P = 'id, murid_id, status, percobaan, tanggal, jam_mulai, created_at, file_laporan, file_ppt, file_bimbingan';
const ext = (f) => (f?.name?.match(/\.([a-z0-9]+)$/i)?.[1] || 'file').toUpperCase();
const adaBerkas = (p) => JENIS.some(([k]) => p?.[k]?.path);

// Pengajuan yang berkasnya paling relevan: terbaru selain yang dibatalkan
const pilihTerbaru = (list) => list.find((p) => p.status !== 'dibatalkan' && adaBerkas(p)) || list.find(adaBerkas) || null;

// ---------------------------------------------------------------------
// Jendela berkas satu murid (dipakai juga di halaman Murid)
// ---------------------------------------------------------------------
export async function bukaBerkasMurid(m) {
  const { data, error } = await sb.from('pengajuan').select(SEL_P).eq('murid_id', m.id).order('created_at', { ascending: false });
  if (error) return toast(error.message, 'err');
  const list = (data || []).filter(adaBerkas);
  modal({
    title: `Berkas ${m.nama}`,
    wide: true,
    body: list.length ? `<div class="stack-lg">${list.map((p, i) => `
      <section class="stack-sm">
        <div class="row between">
          <div><b>${i === 0 ? 'Berkas terbaru' : `Percobaan ke-${p.percobaan}`}</b>
            <p class="small muted">Diajukan ${esc(fmtWaktu(p.created_at))}${p.tanggal ? `, jadwal ${esc(fmtTanggal(p.tanggal, false))}` : ''}</p></div>
          <div class="row">${badge(p.status)}<a class="btn sm ghost" href="#/guru/pengajuan/${p.id}" data-close>Detail</a></div>
        </div>
        ${daftarBerkas(p)}
      </section>`).join('<hr class="sep" />')}</div>`
      : emptyState('file', 'Belum ada berkas', 'Murid ini belum pernah mengunggah berkas pengajuan.'),
    footer: '<button class="btn ghost" data-close>Tutup</button>',
  });
}

// ---------------------------------------------------------------------
// Halaman Berkas murid
// ---------------------------------------------------------------------
export async function halamanBerkas(view) {
  const [{ data: murid, error: e1 }, { data: aj, error: e2 }] = await Promise.all([
    sb.from('profiles').select('id, nama, nis, kelas, dudi, judul').eq('role', 'murid').order('kelas').order('nama'),
    sb.from('pengajuan').select(SEL_P).order('created_at', { ascending: false }),
  ]);
  if (e1 || e2) throw e1 || e2;
  const per = {};
  (aj || []).forEach((p) => (per[p.murid_id] ||= []).push(p));
  const kelas = [...new Set((murid || []).map((r) => r.kelas).filter(Boolean))].sort();
  const f = { kelas: '', jenis: '', q: '', semua: false, hanyaAda: false };

  view.innerHTML = `
    <div class="page-head"><div><h1>Berkas murid</h1><p>Unduh draft laporan, file presentasi, dan lembar bimbingan yang diunggah murid saat mengajukan presentasi.</p></div>
      <button class="btn ghost" data-copy>${icon('list')} Salin daftar tautan</button></div>
    <div class="filters">
      <div class="seg" role="tablist" aria-label="Jenis berkas">
        <button data-jenis="" class="on">Semua jenis</button>
        ${JENIS.map(([k, l]) => `<button data-jenis="${k}">${l}</button>`).join('')}
      </div>
      <span class="spacer"></span>
      <select class="select" data-kelas aria-label="Filter kelas"><option value="">Semua kelas</option>${kelas.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      <input class="input" type="search" placeholder="Cari nama atau NIS" data-q aria-label="Cari murid" />
    </div>
    <div class="row small" style="margin:-4px 0 16px;gap:18px">
      <label class="row" style="gap:6px"><input type="checkbox" data-semua /> Tampilkan semua percobaan</label>
      <label class="row" style="gap:6px"><input type="checkbox" data-ada /> Hanya yang sudah mengunggah</label>
    </div>
    <p class="small muted" data-sum></p>
    <div data-list class="mt"></div>`;

  // Satu baris = satu pengajuan (terbaru per murid, atau semua percobaan)
  const baris = () => {
    const q = f.q.toLowerCase();
    const out = [];
    (murid || []).filter((m) => (!f.kelas || m.kelas === f.kelas) && (!q || `${m.nama} ${m.nis}`.toLowerCase().includes(q))).forEach((m) => {
      const list = per[m.id] || [];
      if (f.semua) {
        const ada = list.filter(adaBerkas);
        if (ada.length) ada.forEach((p) => out.push({ m, p }));
        else if (!f.hanyaAda) out.push({ m, p: null });
      } else {
        const p = pilihTerbaru(list);
        if (p || !f.hanyaAda) out.push({ m, p });
      }
    });
    return out;
  };

  const chip = (file, label, ic) => (file?.path
    ? `<a class="file-chip" href="${esc(fileUrl(file))}" target="_blank" rel="noopener" title="${esc(file.name)}">
        ${icon(ic)}<span><b>${esc(ext(file))}</b> ${ukuran(file.size || 0)}</span>${icon('download')}<span class="sr">Unduh ${esc(label)}</span></a>`
    : '<span class="muted small">Belum ada</span>');

  const draw = () => {
    const rs = baris();
    const kol = f.jenis ? JENIS.filter(([k]) => k === f.jenis) : JENIS;
    const totalMurid = new Set(rs.map((r) => r.m.id)).size;
    const sudah = new Set(rs.filter((r) => (f.jenis ? r.p?.[f.jenis]?.path : adaBerkas(r.p))).map((r) => r.m.id)).size;
    $('[data-sum]', view).textContent = `${sudah} dari ${totalMurid} murid sudah mengunggah ${f.jenis ? JENIS.find(([k]) => k === f.jenis)[1].toLowerCase() : 'berkas'}.`;
    $('[data-list]', view).innerHTML = rs.length ? `<div class="table-wrap"><table class="t">
      <thead><tr><th>Murid</th><th>Pengajuan</th>${kol.map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr></thead><tbody>
      ${rs.map(({ m, p }) => `<tr>
        <td><div class="who"><b>${esc(m.nama)}</b><span>${esc(m.kelas || '-')}, NIS ${esc(m.nis || '-')}</span></div></td>
        <td>${p ? `${badge(p.status)}<div class="small muted mt-xs">${p.percobaan > 1 ? `Percobaan ke-${p.percobaan}, ` : ''}${esc(fmtWaktu(p.created_at))}</div>` : '<span class="muted small">Belum mengajukan</span>'}</td>
        ${kol.map(([k, l, ic]) => `<td>${p ? chip(p[k], l, ic) : '<span class="muted small">-</span>'}</td>`).join('')}
        <td class="num">${p ? `<button class="btn sm ghost" data-murid="${m.id}">${icon('layers')} Semua</button>` : ''}</td>
      </tr>`).join('')}</tbody></table></div>`
      : `<div class="card">${emptyState('file', 'Tidak ada data', 'Ubah filter kelas, jenis berkas, atau kata kunci.')}</div>`;
    $$('[data-murid]', view).forEach((b) => b.addEventListener('click', () => bukaBerkasMurid((murid || []).find((x) => x.id === b.dataset.murid))));
  };

  $$('[data-jenis]', view).forEach((b) => b.addEventListener('click', () => {
    f.jenis = b.dataset.jenis; $$('[data-jenis]', view).forEach((x) => x.classList.toggle('on', x === b)); draw();
  }));
  $('[data-kelas]', view).addEventListener('change', (e) => { f.kelas = e.target.value; draw(); });
  $('[data-q]', view).addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  $('[data-semua]', view).addEventListener('change', (e) => { f.semua = e.target.checked; draw(); });
  $('[data-ada]', view).addEventListener('change', (e) => { f.hanyaAda = e.target.checked; draw(); });

  // Salin daftar tautan (bisa ditempel ke catatan atau pengelola unduhan)
  $('[data-copy]', view).addEventListener('click', async () => {
    const kol = f.jenis ? JENIS.filter(([k]) => k === f.jenis) : JENIS;
    const lines = [];
    baris().forEach(({ m, p }) => kol.forEach(([k, l]) => { if (p?.[k]?.path) lines.push(`${m.nama} (${m.kelas || '-'}) - ${l}: ${fileUrl(p[k])}`); }));
    if (!lines.length) return toast('Tidak ada berkas pada filter ini.', 'err');
    try { await navigator.clipboard.writeText(lines.join('\n')); toast(`${lines.length} tautan disalin.`); }
    catch { toast('Browser tidak mengizinkan menyalin otomatis.', 'err'); }
  });
  draw();
}
