// Riwayat & progres presentasi PKL + laporan cetak (PDF lewat dialog cetak browser)
import { sb, state, profilLengkap } from '../lib/supa.js';
import { $, $$, esc, icon, modal, fmtTanggal, fmtJam, fmtWaktu, today, badge, emptyState, initials, STATUS } from '../lib/ui.js';
import { INDIKATOR_A, fmtNilai } from '../lib/rubrik.js';
import { NAMA_SEKOLAH } from '../config.js';

// Tahapan progres, berurutan dari awal sampai akhir
export const TAHAP = [
  ['data', 'Belum melengkapi data', 'var(--ink-3)'],
  ['belum', 'Belum mengajukan', '#AAB2C8'],
  ['ulang', 'Ditolak, perlu ajukan ulang', '#E8899A'],
  ['menunggu', 'Menunggu verifikasi', 'var(--marigold)'],
  ['terjadwal', 'Terjadwal', 'var(--primary)'],
  ['belumdinilai', 'Sudah presentasi, menunggu nilai', '#7C93F0'],
  ['remidi', 'Remidi', 'var(--rose)'],
  ['selesai', 'Selesai', 'var(--mint)'],
];
const TAHAP_MAP = Object.fromEntries(TAHAP.map(([k, l, c]) => [k, { label: l, color: c }]));

function tahapMurid(m, list) {
  const p = list[0];
  if (!profilLengkap(m)) return 'data';
  if (!p || p.status === 'dibatalkan') return list.some((x) => ['selesai', 'remidi'].includes(x.status)) ? 'remidi' : 'belum';
  if (p.status === 'menunggu') return 'menunggu';
  if (p.status === 'disetujui') return p.tanggal >= today() ? 'terjadwal' : 'belumdinilai';
  if (p.status === 'ditolak') return 'ulang';
  return p.status; // remidi | selesai
}

const tglPendek = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const tahapBadge = (k) => `<span class="badge plain tahap" style="--c:${TAHAP_MAP[k].color}"><i></i>${esc(TAHAP_MAP[k].label)}</span>`;

async function muatData() {
  const [m, p, g] = await Promise.all([
    sb.from('profiles').select('*').eq('role', 'murid').order('kelas').order('nama'),
    sb.from('pengajuan').select('*, hasil(*), penilaian(*)').order('created_at', { ascending: false }),
    sb.from('profiles').select('id, nama').neq('role', 'murid'),
  ]);
  if (m.error || p.error) throw m.error || p.error;
  const guru = Object.fromEntries((g.data || []).map((x) => [x.id, x.nama]));
  const per = {};
  (p.data || []).forEach((r) => (per[r.murid_id] ||= []).push(r));
  const rows = (m.data || []).map((mu) => {
    const list = per[mu.id] || [];
    const nilai = list.find((x) => x.hasil?.dipublikasi);
    return {
      ...mu, list, tahap: tahapMurid(mu, list),
      percobaan: list.filter((x) => ['selesai', 'remidi'].includes(x.status)).length,
      terakhir: list[0] || null, nilai: nilai || null,
    };
  });
  return { rows, guru };
}

