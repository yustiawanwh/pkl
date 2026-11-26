// Rekap presentasi PKL untuk umum: tanpa login, tanpa menu, hanya baca.
// Data diambil dari satu fungsi database (rekap_publik) yang hanya mengembalikan kolom aman:
// tidak ada id, NIS, tanggal lahir, tautan berkas, maupun catatan guru.
import { sb, getKKM, kkmCls } from '../lib/supa.js';
import { $, $$, esc, icon, today, labelTables, errMsg } from '../lib/ui.js';
import { fmtNilai } from '../lib/rubrik.js';
import { NAMA_SEKOLAH } from '../config.js';
import { TAHAP } from './riwayat.js';

const TAHAP_MAP = Object.fromEntries(TAHAP.map(([k, l, c]) => [k, { label: l, color: c }]));
const URUTAN_TAHAP = Object.fromEntries(TAHAP.map(([k], i) => [k, i]));

function tahap(r) {
  if (!r.lengkap) return 'data';
  switch (r.status) {
    case 'menunggu': return 'menunggu';
    case 'disetujui': return r.tgl_presentasi && r.tgl_presentasi >= today() ? 'terjadwal' : 'belumdinilai';
    case 'ditolak': return 'ulang';
    case 'selesai': case 'remidi': return r.status;
    default: return 'belum';
  }
}

// Kelompok untuk filter (sebagian sengaja saling beririsan, mis. "Sudah presentasi" mencakup Selesai dan Remidi)
const KELOMPOK = [
  ['semua', 'Semua', () => true],
  ['belumaju', 'Belum mengajukan', (r) => r.tahap === 'data' || r.tahap === 'belum'],
  ['mengajukan', 'Sudah mengajukan', (r) => Boolean(r.status)],
  ['menunggu', 'Menunggu verifikasi', (r) => r.tahap === 'menunggu'],
  ['ulang', 'Ditolak', (r) => r.tahap === 'ulang'],
  ['terjadwal', 'Terjadwal', (r) => r.tahap === 'terjadwal'],
  ['presentasi', 'Sudah presentasi', (r) => ['belumdinilai', 'remidi', 'selesai'].includes(r.tahap)],
  ['belumdinilai', 'Belum dinilai', (r) => r.tahap === 'belumdinilai'],
  ['dinilai', 'Sudah dinilai', (r) => r.nilai != null],
  ['selesai', 'Selesai', (r) => r.tahap === 'selesai'],
  ['remidi', 'Remidi', (r) => r.tahap === 'remidi'],
  ['bawahkkm', 'Di bawah KKM', (r) => r.nilai != null && Number(r.nilai) < getKKM()],
];
const KEL_MAP = Object.fromEntries(KELOMPOK.map(([k, l, f]) => [k, { label: l, fn: f }]));

const URUT = [
  ['nama', 'Nama murid', (r) => r.nama?.toLocaleLowerCase('id')],
  ['kelas', 'Kelas', (r) => (r.kelas ? `${r.kelas}\u0000${r.nama}` : null)],
  ['dudi', 'Nama DUDI', (r) => r.dudi?.toLocaleLowerCase('id') || null],
  ['tgl_presentasi', 'Tanggal presentasi', (r) => (r.status ? r.tgl_presentasi : null)],
  ['tgl_pengajuan', 'Tanggal pengajuan', (r) => r.tgl_pengajuan],
  ['tgl_daftar', 'Tanggal daftar', (r) => r.tgl_daftar],
  ['nilai', 'Nilai akhir', (r) => (r.nilai == null ? null : Number(r.nilai))],
  ['tahap', 'Tahap', (r) => URUTAN_TAHAP[r.tahap]],
];
const URUT_MAP = Object.fromEntries(URUT.map(([k, l, f]) => [k, { label: l, fn: f }]));

const tgl = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const huruf = (p) => (p ? String(p).trim().charAt(0) : '');

