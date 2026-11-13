import { sb, state, loadProfile, isStaff, profilLengkap } from '../lib/supa.js';
import {
  $, $$, esc, icon, toast, errMsg, withBusy, confirmDialog, fmtTanggal, fmtJam, fmtWaktu, today, badge,
  ticket, emptyState, pwField, pwToggle, slotCard, sisaBadge,
} from '../lib/ui.js';
import { KOMPLEKSITAS, PORSI, INDIKATOR_A, fmtNilai } from '../lib/rubrik.js';
import { JENIS, validasi, uploadFile, hapusFile, fileUrl, ukuran } from '../lib/files.js';
import { calendar, monthRange } from '../lib/calendar.js';

// =====================================================================
// Data diri (lengkapi & profil)
// =====================================================================
function formDataDiri(p) {
  const kelasList = state.settings.daftar_kelas || [];
  const opt = (obj, val) => Object.keys(obj).map((k) => `<option value="${k}" ${val === k ? 'selected' : ''}>${k}</option>`).join('');
  const kelasInput = kelasList.length
    ? `<select class="select" id="f-kelas" name="kelas" required><option value="">Pilih kelas</option>${[...new Set([...kelasList, p.kelas].filter(Boolean))].map((k) => `<option ${p.kelas === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`
    : `<input class="input" id="f-kelas" name="kelas" value="${esc(p.kelas)}" required />`;
  return `
    <div class="grid-2">
      <div class="field"><label for="f-nama">Nama murid</label><input class="input" id="f-nama" name="nama" value="${esc(p.nama)}" required />
        <span class="hint">Diambil dari pendaftaran. Perbaiki bila ada salah ketik.</span></div>
      <div class="field"><label for="f-kelas">Kelas</label>${kelasInput}</div>
    </div>
    <div class="field"><label for="f-dudi">Tempat PKL (DUDI)</label><input class="input" id="f-dudi" name="dudi" value="${esc(p.dudi)}" placeholder="Nama perusahaan/instansi tempat PKL" required /></div>
    <div class="field"><label for="f-judul">Judul project (judul laporan)</label>
      <textarea class="textarea" id="f-judul" name="judul" rows="2" style="min-height:64px" required>${esc(p.judul)}</textarea>
      <div class="callout warn small">${icon('info')}<span>Judul harus sudah disetujui oleh pembimbing dan kepala program, dibuktikan dengan <b>lembar bimbingan PKL</b> yang nanti diunggah saat pengajuan.</span></div>
    </div>
    <div class="grid-2">
      <div class="field"><label for="f-komp">Kompleksitas pekerjaan</label>
        <select class="select" id="f-komp" name="kompleksitas" required><option value="">Pilih tingkat</option>${opt(KOMPLEKSITAS, p.kompleksitas)}</select>
        <span class="hint" data-ket="komp"></span></div>
      <div class="field"><label for="f-porsi">Porsi kontribusi</label>
        <select class="select" id="f-porsi" name="porsi" required><option value="">Pilih porsi</option>${opt(PORSI, p.porsi)}</select>
        <span class="hint" data-ket="porsi"></span></div>
    </div>
    <details class="small muted"><summary style="cursor:pointer;font-weight:600">Lihat ciri setiap tingkat</summary>
      <dl class="kv" style="margin-top:12px">
        ${Object.entries(KOMPLEKSITAS).map(([k, v]) => `<dt>Kompleksitas ${k.toLowerCase()}</dt><dd>${esc(v.ciri)}</dd>`).join('')}
        ${Object.entries(PORSI).map(([k, v]) => `<dt>Porsi ${k.toLowerCase()}</dt><dd>${esc(v.ciri)}</dd>`).join('')}
      </dl>
      <p style="margin-top:12px">Pilih dengan jujur. Guru akan mencocokkan pilihanmu dengan surat keterangan DUDI dan jurnal PKL. Klaim yang tidak bisa kamu jelaskan saat tanya jawab akan diturunkan satu tingkat.</p>
    </details>`;
}

function bindKet(root) {
  const upd = () => {
    const k = $('#f-komp', root)?.value; const p = $('#f-porsi', root)?.value;
    $('[data-ket="komp"]', root).textContent = k ? KOMPLEKSITAS[k].ciri : '';
    $('[data-ket="porsi"]', root).textContent = p ? PORSI[p].ciri : '';
  };
  $('#f-komp', root)?.addEventListener('change', upd);
  $('#f-porsi', root)?.addEventListener('change', upd);
  upd();
}

async function simpanDataDiri(form) {
  const fd = Object.fromEntries(new FormData(form));
  for (const [k, label] of [['nama', 'Nama'], ['kelas', 'Kelas'], ['dudi', 'Tempat PKL'], ['judul', 'Judul project'], ['kompleksitas', 'Kompleksitas'], ['porsi', 'Porsi kontribusi']]) {
    if (!String(fd[k] || '').trim()) throw new Error(`${label} wajib diisi`);
  }
  const { error } = await sb.from('profiles').update({
    nama: fd.nama.trim(), kelas: fd.kelas, dudi: fd.dudi.trim(), judul: fd.judul.trim().replace(/\s+/g, ' '),
    kompleksitas: fd.kompleksitas, porsi: fd.porsi,
  }).eq('id', state.profile.id);
  if (error) throw error;
  await loadProfile();
}

export async function lengkapi(view, ctx) {
  const p = state.profile;
  view.innerHTML = `
    <div class="page-head"><div><h1>Lengkapi data diri</h1>
      <p>${profilLengkap() ? 'Data dirimu sudah lengkap. Kamu masih bisa memperbaikinya di sini.' : 'Sebelum mengajukan jadwal presentasi, lengkapi data berikut. Data ini dipakai guru untuk menetapkan profil penilaianmu.'}</p></div></div>
    <div class="cols">
      <form class="card stack" novalidate>${formDataDiri(p)}
        <div class="row"><button class="btn primary" type="submit">Simpan dan lanjut ke pengajuan</button></div>
      </form>
      <aside class="card stack sticky">
        <h3>Akun kamu</h3>
        <dl class="kv"><dt>NIS</dt><dd>${esc(p.nis || '-')}</dd><dt>Tanggal lahir</dt><dd>${esc(fmtTanggal(p.tgl_lahir, false))}</dd></dl>
        <p class="small muted">NIS dan tanggal lahir hanya bisa diubah guru. Tanggal lahir dipakai untuk verifikasi saat reset password.</p>
        <a class="btn ghost" href="#/murid/poin">${icon('list')} Lihat poin presentasi</a>
      </aside>
    </div>`;
  const form = $('form', view);
  bindKet(form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(form.querySelector('[type=submit]'), async () => {
      try { await simpanDataDiri(form); toast('Data diri tersimpan.'); ctx.go('#/murid/pengajuan'); }
      catch (err) { toast(errMsg(err), 'err'); }
    });
  });
}

export async function profil(view, ctx) {
  const p = state.profile;
  const staff = isStaff();
  view.innerHTML = `
    <div class="page-head"><div><h1>${staff ? 'Profil saya' : 'Data diri'}</h1><p>Perbarui data dan ganti password akunmu.</p></div></div>
    <div class="cols">
      <form class="card stack" data-profil novalidate>
        ${staff
          ? `<div class="field"><label for="f-nama">Nama lengkap</label><input class="input" id="f-nama" name="nama" value="${esc(p.nama)}" required /></div>
             <dl class="kv"><dt>Username</dt><dd>${esc(p.username)}</dd><dt>Peran</dt><dd>${p.role === 'admin' ? 'Admin' : 'Guru'}</dd></dl>`
          : formDataDiri(p)}
        <div class="row"><button class="btn primary" type="submit">Simpan perubahan</button></div>
      </form>
      <aside class="stack">
        <form class="card stack" data-pw novalidate>
          <h3>Ganti password</h3>
          ${pwField('pw1', 'Password baru', 'new-password')}
          ${pwField('pw2', 'Ulangi password baru', 'new-password')}
          <button class="btn ghost" type="submit">${icon('key')} Ganti password</button>
        </form>
        ${staff ? '' : `<div class="card"><dl class="kv"><dt>NIS</dt><dd>${esc(p.nis)}</dd><dt>Tanggal lahir</dt><dd>${esc(fmtTanggal(p.tgl_lahir, false))}</dd></dl></div>`}
      </aside>
    </div>`;
  pwToggle(view);
  const fp = $('[data-profil]', view);
  if (!staff) bindKet(fp);
  fp.addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(fp.querySelector('[type=submit]'), async () => {
      try {
        if (staff) {
          const nama = fp.nama.value.trim();
          if (!nama) throw new Error('Nama wajib diisi');
          const { error } = await sb.from('profiles').update({ nama }).eq('id', p.id);
          if (error) throw error;
          await loadProfile();
        } else await simpanDataDiri(fp);
        toast('Perubahan tersimpan.');
        document.querySelector('.me-info b') && (document.querySelector('.me-info b').textContent = state.profile.nama);
      } catch (err) { toast(errMsg(err), 'err'); }
    });
  });
  const fw = $('[data-pw]', view);
  fw.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = fw.pw1.value; const b = fw.pw2.value;
    if (a.length < 6) return toast('Password minimal 6 karakter.', 'err');
    if (a !== b) return toast('Ulangi password belum sama.', 'err');
    withBusy(fw.querySelector('[type=submit]'), async () => {
      const { error } = await sb.auth.updateUser({ password: a });
      if (error) return toast(errMsg(error), 'err');
      fw.reset(); toast('Password diganti.');
    });
  });
}

// =====================================================================
// Pengajuan jadwal
// =====================================================================
const fileLink = (f, label, ic = 'file') => f?.path
  ? `<a class="file-link" href="${esc(fileUrl(f))}" target="_blank" rel="noopener"><span class="ic">${icon(ic)}</span><div><b>${esc(label)}</b><span>${esc(f.name)} · ${ukuran(f.size || 0)}</span></div>${icon('download')}</a>`
  : '';
export const daftarBerkas = (p) => `<div class="stack" style="gap:8px">
  ${fileLink(p.file_laporan, 'Draft laporan', 'file')}${fileLink(p.file_ppt, 'File presentasi', 'slides')}${fileLink(p.file_bimbingan, 'Lembar bimbingan', 'book')}</div>`;

function timeline(p) {
  const st = p.status;
  const steps = [
    ['Pengajuan dikirim', fmtWaktu(p.created_at), 'done'],
    st === 'ditolak' ? ['Ditolak guru', fmtWaktu(p.diverifikasi_at), 'bad']
      : st === 'dibatalkan' ? ['Dibatalkan', fmtWaktu(p.updated_at), 'bad']
      : ['Diverifikasi guru', st === 'menunggu' ? 'Sedang ditinjau' : fmtWaktu(p.diverifikasi_at), st === 'menunggu' ? 'now' : 'done'],
  ];
  if (!['ditolak', 'dibatalkan'].includes(st)) {
    steps.push(['Presentasi', `${fmtTanggal(p.tanggal)}, ${fmtJam(p.jam_mulai)}`, ['selesai', 'remidi'].includes(st) ? 'done' : st === 'disetujui' ? 'now' : '']);
    steps.push(['Hasil penilaian', st === 'selesai' ? 'Sudah keluar' : st === 'remidi' ? 'Perlu remidi' : 'Menunggu', st === 'selesai' ? 'done' : st === 'remidi' ? 'bad' : '']);
  }
  return `<ol class="timeline">${steps.map(([b, s, c]) => `<li class="${c}"><span class="dot">${c === 'done' ? icon('check') : c === 'bad' ? icon('x') : ''}</span><div><b>${esc(b)}</b><span>${esc(s)}</span></div></li>`).join('')}</ol>`;
}

export async function pengajuan(view, ctx) {
  const p = state.profile;
  const { data: list, error } = await sb.from('pengajuan').select('*, hasil(remidi, info_remidi, dipublikasi)').order('created_at', { ascending: false });
  if (error) throw error;
  const latest = list[0];
  const active = latest && ['menunggu', 'disetujui'].includes(latest.status);
  const selesai = latest?.status === 'selesai';
  const bisaAjukan = !active && !selesai;

  let head = 'Ajukan jadwal presentasi';
  let intro = 'Unggah berkas, pilih slot yang tersedia, lalu kirim. Guru akan memverifikasi pengajuanmu.';
  if (latest?.status === 'ditolak') { head = 'Ajukan ulang'; intro = 'Perbaiki sesuai feedback guru, lalu kirim pengajuan baru.'; }
  if (latest?.status === 'remidi') { head = 'Jadwalkan ulang presentasi (remidi)'; intro = 'Pilih jadwal baru dan unggah berkas yang sudah diperbaiki.'; }

  const extra = latest ? `
    ${latest.feedback ? `<div class="callout ${latest.status === 'ditolak' ? 'bad' : 'info'}">${icon('info')}<span><b>Feedback guru:</b> ${esc(latest.feedback)}</span></div>` : ''}
    ${latest.status === 'remidi' && latest.hasil?.info_remidi ? `<div class="callout bad">${icon('alert')}<span><b>Informasi remidi:</b> ${esc(latest.hasil.info_remidi)}</span></div>` : ''}
    ${latest.status === 'menunggu' ? '<div class="callout warn">' + icon('clock') + '<span>Menunggu verifikasi dan persetujuan guru.</span></div>' : ''}` : '';

  view.innerHTML = `
    <div class="page-head"><div><h1>Pengajuan presentasi</h1><p>${esc(p.nama)} · ${esc(p.kelas)} · ${esc(p.dudi)}</p></div>
      <a class="btn ghost" href="#/murid/poin">${icon('list')} Poin presentasi</a></div>
    ${latest ? `<section class="cols" style="margin-bottom:24px">
        <div class="stack-lg">${ticket(latest, { extra })}<section data-hari-ini class="hidden"></section></div>
        <aside class="card stack">
          <h3>Status</h3>${timeline(latest)}
          <h3>Berkas</h3>${daftarBerkas(latest)}
          ${latest.status === 'menunggu' ? `<button class="btn ghost" data-batal="${latest.id}">${icon('x')} Batalkan pengajuan</button>` : ''}
          ${['selesai', 'remidi'].includes(latest.status) ? `<a class="btn primary" href="#/murid/hasil">${icon('award')} Lihat hasil</a>` : ''}
        </aside></section>` : ''}
    ${bisaAjukan ? `<section data-form-wrap><div class="card-head"><div><h2>${esc(head)}</h2><p>${esc(intro)}</p></div></div><div data-form></div></section>` : ''}
    ${selesai ? `<div class="callout ok">${icon('check')}<span>Presentasimu sudah selesai dinilai. Lihat nilai dan feedback di halaman <a href="#/murid/hasil">Hasil</a>.</span></div>` : ''}
    ${latest ? '' : '<section data-hari-ini class="hidden" style="margin-bottom:24px"></section>'}
    ${list.length > 1 ? `<section style="margin-top:32px"><h2 style="margin-bottom:12px">Riwayat pengajuan</h2>
      <div class="table-wrap"><table class="t"><thead><tr><th>Diajukan</th><th>Jadwal</th><th>Percobaan</th><th>Status</th><th>Feedback</th></tr></thead><tbody>
      ${list.slice(1).map((r) => `<tr><td>${esc(fmtWaktu(r.created_at))}</td><td>${esc(fmtTanggal(r.tanggal, false))}, ${esc(fmtJam(r.jam_mulai))}</td><td>${r.percobaan}</td><td>${badge(r.status)}</td><td class="small">${esc(r.feedback || '-')}</td></tr>`).join('')}
      </tbody></table></div></section>` : ''}`;

  view.querySelector('[data-batal]')?.addEventListener('click', async (e) => {
    if (!(await confirmDialog('Batalkan pengajuan ini? Slot jadwalmu akan dilepas.', { ok: 'Batalkan pengajuan', danger: true }))) return;
    const { error: er } = await sb.rpc('batalkan_pengajuan', { p_id: Number(e.currentTarget.dataset.batal) });
    if (er) return toast(errMsg(er), 'err');
    toast('Pengajuan dibatalkan.');
    ctx.go('#/murid/pengajuan');
  });

  kartuHariIni($('[data-hari-ini]', view));
  if (bisaAjukan) await formPengajuan($('[data-form]', view), ctx);
}

// Kartu "Presentasi hari ini": hanya muncul bila ada jadwal hari ini
async function kartuHariIni(el) {
  const { data } = await sb.rpc('papan_murid');
  const list = data?.hari_ini || [];
  if (!list.length) return;
  const me = state.profile.nama;
  el.classList.remove('hidden');
  el.innerHTML = `<div class="card stack">
    <div class="card-head"><div><h2>Presentasi hari ini</h2><p>${esc(fmtTanggal(today()))}</p></div><span class="badge plain disetujui">${list.length} murid</span></div>
    <div class="list">${list.map((x) => `<div class="list-item static">
      <span class="time-chip ${x.sudah ? 'done' : ''}"><b>${esc(x.jam_mulai)}</b><span>${esc(x.jam_selesai)}</span></span>
      <span class="li-main"><span class="li-name"><b>${esc(x.nama)}</b>${x.nama === me ? '<span class="badge plain disetujui">Kamu</span>' : ''}</span><span>${esc(x.kelas || '')}</span></span>
      <span class="li-aside"><span>${esc(x.ruang || '-')}</span>${x.sudah ? '<span class="badge selesai">Sudah presentasi</span>' : ''}</span></div>`).join('')}</div>
  </div>`;
}

async function formPengajuan(root, ctx) {
  const p = state.profile;
  const files = { laporan: null, ppt: null, bimbingan: null };
  let slotId = null;
  let slots = [];

  root.innerHTML = `<form class="cols form-wide" novalidate>
    <div class="stack-lg">
      <div class="card stack">
        <div class="field"><label>Judul laporan</label><input class="input" value="${esc(p.judul)}" readonly />
          <span class="hint">Diambil dari data diri. <a href="#/murid/profil">Ubah judul</a></span></div>
        ${Object.entries(JENIS).map(([k, j]) => `
          <div class="field"><span class="label">${j.label}</span>
            <label class="drop" data-drop="${k}">
              <input type="file" accept="${j.accept}" aria-label="${j.label}" />
              <span class="ic">${icon(k === 'ppt' ? 'slides' : k === 'bimbingan' ? 'book' : 'file')}</span>
              <span class="tx"><b data-name>Pilih atau seret berkas ke sini</b><span data-meta>${j.ket}</span><div class="progress hidden"><i></i></div></span>
            </label>
            ${k === 'ppt' ? '<span class="hint">Susun slide sesuai <a href="#/murid/poin" target="_blank">poin-poin presentasi</a>.</span>' : ''}
            ${k === 'bimbingan' ? '<span class="hint">Bukti judul sudah disetujui pembimbing dan kepala program.</span>' : ''}
          </div>`).join('')}
        <div class="field"><label for="f-cat">Catatan untuk guru <span class="muted">(opsional)</span></label><textarea class="textarea" id="f-cat" name="catatan" rows="2"></textarea></div>
      </div>
    </div>
    <aside class="card stack sticky">
      <div><h3>Pilih jadwal</h3><p class="small muted" style="margin-top:4px">Tanggal bertanda hijau masih punya slot kosong.</p></div>
      <div data-cal></div>
      <div data-slots class="slot-list"><p class="small muted">Pilih tanggal untuk melihat slot.</p></div>
      <button class="btn primary block" type="submit">${icon('send')} Kirim pengajuan</button>
    </aside>
  </form>`;

  // ---- unggah berkas
  $$('[data-drop]', root).forEach((drop) => {
    const k = drop.dataset.drop;
    const input = drop.querySelector('input');
    const set = (f) => {
      const err = validasi(f, k);
      if (err) { toast(err, 'err'); input.value = ''; return; }
      files[k] = f;
      drop.classList.add('done');
      drop.querySelector('[data-name]').textContent = f.name;
      drop.querySelector('[data-meta]').textContent = `${ukuran(f.size)} · siap diunggah`;
    };
    input.addEventListener('change', () => input.files[0] && set(input.files[0]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && set(e.dataTransfer.files[0]); });
  });

  // ---- kalender slot
  const t = today();
  const loadSlots = async (m) => {
    const [a, b] = monthRange(m);
    const { data, error } = await sb.rpc('daftar_slot', { p_dari: a < t ? t : a, p_sampai: b });
    if (error) throw error;
    slots = data || [];
  };
  const firstMonth = new Date();
  await loadSlots(firstMonth);
  const slotRoot = $('[data-slots]', root);
  const showDay = (d) => {
    const ds = slots.filter((s) => s.tanggal === d);
    slotRoot.innerHTML = ds.length
      ? ds.map((s) => slotCard(s, {
          cls: slotId === s.id ? 'on' : '',
          attrs: `data-slot="${s.id}" ${s.terpakai >= s.kapasitas ? 'disabled' : ''} aria-pressed="${slotId === s.id}"`,
          aside: sisaBadge(s),
        })).join('')
      : '<p class="small muted">Tidak ada slot di tanggal ini.</p>';
    $$('[data-slot]', slotRoot).forEach((b) => b.addEventListener('click', () => {
      slotId = Number(b.dataset.slot);
      $$('[data-slot]', slotRoot).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    }));
  };
  const cal = calendar($('[data-cal]', root), {
    month: firstMonth,
    getDay: (d) => {
      const ds = slots.filter((s) => s.tanggal === d && d >= t);
      if (!ds.length) return {};
      return { has: true, dots: ds.map((s) => (s.terpakai >= s.kapasitas ? 'full' : 'ok')) };
    },
    onMonth: loadSlots,
    onPick: showDay,
    legend: '<span><i style="background:var(--mint)"></i>Slot kosong</span><span><i style="background:var(--rose)"></i>Penuh</span>',
  });
  // lompat ke tanggal slot kosong terdekat
  const firstFree = slots.find((s) => s.terpakai < s.kapasitas);
  if (firstFree) { cal.select(firstFree.tanggal); showDay(firstFree.tanggal); }
  else if (!slots.length) slotRoot.innerHTML = '<div class="callout">' + icon('info') + '<span>Belum ada slot jadwal di bulan ini. Coba bulan berikutnya atau tunggu guru membuka slot.</span></div>';

  // ---- kirim
  const form = $('form', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const kurang = Object.entries(files).filter(([, f]) => !f).map(([k]) => JENIS[k].label.toLowerCase());
    if (kurang.length) return toast(`Unggah ${kurang.join(', ')}.`, 'err');
    if (!slotId) return toast('Pilih slot jadwal presentasi.', 'err');
    withBusy(form.querySelector('[type=submit]'), async () => {
      const up = {};
      try {
        for (const k of Object.keys(files)) {
          const drop = $(`[data-drop="${k}"]`, root);
          const bar = drop.querySelector('.progress'); bar.classList.remove('hidden');
          up[k] = await uploadFile(files[k], k, { nis: p.nis, onProgress: (r) => (bar.firstElementChild.style.width = `${Math.round(r * 100)}%`) });
          drop.querySelector('[data-meta]').textContent = `${ukuran(files[k].size)} · terunggah`;
        }
        const { error } = await sb.from('pengajuan').insert({
          murid_id: p.id, slot_id: slotId, judul: p.judul,
          file_laporan: up.laporan, file_ppt: up.ppt, file_bimbingan: up.bimbingan,
          catatan_murid: form.catatan.value.trim() || null,
        });
        if (error) throw error;
        toast('Pengajuan terkirim. Tunggu verifikasi guru.');
        ctx.go('#/murid/pengajuan');
      } catch (err) {
        await Promise.all(Object.values(up).map(hapusFile));
        toast(errMsg(err), 'err');
        if (/Slot/.test(err.message)) { await loadSlots(cal.month); cal.redraw(); slotRoot.innerHTML = ''; slotId = null; }
      }
    });
  });
}

// =====================================================================
// Poin presentasi
// =====================================================================
export async function poin(view) {
  const list = state.settings.poin_presentasi || [];
  const staff = isStaff();
  view.innerHTML = `
    <div class="page-head"><div><h1>Poin-poin presentasi</h1>
      <p>Susun slide presentasimu mengikuti urutan berikut. Durasi yang disarankan 10–15 menit presentasi dan 5 menit tanya jawab.</p></div>
      ${staff ? `<a class="btn ghost" href="#/guru/pengaturan">${icon('edit')} Ubah poin</a>` : ''}</div>
    <div class="cols">
      <ol class="poin-list">${list.map((s) => `<li><div><h3>${esc(s.judul)}</h3><ul>${(s.poin || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></li>`).join('')}</ol>
      <aside class="card stack sticky">
        <h3>Yang dinilai saat presentasi</h3>
        <div>${INDIKATOR_A.map((i) => `<div class="sum-row"><span>${esc(i.judul)}</span><b>${i.bobot}</b></div>`).join('')}</div>
        <p class="small muted">Total 70 poin untuk kualitas presentasi dan pemahaman, ditambah 30 poin dari tingkat tantangan pekerjaan berdasarkan bukti DUDI.</p>
        <div class="callout info small">${icon('info')}<span>Jangan tampilkan data rahasia perusahaan (kredensial, data pelanggan, kode inti) tanpa izin DUDI. Samarkan bila perlu.</span></div>
      </aside>
    </div>`;
}

// =====================================================================
// Hasil presentasi
// =====================================================================
export async function hasil(view) {
  const { data, error } = await sb.from('pengajuan').select('*, hasil(*), penilaian(*)').in('status', ['selesai', 'remidi', 'disetujui']).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []).filter((r) => r.hasil?.dipublikasi);
  if (!rows.length) {
    view.innerHTML = `<div class="page-head"><div><h1>Hasil presentasi</h1></div></div>
      <div class="card">${emptyState('award', 'Hasil belum tersedia', 'Nilai dan feedback akan muncul di sini setelah guru mempublikasikan hasil presentasimu.', '<a class="btn ghost" href="#/murid/pengajuan">Lihat pengajuan</a>')}</div>`;
    return;
  }
  view.innerHTML = `<div class="page-head"><div><h1>Hasil presentasi</h1><p>Nilai akhir dihitung dari 70 poin kualitas presentasi dan 30 poin tingkat tantangan pekerjaan.</p></div></div>
    <div class="stack-lg">${rows.map(kartuHasil).join('')}</div>`;
}

function kartuHasil(r) {
  const h = r.hasil;
  const pen = (r.penilaian || []);
  const avg = (k) => (pen.length ? pen.reduce((s, x) => s + (Number(x[k]) || 0), 0) / pen.length : null);
  const blok = (label, val) => (val ? `<div class="stack" style="gap:4px"><span class="label">${label}</span><p style="white-space:pre-wrap">${esc(val)}</p></div>` : '');
  return `<article class="card stack-lg">
    <div class="card-title-row"><div><h2>${esc(r.judul)}</h2><p class="muted small mt-xs">Presentasi ${esc(fmtTanggal(r.tanggal))}, percobaan ke-${r.percobaan}</p></div>${badge(r.status)}</div>
    ${h.remidi ? `<div class="callout bad">${icon('alert')}<div><b>Kamu perlu remidi.</b> ${esc(h.info_remidi || '')}<div style="margin-top:8px"><a class="btn sm danger" href="#/murid/pengajuan">${icon('calendar')} Jadwalkan ulang</a></div></div></div>` : ''}
    <div class="cols result">
      <div class="stack">
        <h3>Komponen A: kualitas presentasi dan pemahaman</h3>
        <div>${INDIKATOR_A.map((i) => `<div class="sum-row"><span>${esc(i.judul)}</span><b>${fmtNilai(avg(i.key))} / ${i.bobot}</b></div>`).join('')}</div>
        <h3 class="mt">Komponen B: tingkat tantangan pekerjaan</h3>
        <div>
          <div class="sum-row"><span>Kompleksitas pekerjaan (${esc(h.kompleksitas)})</span><b>${fmtNilai(h.b1)} / 15</b></div>
          <div class="sum-row"><span>Porsi kontribusi (${esc(h.porsi)})</span><b>${fmtNilai(h.b2)} / 10</b></div>
          <div class="sum-row"><span>Keselarasan bukti (${esc(h.keselarasan)})</span><b>${fmtNilai(h.b3)} / 5</b></div>
        </div>
        ${pen.length > 1 ? `<p class="small muted">Komponen A adalah rata-rata dari ${pen.length} penguji.</p>` : ''}
      </div>
      <div class="total-box tinted">
        <span class="label">Nilai akhir</span>
        <div class="total-big">${fmtNilai(h.total)}</div>
        <div class="meter" aria-hidden="true"><i class="a" style="width:${h.nilai_a}%"></i><i class="b" style="width:${h.nilai_b}%"></i></div>
        <div class="sum-row"><span>Komponen A</span><b>${fmtNilai(h.nilai_a)} / 70</b></div>
        <div class="sum-row"><span>Komponen B</span><b>${fmtNilai(h.nilai_b)} / 30</b></div>
        <div class="sum-row"><span>Predikat</span><b>${esc(h.predikat)}</b></div>
      </div>
    </div>
    <div class="grid-2">
      ${blok('Evaluasi dan feedback', h.evaluasi)}${blok('Saran', h.saran)}${blok('Kritik', h.kritik)}${blok('Catatan', h.catatan)}
    </div>
  </article>`;
}