// =====================================================================
// Halaman
// =====================================================================
export async function riwayat(view) {
  const { rows, guru } = await muatData();
  const kelas = [...new Set(rows.map((r) => r.kelas).filter(Boolean))].sort();
  const f = { kelas: '', tahap: '', q: '' };

  view.innerHTML = `
    <div class="page-head"><div><h1>Riwayat & progres</h1>
      <p>Pantau tahapan presentasi PKL setiap murid, lihat semua percobaannya, dan cetak laporan progres sebagai PDF.</p></div>
      <button class="btn primary" data-print-all>${icon('download')} Cetak laporan</button></div>
    <div class="filters">
      <select class="select" data-kelas aria-label="Filter kelas"><option value="">Semua kelas</option>${kelas.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      <input class="input" type="search" placeholder="Cari nama atau NIS" data-q aria-label="Cari murid" />
    </div>
    <section class="card stack" data-overview></section>
    <div data-list class="mt-lg"></div>`;

  const filtered = (ignoreTahap = false) => {
    const q = f.q.toLowerCase();
    return rows.filter((r) => (!f.kelas || r.kelas === f.kelas) && (ignoreTahap || !f.tahap || r.tahap === f.tahap)
      && (!q || `${r.nama} ${r.nis}`.toLowerCase().includes(q)));
  };

  const draw = () => {
    const base = filtered(true);
    const n = base.length;
    const count = Object.fromEntries(TAHAP.map(([k]) => [k, base.filter((r) => r.tahap === k).length]));
    const dinilai = base.filter((r) => r.nilai);
    const avg = dinilai.length ? dinilai.reduce((s, r) => s + Number(r.nilai.hasil.total), 0) / dinilai.length : null;
    const pct = n ? Math.round((count.selesai / n) * 100) : 0;

    $('[data-overview]', view).innerHTML = `
      <div class="overview-top">
        <div><span class="label">Progres ${esc(f.kelas || 'semua kelas')}</span>
          <div class="big-num">${pct}<span>%</span></div>
          <p class="small muted">${count.selesai} dari ${n} murid sudah selesai presentasi</p></div>
        <dl class="mini-stats">
          <div><dt>Rata-rata nilai</dt><dd>${fmtNilai(avg == null ? null : Math.round(avg * 100) / 100)}</dd></div>
          <div><dt>Sudah dinilai</dt><dd>${dinilai.length}</dd></div>
          <div><dt>Remidi</dt><dd>${count.remidi}</dd></div>
          <div><dt>Total percobaan</dt><dd>${base.reduce((s, r) => s + r.percobaan, 0)}</dd></div>
        </dl>
      </div>
      <div class="progress-stack" role="img" aria-label="Sebaran tahapan murid">
        ${TAHAP.map(([k, , c]) => (count[k] ? `<i style="flex:${count[k]};background:${c}" title="${esc(TAHAP_MAP[k].label)}: ${count[k]}"></i>` : '')).join('') || '<i style="flex:1;background:var(--surface-2)"></i>'}
      </div>
      <div class="tahap-legend">${TAHAP.map(([k, l, c]) => `
        <button type="button" class="tahap-chip ${f.tahap === k ? 'on' : ''}" data-tahap="${k}" style="--c:${c}">
          <i></i><span>${esc(l)}</span><b>${count[k]}</b></button>`).join('')}
        ${f.tahap ? '<button type="button" class="btn sm ghost" data-tahap="">Tampilkan semua</button>' : ''}
      </div>`;
    $$('[data-tahap]', view).forEach((b) => b.addEventListener('click', () => { f.tahap = f.tahap === b.dataset.tahap ? '' : b.dataset.tahap; draw(); }));

    const rs = filtered();
    $('[data-list]', view).innerHTML = rs.length ? `<div class="table-wrap"><table class="t">
      <thead><tr><th>Murid</th><th>DUDI dan judul</th><th>Presentasi terakhir</th><th class="num">Percobaan</th><th>Tahap</th><th class="num">Nilai</th></tr></thead><tbody>
      ${rs.map((r) => `<tr class="click" data-id="${r.id}" tabindex="0">
        <td><div class="who"><b>${esc(r.nama)}</b><span>${esc(r.kelas || '-')}, NIS ${esc(r.nis || '-')}</span></div></td>
        <td><div class="who"><b class="fw-500">${esc(r.judul || '-')}</b><span>${esc(r.dudi || '-')}</span></div></td>
        <td class="nowrap">${r.terakhir?.tanggal ? `${esc(tglPendek(r.terakhir.tanggal))}<div class="small muted">${fmtJam(r.terakhir.jam_mulai)} WIB</div>` : '<span class="muted">-</span>'}</td>
        <td class="num">${r.percobaan || '-'}</td>
        <td>${tahapBadge(r.tahap)}</td>
        <td class="num nowrap">${r.nilai ? `<b>${fmtNilai(r.nilai.hasil.total)}</b><div class="small muted">${esc(r.nilai.hasil.predikat)}</div>` : '<span class="muted">-</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`
      : `<div class="card">${emptyState('users', 'Tidak ada murid', 'Ubah filter kelas, tahap, atau kata kunci.')}</div>`;
    $$('[data-id]', view).forEach((tr) => {
      const open = () => detailMurid(rows.find((r) => r.id === tr.dataset.id), guru);
      tr.addEventListener('click', open);
      tr.addEventListener('keydown', (e) => e.key === 'Enter' && open());
    });
  };

  $('[data-kelas]', view).addEventListener('change', (e) => { f.kelas = e.target.value; draw(); });
  $('[data-q]', view).addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  $('[data-print-all]', view).addEventListener('click', () => cetakKelas(filtered(), f));
  draw();
}

// =====================================================================
// Detail riwayat satu murid
// =====================================================================
function detailMurid(r, guru) {
  const items = r.list.length ? r.list.map((p) => {
    const h = p.hasil?.dipublikasi ? p.hasil : null;
    return `<li class="hist-item">
      <div class="hist-dot ${esc(p.status)}"></div>
      <div class="stack-sm">
        <div class="row between"><b>Percobaan ke-${p.percobaan}</b>${badge(p.status)}</div>
        <div class="slot-meta">
          <span>${icon('calendar')}${p.tanggal ? esc(fmtTanggal(p.tanggal, false)) : '-'}</span>
          <span>${icon('clock')}${fmtJam(p.jam_mulai)}–${fmtJam(p.jam_selesai)}</span>
          ${p.ruang ? `<span>${icon('pin')}${esc(p.ruang)}</span>` : ''}
        </div>
        <p class="small muted">Diajukan ${esc(fmtWaktu(p.created_at))}${p.diverifikasi_at ? `, diverifikasi ${esc(guru[p.diverifikasi_oleh] || 'guru')} ${esc(fmtWaktu(p.diverifikasi_at))}` : ''}</p>
        ${p.feedback ? `<p class="small"><b>Feedback:</b> ${esc(p.feedback)}</p>` : ''}
        ${h ? `<div class="hist-score"><b>${fmtNilai(h.total)}</b><span>${esc(h.predikat)}</span><span class="muted">A ${fmtNilai(h.nilai_a)} + B ${fmtNilai(h.nilai_b)}</span></div>
          ${h.remidi && h.info_remidi ? `<p class="small"><b>Info remidi:</b> ${esc(h.info_remidi)}</p>` : ''}` : ''}
      </div></li>`;
  }).join('') : '';

  const md = modal({
    title: `Riwayat ${r.nama}`,
    wide: true,
    body: `<div class="stack">
      <div class="row"><span class="avatar">${esc(initials(r.nama))}</span>
        <div class="who"><b>${esc(r.nama)}</b><span>${esc(r.kelas || '-')}, NIS ${esc(r.nis || '-')}</span></div>
        <span class="spacer"></span>${tahapBadge(r.tahap)}</div>
      <dl class="kv">
        <dt>Tempat PKL</dt><dd>${esc(r.dudi || '-')}</dd>
        <dt>Judul project</dt><dd>${esc(r.judul || '-')}</dd>
        <dt>Profil diklaim</dt><dd>${esc(r.kompleksitas || '-')} / ${esc(r.porsi || '-')}</dd>
      </dl>
      ${items ? `<ol class="hist">${items}</ol>` : emptyState('send', 'Belum ada pengajuan', 'Murid ini belum pernah mengajukan jadwal presentasi.')}
    </div>`,
    footer: `<button class="btn ghost" data-close>Tutup</button><button class="btn primary" data-print-one>${icon('download')} Cetak riwayat</button>`,
  });
  $('[data-print-one]', md.el).addEventListener('click', () => cetakMurid(r, guru));
}

// =====================================================================
// Laporan cetak (dialog cetak browser → "Simpan sebagai PDF")
// =====================================================================
function cetak(html, { judulFile, orientasi = 'portrait' }) {
  document.getElementById('print-root')?.remove();
  document.getElementById('print-page')?.remove();
  const root = document.createElement('div');
  root.id = 'print-root';
  root.innerHTML = html;
  const st = document.createElement('style');
  st.id = 'print-page';
  st.textContent = `@page { size: A4 ${orientasi}; margin: 14mm 12mm 16mm; }`;
  document.head.append(st);
  document.body.append(root);
  const judulLama = document.title;
  document.title = judulFile; // nama file PDF bawaan
  const selesai = () => { document.title = judulLama; root.remove(); st.remove(); window.removeEventListener('afterprint', selesai); };
  window.addEventListener('afterprint', selesai);
  setTimeout(() => window.print(), 50);
}

const kop = (judul, sub) => `
  <header class="rp-kop">
    <div class="rp-logo">PKL</div>
    <div><div class="rp-school">${esc(NAMA_SEKOLAH)}</div>
      <div class="rp-prog">Program Keahlian Rekayasa Perangkat Lunak</div></div>
  </header>
  <h1 class="rp-title">${esc(judul)}</h1>
  <p class="rp-sub">${sub}</p>`;

const ttd = () => `
  <section class="rp-ttd">
    <div><p>Mengetahui,<br>Kepala Program Keahlian</p><div class="rp-sign"></div><p class="rp-line">NIP.</p></div>
    <div><p>${esc(NAMA_SEKOLAH.replace(/^SMK\s*/i, '').split(' ').slice(-1)[0] || '')}, ${esc(fmtTanggal(today(), false))}<br>Guru Pembimbing / Penguji</p>
      <div class="rp-sign"></div><p class="rp-line">${esc(state.profile.nama)}</p></div>
  </section>`;

const tglFile = () => today();

function cetakKelas(rs, f) {
  const n = rs.length;
  const count = Object.fromEntries(TAHAP.map(([k]) => [k, rs.filter((r) => r.tahap === k).length]));
  const dinilai = rs.filter((r) => r.nilai);
  const tot = dinilai.map((r) => Number(r.nilai.hasil.total));
  const avg = tot.length ? Math.round((tot.reduce((a, b) => a + b, 0) / tot.length) * 100) / 100 : null;
  const pred = ['A', 'B', 'C', 'D'].map((k) => dinilai.filter((r) => r.nilai.hasil.predikat?.startsWith(k)).length);
  const filterKet = [f.kelas || 'Semua kelas', f.tahap ? `tahap "${TAHAP_MAP[f.tahap].label}"` : ''].filter(Boolean).join(', ');

  const html = `<div class="rp">
    ${kop('Laporan Progres Presentasi Laporan PKL', `${esc(filterKet)} &nbsp;|&nbsp; Dicetak ${esc(fmtWaktu(new Date()))} oleh ${esc(state.profile.nama)}`)}
    <section class="rp-summary">
      <div><span>Jumlah murid</span><b>${n}</b></div>
      <div><span>Selesai</span><b>${count.selesai}</b><small>${n ? Math.round((count.selesai / n) * 100) : 0}%</small></div>
      <div><span>Remidi</span><b>${count.remidi}</b></div>
      <div><span>Belum presentasi</span><b>${count.data + count.belum + count.ulang + count.menunggu + count.terjadwal}</b></div>
      <div><span>Rata-rata nilai</span><b>${fmtNilai(avg)}</b></div>
      <div><span>Tertinggi / terendah</span><b>${tot.length ? `${fmtNilai(Math.max(...tot))} / ${fmtNilai(Math.min(...tot))}` : '-'}</b></div>
    </section>
    <section class="rp-two">
      <table class="rp-table rp-compact"><thead><tr><th>Tahapan</th><th class="n">Murid</th></tr></thead><tbody>
        ${TAHAP.map(([k, l]) => `<tr><td>${esc(l)}</td><td class="n">${count[k]}</td></tr>`).join('')}</tbody></table>
      <table class="rp-table rp-compact"><thead><tr><th>Predikat</th><th class="n">Murid</th></tr></thead><tbody>
        ${['A (90–100) Sangat baik', 'B (80–89) Baik', 'C (70–79) Cukup', 'D (&lt;70) Perlu perbaikan'].map((l, i) => `<tr><td>${l}</td><td class="n">${pred[i]}</td></tr>`).join('')}</tbody></table>
    </section>
    <table class="rp-table">
      <thead><tr><th class="n">No</th><th>Nama murid</th><th>NIS</th><th class="nw">Kelas</th><th>Tempat PKL</th><th>Judul project</th>
        <th>Presentasi terakhir</th><th class="n">Perc.</th><th>Tahap</th><th class="n">A</th><th class="n">B</th><th class="n">Nilai</th><th>Predikat</th></tr></thead>
      <tbody>${rs.map((r, i) => {
        const h = r.nilai?.hasil;
        return `<tr><td class="n">${i + 1}</td><td>${esc(r.nama)}</td><td class="nw">${esc(r.nis || '')}</td><td class="nw">${esc(r.kelas || '')}</td>
          <td>${esc(r.dudi || '-')}</td><td>${esc(r.judul || '-')}</td>
          <td>${r.terakhir?.tanggal ? `${esc(fmtTanggal(r.terakhir.tanggal, false))}, ${fmtJam(r.terakhir.jam_mulai)}` : '-'}</td>
          <td class="n">${r.percobaan || '-'}</td><td>${esc(TAHAP_MAP[r.tahap].label)}</td>
          <td class="n">${h ? fmtNilai(h.nilai_a) : '-'}</td><td class="n">${h ? fmtNilai(h.nilai_b) : '-'}</td>
          <td class="n"><b>${h ? fmtNilai(h.total) : '-'}</b></td><td>${h ? esc(h.predikat) : '-'}</td></tr>`;
      }).join('') || '<tr><td colspan="13">Tidak ada data.</td></tr>'}</tbody>
    </table>
    <p class="rp-note">Nilai akhir = Komponen A (kualitas presentasi dan pemahaman, maks. 70) + Komponen B (tingkat tantangan pekerjaan, maks. 30). Nilai yang ditampilkan adalah hasil terbaru yang sudah dipublikasikan.</p>
    ${ttd()}
  </div>`;
  cetak(html, { judulFile: `Laporan_Progres_PKL_${(f.kelas || 'Semua_kelas').replace(/\W+/g, '_')}_${tglFile()}`, orientasi: 'landscape' });
}

function cetakMurid(r, guru) {
  const pen = (p) => p.penilaian || [];
  const avgA = (p, k) => (pen(p).length ? pen(p).reduce((s, x) => s + (Number(x[k]) || 0), 0) / pen(p).length : null);
  const terakhirDinilai = r.nilai;
  const h = terakhirDinilai?.hasil;

  const html = `<div class="rp">
    ${kop('Laporan Riwayat Presentasi Laporan PKL', `Dicetak ${esc(fmtWaktu(new Date()))} oleh ${esc(state.profile.nama)}`)}
    <table class="rp-id">
      <tr><td>Nama murid</td><td>${esc(r.nama)}</td><td>Tempat PKL</td><td>${esc(r.dudi || '-')}</td></tr>
      <tr><td>NIS</td><td>${esc(r.nis || '-')}</td><td>Judul project</td><td>${esc(r.judul || '-')}</td></tr>
      <tr><td>Kelas</td><td>${esc(r.kelas || '-')}</td><td>Profil diklaim</td><td>Kompleksitas ${esc(r.kompleksitas || '-')}, porsi ${esc(r.porsi || '-')}</td></tr>
      <tr><td>Tahap saat ini</td><td colspan="3"><b>${esc(TAHAP_MAP[r.tahap].label)}</b></td></tr>
    </table>

    <h2 class="rp-h2">Riwayat pengajuan dan presentasi</h2>
    <table class="rp-table">
      <thead><tr><th class="n">No</th><th>Diajukan</th><th>Jadwal presentasi</th><th>Status</th><th>Diverifikasi oleh</th><th>Feedback verifikasi</th><th class="n">Nilai</th><th>Predikat</th></tr></thead>
      <tbody>${r.list.slice().reverse().map((p, i) => {
        const hh = p.hasil?.dipublikasi ? p.hasil : null;
        return `<tr><td class="n">${i + 1}</td><td>${esc(fmtWaktu(p.created_at))}</td>
          <td>${p.tanggal ? `${esc(fmtTanggal(p.tanggal, false))}, ${fmtJam(p.jam_mulai)}–${fmtJam(p.jam_selesai)}${p.ruang ? `, ${esc(p.ruang)}` : ''}` : '-'}</td>
          <td>${esc(STATUS[p.status] || p.status)}</td><td>${esc(guru[p.diverifikasi_oleh] || '-')}</td><td>${esc(p.feedback || '-')}</td>
          <td class="n">${hh ? fmtNilai(hh.total) : '-'}</td><td>${hh ? esc(hh.predikat) : '-'}</td></tr>`;
      }).join('') || '<tr><td colspan="8">Belum ada pengajuan.</td></tr>'}</tbody>
    </table>

    ${h ? `
    <h2 class="rp-h2">Rincian nilai terakhir (${esc(fmtTanggal(terakhirDinilai.tanggal, false))})</h2>
    <section class="rp-two">
      <table class="rp-table rp-compact"><thead><tr><th>Komponen A: kualitas presentasi</th><th class="n">Nilai</th><th class="n">Maks</th></tr></thead><tbody>
        ${INDIKATOR_A.map((i) => `<tr><td>${esc(i.judul)}</td><td class="n">${fmtNilai(avgA(terakhirDinilai, i.key))}</td><td class="n">${i.bobot}</td></tr>`).join('')}
        <tr class="rp-sum"><td>Jumlah Komponen A${pen(terakhirDinilai).length > 1 ? ` (rata-rata ${pen(terakhirDinilai).length} penguji)` : ''}</td><td class="n">${fmtNilai(h.nilai_a)}</td><td class="n">70</td></tr></tbody></table>
      <div>
        <table class="rp-table rp-compact"><thead><tr><th>Komponen B: tantangan pekerjaan</th><th class="n">Nilai</th><th class="n">Maks</th></tr></thead><tbody>
          <tr><td>Kompleksitas (${esc(h.kompleksitas)})</td><td class="n">${fmtNilai(h.b1)}</td><td class="n">15</td></tr>
          <tr><td>Porsi kontribusi (${esc(h.porsi)})</td><td class="n">${fmtNilai(h.b2)}</td><td class="n">10</td></tr>
          <tr><td>Keselarasan bukti (${esc(h.keselarasan)})</td><td class="n">${fmtNilai(h.b3)}</td><td class="n">5</td></tr>
          <tr class="rp-sum"><td>Jumlah Komponen B</td><td class="n">${fmtNilai(h.nilai_b)}</td><td class="n">30</td></tr></tbody></table>
        <div class="rp-final"><span>Nilai akhir</span><b>${fmtNilai(h.total)}</b><span>${esc(h.predikat)}${h.remidi ? ' (remidi)' : ''}</span></div>
      </div>
    </section>
    <table class="rp-id rp-notes">
      ${[['Evaluasi dan feedback', h.evaluasi], ['Saran', h.saran], ['Kritik', h.kritik], ['Catatan', h.catatan], ['Informasi remidi', h.remidi ? h.info_remidi : null]]
        .filter(([, v]) => v).map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('') || '<tr><td colspan="2">Tidak ada catatan.</td></tr>'}
    </table>` : '<p class="rp-note">Belum ada hasil penilaian yang dipublikasikan.</p>'}
    ${ttd()}
  </div>`;
  cetak(html, { judulFile: `Riwayat_PKL_${String(r.nama).replace(/\W+/g, '_')}_${tglFile()}` });
}