// Status filter/urutan disimpan di alamat (mis. #/rekap?kelompok=remidi&urut=nama) supaya bisa dibagikan.
// Semua nilai dari alamat divalidasi terhadap daftar yang diizinkan; tidak pernah ditulis sebagai HTML mentah.
function bacaAlamat() {
  const q = new URLSearchParams((location.hash.split('?')[1] || ''));
  return {
    kelompok: KEL_MAP[q.get('kelompok')] ? q.get('kelompok') : 'semua',
    urut: URUT_MAP[q.get('urut')] ? q.get('urut') : 'nama',
    arah: q.get('arah') === 'turun' ? 'turun' : 'naik',
    kelas: (q.get('kelas') || '').slice(0, 60),
    cari: (q.get('cari') || '').slice(0, 80),
  };
}
function tulisAlamat(f) {
  const q = new URLSearchParams();
  if (f.kelompok !== 'semua') q.set('kelompok', f.kelompok);
  if (f.urut !== 'nama') q.set('urut', f.urut);
  if (f.arah !== 'naik') q.set('arah', f.arah);
  if (f.kelas) q.set('kelas', f.kelas);
  if (f.cari) q.set('cari', f.cari);
  const s = q.toString();
  history.replaceState(null, '', `#/rekap${s ? `?${s}` : ''}`);
}

export async function rekapPublik(app) {
  document.title = `Rekap Presentasi PKL · ${NAMA_SEKOLAH}`;
  const dark = document.documentElement.dataset.theme === 'dark';
  app.innerHTML = `<div class="pub">
    <header class="pub-head">
      <div class="pub-brand"><div class="logo">${icon('slides')}</div>
        <div><h1>Rekap Presentasi PKL</h1><p>${esc(NAMA_SEKOLAH)}</p></div></div>
      <button class="btn icon ghost" data-theme-toggle aria-label="Ganti tema">${icon(dark ? 'sun' : 'moon')}</button>
    </header>
    <main class="pub-main" data-body aria-live="polite"><div class="boot" style="min-height:40vh"><span class="spinner"></span></div></main>
    <footer class="pub-foot">Halaman ini hanya untuk dilihat. Nilai yang tampil hanya nilai yang sudah diumumkan guru.</footer>
  </div>`;

  $('[data-theme-toggle]', app).addEventListener('click', (e) => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('pkl-theme', t); } catch {}
    e.currentTarget.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  });

  const body = $('[data-body]', app);
  let data;
  try {
    const res = await sb.rpc('rekap_publik');
    if (res.error) throw res.error;
    data = res.data;
  } catch (e) {
    body.innerHTML = `<div class="card"><div class="empty">${icon('alert')}<b>Rekap gagal dimuat</b><p>${esc(errMsg(e))}</p>
      <button class="btn primary" data-retry>Coba lagi</button></div></div>`;
    $('[data-retry]', body).addEventListener('click', () => rekapPublik(app));
    return;
  }
  if (!data || data.aktif === false) {
    body.innerHTML = `<div class="card"><div class="empty">${icon('info')}<b>Rekap belum dibuka</b><p>Halaman rekap presentasi sedang dinonaktifkan oleh guru.</p></div></div>`;
    return;
  }

  const rows = (data.murid || []).map((r) => ({ ...r, tahap: tahap(r) }));
  const kelasList = [...new Set(rows.map((r) => r.kelas).filter(Boolean))].sort();
  const f = bacaAlamat();
  if (f.kelas && !kelasList.includes(f.kelas)) f.kelas = '';
  const kkm = getKKM();
  const diambil = new Date(data.diambil || Date.now()).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  body.innerHTML = `
    <section class="card stack" data-overview></section>
    <section class="pub-tools">
      <div class="pub-groups" role="group" aria-label="Kelompok murid" data-groups></div>
      <div class="filters pub-filters">
        <select class="select" data-kelas aria-label="Filter kelas"><option value="">Semua kelas</option>${kelasList.map((k) => `<option ${k === f.kelas ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
        <input class="input" type="search" data-cari placeholder="Cari nama, DUDI, atau judul" aria-label="Cari" maxlength="80" />
        <div class="pub-sort">
          <label for="pub-urut" class="small muted">Urutkan</label>
          <select class="select" id="pub-urut" data-urut>${URUT.map(([k, l]) => `<option value="${k}" ${k === f.urut ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button class="btn ghost" data-arah type="button"></button>
        </div>
      </div>
    </section>
    <div class="row between pub-count"><span data-count></span><span class="small muted">Data per ${esc(diambil)} WIB</span></div>
    <div data-list></div>`;
  $('[data-cari]', body).value = f.cari;

  const dasar = () => rows.filter((r) => !f.kelas || r.kelas === f.kelas);
  const cocokCari = (r) => {
    if (!f.cari) return true;
    const q = f.cari.toLocaleLowerCase('id');
    return [r.nama, r.dudi, r.judul].some((v) => v && v.toLocaleLowerCase('id').includes(q));
  };

  const drawOverview = () => {
    const b = dasar();
    const n = b.length;
    const c = (k) => b.filter(KEL_MAP[k].fn).length;
    const count = Object.fromEntries(TAHAP.map(([k]) => [k, b.filter((r) => r.tahap === k).length]));
    const dinilai = b.filter((r) => r.nilai != null);
    const avg = dinilai.length ? dinilai.reduce((s, r) => s + Number(r.nilai), 0) / dinilai.length : null;
    const pres = c('presentasi');
    const pct = n ? Math.round((pres / n) * 100) : 0;
    $('[data-overview]', body).innerHTML = `
      <div class="overview-top">
        <div><span class="label">Progres ${esc(f.kelas || 'semua kelas')}</span>
          <div class="big-num">${pct}<span>%</span></div>
          <p class="small muted">${pres} dari ${n} murid sudah presentasi</p></div>
        <dl class="mini-stats pub-stats">
          <div><dt>Terdaftar</dt><dd>${n}</dd></div>
          <div><dt>Sudah mengajukan</dt><dd>${c('mengajukan')}</dd></div>
          <div><dt>Sudah dinilai</dt><dd>${dinilai.length}</dd></div>
          <div><dt>Rata-rata nilai</dt><dd class="${kkmCls(avg)}">${avg == null ? '-' : fmtNilai(Math.round(avg * 100) / 100)}</dd></div>
        </dl>
      </div>
      <div class="progress-stack" role="img" aria-label="Sebaran tahapan murid">
        ${TAHAP.map(([k, l, col]) => (count[k] ? `<i style="flex:${count[k]};background:${col}" title="${esc(l)}: ${count[k]}"></i>` : '')).join('') || '<i style="flex:1;background:var(--surface-2)"></i>'}
      </div>
      <div class="tahap-legend">${TAHAP.map(([k, l, col]) => `<span class="tahap-chip static" style="--c:${col}"><i></i>${esc(l)} <b>${count[k]}</b></span>`).join('')}</div>
      <p class="small muted">KKM ${fmtNilai(kkm)}. Nilai di bawah KKM ditandai merah.</p>`;

    $('[data-groups]', body).innerHTML = KELOMPOK.map(([k, l]) =>
      `<button type="button" data-k="${k}" class="${f.kelompok === k ? 'on' : ''}" aria-pressed="${f.kelompok === k}">${esc(l)} <span>${c(k)}</span></button>`).join('');
    $$('[data-k]', body).forEach((btn) => btn.addEventListener('click', () => { f.kelompok = btn.dataset.k; update(); }));
  };

  const drawList = () => {
    const sel = dasar().filter(KEL_MAP[f.kelompok].fn).filter(cocokCari);
    const key = URUT_MAP[f.urut].fn;
    const dir = f.arah === 'turun' ? -1 : 1;
    sel.sort((a, b) => {
      const x = key(a), y = key(b);
      if (x == null && y == null) return a.nama.localeCompare(b.nama, 'id');
      if (x == null) return 1; // data kosong selalu di bawah
      if (y == null) return -1;
      const r = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'id');
      return r ? r * dir : a.nama.localeCompare(b.nama, 'id');
    });
    const tgPakai = ['tgl_presentasi', 'tgl_pengajuan', 'tgl_daftar', 'nilai'].includes(f.urut);
    $('[data-arah]', body).innerHTML = `${icon(f.arah === 'naik' ? 'arrowup' : 'arrowdown')}${f.arah === 'naik' ? (tgPakai ? 'Terlama/terendah dulu' : 'A ke Z') : (tgPakai ? 'Terbaru/tertinggi dulu' : 'Z ke A')}`;
    $('[data-arah]', body).setAttribute('aria-label', `Arah urutan: ${f.arah}`);
    $('[data-count]', body).innerHTML = `<b>${sel.length}</b> murid${f.kelompok !== 'semua' ? ` <span class="muted">dalam “${esc(KEL_MAP[f.kelompok].label)}”</span>` : ''}`;

    if (!sel.length) {
      $('[data-list]', body).innerHTML = `<div class="card"><div class="empty">${icon('users')}<b>Tidak ada murid</b><p>Tidak ada murid yang cocok dengan pilihan ini. Coba pilih kelompok atau kelas lain.</p></div></div>`;
      return;
    }
    const tampilJadwal = (r) => r.status && ['disetujui', 'selesai', 'remidi'].includes(r.status) && r.tgl_presentasi;
    $('[data-list]', body).innerHTML = `<div class="table-wrap"><table class="t pub-table">
      <thead><tr><th>Murid</th><th>DUDI dan judul</th><th>Diajukan</th><th>Presentasi</th><th>Tahap</th><th class="num">Nilai</th></tr></thead>
      <tbody>${sel.map((r) => `<tr>
        <td><div><b>${esc(r.nama)}</b><div class="small muted">${esc(r.kelas || 'Kelas belum diisi')}</div></div></td>
        <td><div>${r.dudi ? esc(r.dudi) : '<span class="muted">Belum diisi</span>'}${r.judul ? `<div class="small muted clamp-2">${esc(r.judul)}</div>` : ''}</div></td>
        <td><div>${r.status && r.tgl_pengajuan ? esc(tgl(r.tgl_pengajuan)) : '<span class="muted">-</span>'}</div></td>
        <td><div>${tampilJadwal(r) ? `${esc(tgl(r.tgl_presentasi))}<div class="small muted">${esc([r.jam, r.ruang].filter(Boolean).join(', '))}</div>` : '<span class="muted">-</span>'}</div></td>
        <td><div><span class="badge plain tahap" style="--c:${TAHAP_MAP[r.tahap].color}"><i></i>${esc(TAHAP_MAP[r.tahap].label)}</span>${r.presentasi > 1 ? `<div class="small muted">${r.presentasi}× presentasi</div>` : ''}</div></td>
        <td class="num"><div>${r.nilai != null ? `<b class="${kkmCls(r.nilai)}">${fmtNilai(r.nilai)}</b><div class="small muted">Predikat ${esc(huruf(r.predikat))}</div>` : '<span class="muted">-</span>'}</div></td>
      </tr>`).join('')}</tbody></table></div>`;
    labelTables($('[data-list]', body));
  };

  const update = () => { tulisAlamat(f); drawOverview(); drawList(); };

  $('[data-kelas]', body).addEventListener('change', (e) => { f.kelas = e.target.value; update(); });
  let t;
  $('[data-cari]', body).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { f.cari = e.target.value.trim().slice(0, 80); tulisAlamat(f); drawList(); }, 200); });
  $('[data-urut]', body).addEventListener('change', (e) => {
    f.urut = e.target.value;
    // tanggal & nilai: paling baru/tinggi lebih berguna dilihat dulu
    f.arah = ['tgl_presentasi', 'tgl_pengajuan', 'tgl_daftar', 'nilai'].includes(f.urut) ? 'turun' : 'naik';
    update();
  });
  $('[data-arah]', body).addEventListener('click', () => { f.arah = f.arah === 'naik' ? 'turun' : 'naik'; update(); });
  update();
}
