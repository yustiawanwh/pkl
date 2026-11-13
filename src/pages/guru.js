import { sb, state, callAdmin, isAdmin } from '../lib/supa.js';
import {
  $, $$, esc, icon, toast, errMsg, withBusy, confirmDialog, modal, fmtTanggal, fmtJam, fmtWaktu, today, badge,
  ticket, emptyState, initials, pwField, pwToggle, isoDate, parseDate, slotCard, sisaBadge, listItem,
} from '../lib/ui.js';
import { KOMPLEKSITAS, PORSI } from '../lib/rubrik.js';
import { calendar, monthRange } from '../lib/calendar.js';
import { daftarBerkas } from './murid.js';

const SEL = '*, murid:profiles!pengajuan_murid_id_fkey(id, nama, nis, kelas, dudi, judul, kompleksitas, porsi), hasil(dipublikasi, total, predikat, remidi)';
const who = (m) => `<div class="who"><b>${esc(m?.nama)}</b><span>${esc(m?.kelas || '')}${m?.nis ? ' · NIS ' + esc(m.nis) : ''}</span></div>`;
const jadwalStr = (p) => `${fmtTanggal(p.tanggal, false)}, ${fmtJam(p.jam_mulai)}`;

// =====================================================================
// Beranda
// =====================================================================
export async function beranda(view) {
  const t = today();
  const [{ data: all, error }, { data: slotData }] = await Promise.all([
    sb.from('pengajuan').select(SEL).in('status', ['menunggu', 'disetujui', 'selesai', 'remidi']).order('tanggal').order('jam_mulai'),
    sb.rpc('daftar_slot', { p_dari: t, p_sampai: isoDate(new Date(Date.now() + 30 * 864e5)) }),
  ]);
  if (error) throw error;
  const rows = all || [];
  const menunggu = rows.filter((r) => r.status === 'menunggu');
  const terjadwal = rows.filter((r) => r.status === 'disetujui');
  const hariIni = terjadwal.filter((r) => r.tanggal === t);
  const belumDinilai = terjadwal.filter((r) => r.tanggal <= t && !r.hasil?.dipublikasi);
  const slotKosong = (slotData || []).reduce((s, x) => s + Math.max(0, x.kapasitas - x.terpakai), 0);
  const nama = state.profile.nama.split(' ')[0];

  view.innerHTML = `
    <div class="page-head"><div><h1>Halo, ${esc(nama)}</h1><p>${esc(fmtTanggal(t))}</p></div>
      <a class="btn primary" href="#/guru/jadwal">${icon('plus')} Buka slot jadwal</a></div>
    <div class="stats">
      <a class="stat warn" href="#/guru/pengajuan"><b>${menunggu.length}</b><span>Menunggu verifikasi</span></a>
      <a class="stat pri" href="#/guru/jadwal"><b>${hariIni.length}</b><span>Presentasi hari ini</span></a>
      <a class="stat bad" href="#/guru/penilaian"><b>${belumDinilai.length}</b><span>Belum dinilai</span></a>
      <a class="stat ok" href="#/guru/jadwal"><b>${slotKosong}</b><span>Slot kosong 30 hari ke depan</span></a>
    </div>
    <div class="cols even">
      <section class="card">
        <div class="card-head"><div><h2>Perlu diverifikasi</h2><p>Pengajuan terbaru dari murid</p></div><a class="btn sm ghost" href="#/guru/pengajuan">Semua</a></div>
        ${menunggu.length ? `<div class="list">${menunggu.slice(0, 6).map((r) => listItem({
            href: `#/guru/pengajuan/${r.id}`,
            lead: `<span class="avatar">${esc(initials(r.murid?.nama))}</span>`,
            title: esc(r.murid?.nama), sub: esc(r.murid?.kelas || ''),
            aside: `<b>${esc(parseDate(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }))}</b><span>${fmtJam(r.jam_mulai)}</span>`,
          })).join('')}</div>`
          : emptyState('check', 'Semua sudah diverifikasi', 'Pengajuan baru akan muncul di sini.')}
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Jadwal terdekat</h2><p>Presentasi yang sudah disetujui</p></div><a class="btn sm ghost" href="#/guru/jadwal">Kalender</a></div>
        ${terjadwal.filter((r) => r.tanggal >= t).length ? `<div class="list">${terjadwal.filter((r) => r.tanggal >= t).slice(0, 6).map((r) => {
            const d = parseDate(r.tanggal);
            return listItem({
              href: `#/guru/nilai/${r.id}`,
              lead: `<span class="date-chip ${r.tanggal === t ? 'today' : ''}"><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('id-ID', { month: 'short' }))}</span></span>`,
              title: esc(r.murid?.nama), sub: esc(r.murid?.kelas || ''),
              aside: `<b>${fmtJam(r.jam_mulai)}</b><span>${esc(r.ruang || '')}</span>`,
            });
          }).join('')}</div>`
          : emptyState('calendar', 'Belum ada jadwal', 'Setujui pengajuan untuk mengisi jadwal presentasi.')}
      </section>
    </div>`;
}

// =====================================================================
// Daftar pengajuan
// =====================================================================
export async function daftarPengajuan(view) {
  const { data, error } = await sb.from('pengajuan').select(SEL).order('created_at', { ascending: false });
  if (error) throw error;
  const all = data || [];
  const kelas = [...new Set(all.map((r) => r.murid?.kelas).filter(Boolean))].sort();
  let f = { status: 'menunggu', q: '', kelas: '' };
  const TABS = [['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak'], ['selesai', 'Selesai'], ['remidi', 'Remidi'], ['', 'Semua']];

  view.innerHTML = `
    <div class="page-head"><div><h1>Pengajuan presentasi</h1><p>Verifikasi berkas dan jadwal yang diajukan murid, lalu setujui atau tolak dengan feedback.</p></div></div>
    <div class="filters">
      <div class="seg" role="tablist">${TABS.map(([k, l]) => `<button data-st="${k}" class="${k === f.status ? 'on' : ''}">${l} <span class="muted">${k ? all.filter((r) => r.status === k).length : all.length}</span></button>`).join('')}</div>
      <span class="spacer"></span>
      <select class="select" data-kelas><option value="">Semua kelas</option>${kelas.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      <input class="input" type="search" placeholder="Cari nama, NIS, judul" data-q />
    </div>
    <div data-list></div>`;
  const draw = () => {
    const q = f.q.toLowerCase();
    const rows = all.filter((r) => (!f.status || r.status === f.status) && (!f.kelas || r.murid?.kelas === f.kelas)
      && (!q || `${r.murid?.nama} ${r.murid?.nis} ${r.judul} ${r.murid?.dudi}`.toLowerCase().includes(q)));
    $('[data-list]', view).innerHTML = rows.length ? `<div class="table-wrap"><table class="t">
      <thead><tr><th>Murid</th><th>Judul & DUDI</th><th>Jadwal</th><th>Diajukan</th><th>Status</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="click" data-id="${r.id}" tabindex="0">
        <td>${who(r.murid)}</td>
        <td><div class="who"><b style="font-weight:500">${esc(r.judul)}</b><span>${esc(r.murid?.dudi || '')}</span></div></td>
        <td>${esc(jadwalStr(r))}${r.ruang ? `<div class="small muted">${esc(r.ruang)}</div>` : ''}</td>
        <td class="small">${esc(fmtWaktu(r.created_at))}${r.percobaan > 1 ? `<div class="small muted">Percobaan ke-${r.percobaan}</div>` : ''}</td>
        <td>${badge(r.status)}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card">${emptyState('send', 'Tidak ada pengajuan', 'Coba ubah filter status atau kata kunci.')}</div>`;
    $$('[data-id]', view).forEach((tr) => {
      const open = () => (location.hash = `#/guru/pengajuan/${tr.dataset.id}`);
      tr.addEventListener('click', open);
      tr.addEventListener('keydown', (e) => e.key === 'Enter' && open());
    });
  };
  $$('[data-st]', view).forEach((b) => b.addEventListener('click', () => {
    f.status = b.dataset.st; $$('[data-st]', view).forEach((x) => x.classList.toggle('on', x === b)); draw();
  }));
  $('[data-q]', view).addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  $('[data-kelas]', view).addEventListener('change', (e) => { f.kelas = e.target.value; draw(); });
  draw();
}

// =====================================================================
// Detail & verifikasi
// =====================================================================
export async function detailPengajuan(view, ctx) {
  const id = Number(ctx.params[0]);
  const { data: r, error } = await sb.from('pengajuan').select(SEL).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!r) return notFound(view);
  const m = r.murid || {};
  const { data: riwayat } = await sb.from('pengajuan').select('id, status, tanggal, jam_mulai, percobaan, created_at, feedback').eq('murid_id', r.murid_id).neq('id', id).order('created_at', { ascending: false });
  let verifier = null;
  if (r.diverifikasi_oleh) ({ data: verifier } = await sb.from('profiles').select('nama').eq('id', r.diverifikasi_oleh).maybeSingle());

  view.innerHTML = `
    <div class="page-head"><div><a href="#/guru/pengajuan" class="back">${icon('chevl')} Daftar pengajuan</a><h1>${esc(m.nama)}</h1>
      <p>${esc(m.kelas)}, NIS ${esc(m.nis)}, ${esc(m.dudi)}</p></div>
      ${['disetujui', 'selesai', 'remidi'].includes(r.status) ? `<a class="btn primary" href="#/guru/nilai/${r.id}">${icon('clipboard')} ${r.hasil?.dipublikasi ? 'Lihat penilaian' : 'Nilai presentasi'}</a>` : ''}</div>
    <div class="cols">
      <div class="stack-lg">
        ${ticket(r)}
        <section class="card stack">
          <h3>Profil yang diklaim murid</h3>
          <dl class="kv">
            <dt>Judul project</dt><dd>${esc(r.judul)}</dd>
            <dt>Tempat PKL</dt><dd>${esc(m.dudi)}</dd>
            <dt>Kompleksitas</dt><dd>${esc(m.kompleksitas)} <span class="small muted">· ${esc(KOMPLEKSITAS[m.kompleksitas]?.ciri || '')}</span></dd>
            <dt>Porsi kontribusi</dt><dd>${esc(m.porsi)} <span class="small muted">· ${esc(PORSI[m.porsi]?.ciri || '')}</span></dd>
            ${r.catatan_murid ? `<dt>Catatan murid</dt><dd style="white-space:pre-wrap">${esc(r.catatan_murid)}</dd>` : ''}
          </dl>
          <p class="small muted">Cocokkan judul dengan lembar bimbingan, dan klaim kompleksitas/porsi dengan surat keterangan DUDI serta jurnal PKL.</p>
        </section>
        <section class="card stack"><h3>Berkas</h3>${daftarBerkas(r)}</section>
        ${riwayat?.length ? `<section class="card stack"><h3>Pengajuan lain murid ini</h3><div class="table-wrap"><table class="t"><tbody>
          ${riwayat.map((x) => `<tr class="click" onclick="location.hash='#/guru/pengajuan/${x.id}'"><td>${esc(fmtWaktu(x.created_at))}</td><td>${esc(jadwalStr(x))}</td><td>${badge(x.status)}</td></tr>`).join('')}
          </tbody></table></div></section>` : ''}
      </div>
      <aside class="stack sticky">
        <form class="card stack" data-verif>
          <h3>Verifikasi</h3>
          ${r.status === 'menunggu' ? '' : `<p class="small muted">Status saat ini ${badge(r.status)}${r.diverifikasi_at ? `<br>oleh ${esc(verifier?.nama || '-')}, ${esc(fmtWaktu(r.diverifikasi_at))}` : ''}</p>`}
          <div class="field"><label for="f-fb">Feedback untuk murid</label>
            <textarea class="textarea" id="f-fb" name="feedback" placeholder="Wajib diisi bila menolak. Mis. lembar bimbingan belum ditandatangani kepala program.">${esc(r.feedback || '')}</textarea></div>
          ${['menunggu', 'ditolak', 'disetujui'].includes(r.status) ? `
            <div class="grid-2">
              <button type="button" class="btn danger" data-act="ditolak" ${r.status === 'ditolak' ? 'disabled' : ''}>${icon('x')} Tolak</button>
              <button type="button" class="btn success" data-act="disetujui" ${r.status === 'disetujui' ? 'disabled' : ''}>${icon('check')} Setujui</button>
            </div>` : '<p class="small muted">Pengajuan ini sudah dinilai. Ubah hasil dari halaman penilaian.</p>'}
          ${r.status === 'disetujui' ? `<button type="button" class="btn ghost" data-act="feedback">Simpan feedback saja</button>` : ''}
        </form>
        ${['menunggu', 'disetujui'].includes(r.status) ? `<div class="card stack"><h3>Pindah jadwal</h3><p class="small muted">Pindahkan murid ke slot lain bila jadwal berubah.</p><button class="btn ghost" data-pindah>${icon('calendar')} Pilih slot lain</button></div>` : ''}
      </aside>
    </div>`;

  const form = $('[data-verif]', view);
  $$('[data-act]', form).forEach((b) => b.addEventListener('click', () => {
    const act = b.dataset.act;
    const feedback = form.feedback.value.trim() || null;
    if (act === 'ditolak' && !feedback) return toast('Tulis feedback alasan penolakan.', 'err');
    withBusy(b, async () => {
      const upd = act === 'feedback' ? { feedback } : { status: act, feedback };
      const { error: e } = await sb.from('pengajuan').update(upd).eq('id', id);
      if (e) return toast(errMsg(e), 'err');
      toast(act === 'disetujui' ? 'Pengajuan disetujui.' : act === 'ditolak' ? 'Pengajuan ditolak.' : 'Feedback tersimpan.');
      ctx.refreshNotif();
      ctx.go(`#/guru/pengajuan/${id}`);
    });
  }));

  $('[data-pindah]', view)?.addEventListener('click', async () => {
    const t = today();
    const { data: sl } = await sb.rpc('daftar_slot', { p_dari: t, p_sampai: isoDate(new Date(Date.now() + 120 * 864e5)) });
    const free = (sl || []).filter((s) => s.id !== r.slot_id && s.terpakai < s.kapasitas);
    const md = modal({
      title: 'Pindah jadwal',
      body: free.length ? `<div class="slot-list">${free.map((s) => slotCard(s, { attrs: `data-s="${s.id}"`, aside: sisaBadge(s), showDate: true })).join('')}</div>`
        : emptyState('calendar', 'Tidak ada slot kosong', 'Buka slot baru di menu Jadwal & slot.'),
    });
    $$('[data-s]', md.el).forEach((b) => b.addEventListener('click', async () => {
      const { error: e } = await sb.from('pengajuan').update({ slot_id: Number(b.dataset.s) }).eq('id', id);
      if (e) return toast(errMsg(e), 'err');
      md.close(); toast('Jadwal dipindah.'); ctx.go(`#/guru/pengajuan/${id}`);
    }));
  });
}

export function notFound(view, back = '#/guru/pengajuan', label = 'Kembali ke daftar pengajuan') {
  view.innerHTML = `<div class="card">${emptyState('alert', 'Data tidak ditemukan',
    'Pengajuan ini sudah tidak ada. Biasanya karena akun muridnya telah dihapus.',
    `<a class="btn primary" href="${back}">${esc(label)}</a>`)}</div>`;
}

// =====================================================================
// Jadwal & slot
// =====================================================================
export async function jadwal(view, ctx) {
  let month = new Date();
  let slots = [];
  let bookings = [];
  let sel = today();

  view.innerHTML = `
    <div class="page-head"><div><h1>Jadwal & slot</h1><p>Buka slot waktu ketika Anda tersedia menguji. Murid hanya bisa memilih slot yang masih kosong, jadi jadwal tidak akan bentrok.</p></div>
      <div class="row"><button class="btn ghost" data-gen>${icon('layers')} Buat banyak slot</button><button class="btn primary" data-add>${icon('plus')} Tambah slot</button></div></div>
    <div class="cols cal-layout">
      <div class="card sticky"><div data-cal></div></div>
      <section class="card"><div data-day></div></section>
    </div>`;

  const load = async () => {
    const [a, b] = monthRange(month);
    const [s, p] = await Promise.all([
      sb.rpc('daftar_slot', { p_dari: a, p_sampai: b }),
      sb.from('pengajuan').select('id, slot_id, status, tanggal, jam_mulai, murid:profiles!pengajuan_murid_id_fkey(nama, kelas)').in('status', ['menunggu', 'disetujui', 'selesai', 'remidi']).gte('tanggal', a).lte('tanggal', b),
    ]);
    if (s.error) throw s.error;
    slots = s.data || []; bookings = p.data || [];
  };
  const showDay = (d) => {
    sel = d;
    const ds = slots.filter((s) => s.tanggal === d);
    const loose = bookings.filter((b) => b.tanggal === d && !ds.some((s) => s.id === b.slot_id));
    $('[data-day]', view).innerHTML = `
      <div class="card-head"><div><h2>${esc(fmtTanggal(d))}</h2><p>${ds.length ? `${ds.length} slot, ${ds.reduce((n, s) => n + Math.max(0, s.kapasitas - s.terpakai), 0)} tempat kosong` : 'Belum ada slot'}</p></div>
        <button class="btn sm ghost" data-add-day>${icon('plus')} Slot di tanggal ini</button></div>
      ${ds.length ? `<div class="slot-list">${ds.map((s) => {
        const bs = bookings.filter((b) => b.slot_id === s.id);
        const mine = s.guru_id === state.profile.id;
        return slotCard(s, {
          tag: 'div', cls: 'static',
          aside: `${sisaBadge(s)}${(mine || isAdmin()) ? `<button class="btn icon sm ghost" data-del="${s.id}" aria-label="Hapus slot" title="Hapus slot">${icon('trash')}</button>` : ''}`,
          extra: bs.length
            ? bs.map((b) => `<a href="#/guru/pengajuan/${b.id}" class="booking">${badge(b.status)}<b>${esc(b.murid?.nama)}</b><span class="muted">${esc(b.murid?.kelas || '')}</span></a>`).join('')
            : '<span class="muted small">Belum ada murid</span>',
        });
      }).join('')}</div>` : emptyState('calendar', 'Belum ada slot', 'Tambahkan slot agar murid bisa memilih jadwal di tanggal ini.')}
      ${loose.length ? `<h3 class="mt">Presentasi lain di tanggal ini</h3><div class="list">${loose.map((b) => `<a href="#/guru/pengajuan/${b.id}" class="booking">${badge(b.status)}<b>${esc(b.murid?.nama)}</b><span class="muted">${fmtJam(b.jam_mulai)}</span></a>`).join('')}</div>` : ''}`;
    $('[data-add-day]', view).addEventListener('click', () => formSlot(d));
    $$('[data-del]', view).forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmDialog('Hapus slot ini?', { ok: 'Hapus', danger: true }))) return;
      const { error } = await sb.from('slots').delete().eq('id', b.dataset.del);
      if (error) return toast(errMsg(error), 'err');
      toast('Slot dihapus.'); await refresh();
    }));
  };
  let cal;
  const refresh = async () => { await load(); cal.redraw(); showDay(sel); };
  await load();
  cal = calendar($('[data-cal]', view), {
    month, selected: sel,
    getDay: (d) => {
      const ds = slots.filter((s) => s.tanggal === d);
      const bk = bookings.filter((b) => b.tanggal === d);
      return { click: true, has: ds.length > 0 || bk.length > 0, dots: [...ds.map((s) => (s.terpakai >= s.kapasitas ? 'full' : 'ok')), ...bk.filter((b) => !b.slot_id).map(() => 'mine')] };
    },
    onMonth: async (m) => { month = m; await load(); },
    onPick: showDay,
    legend: '<span><i style="background:var(--mint)"></i>Slot kosong</span><span><i style="background:var(--rose)"></i>Slot terisi penuh</span>',
  });
  showDay(sel);

  const formSlot = (tgl = sel) => {
    const md = modal({
      title: 'Tambah slot',
      body: `<form class="stack" id="fs">
        <div class="field"><label>Tanggal</label><input class="input" type="date" name="tanggal" value="${tgl}" min="${today()}" required /></div>
        <div class="grid-2"><div class="field"><label>Jam mulai</label><input class="input" type="time" name="mulai" value="08:00" required /></div>
          <div class="field"><label>Jam selesai</label><input class="input" type="time" name="selesai" value="08:20" required /></div></div>
        <div class="grid-2"><div class="field"><label>Ruang</label><input class="input" name="ruang" placeholder="Lab RPL 1" /></div>
          <div class="field"><label>Kapasitas murid</label><input class="input" type="number" name="kapasitas" value="1" min="1" max="50" /></div></div>
        <div class="field"><label>Catatan <span class="muted">(opsional)</span></label><input class="input" name="catatan" placeholder="Mis. daring via Meet" /></div>
      </form>`,
      footer: '<button class="btn ghost" data-close>Batal</button><button class="btn primary" data-save>Simpan slot</button>',
    });
    $('[data-save]', md.el).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
      const f = Object.fromEntries(new FormData($('#fs', md.el)));
      if (!f.tanggal || f.selesai <= f.mulai) return toast('Periksa tanggal dan jam. Jam selesai harus setelah jam mulai.', 'err');
      const { error } = await sb.from('slots').insert({ tanggal: f.tanggal, jam_mulai: f.mulai, jam_selesai: f.selesai, ruang: f.ruang || null, kapasitas: Number(f.kapasitas) || 1, catatan: f.catatan || null });
      if (error) return toast(errMsg(error), 'err');
      md.close(); toast('Slot ditambahkan.'); sel = f.tanggal; cal.select(sel); await refresh();
    }));
  };

  const formGen = () => {
    const md = modal({
      title: 'Buat banyak slot sekaligus',
      wide: true,
      body: `<form class="stack" id="fg">
        <p class="muted small">Slot dibuat berurutan dari jam mulai sampai jam selesai, di setiap hari yang dicentang dalam rentang tanggal.</p>
        <div class="grid-2"><div class="field"><label>Dari tanggal</label><input class="input" type="date" name="dari" value="${today()}" min="${today()}" required /></div>
          <div class="field"><label>Sampai tanggal</label><input class="input" type="date" name="sampai" value="${today()}" min="${today()}" required /></div></div>
        <div class="field"><span class="label">Hari</span><div class="seg" data-hari>${['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((h, i) => `<button type="button" data-h="${i}" class="${i >= 1 && i <= 5 ? 'on' : ''}">${h}</button>`).join('')}</div></div>
        <div class="grid-3"><div class="field"><label>Jam mulai</label><input class="input" type="time" name="mulai" value="08:00" /></div>
          <div class="field"><label>Jam selesai</label><input class="input" type="time" name="selesai" value="12:00" /></div>
          <div class="field"><label>Durasi per sesi (menit)</label><input class="input" type="number" name="durasi" value="20" min="5" max="240" /></div></div>
        <div class="grid-3"><div class="field"><label>Jeda antarsesi (menit)</label><input class="input" type="number" name="jeda" value="0" min="0" max="120" /></div>
          <div class="field"><label>Ruang</label><input class="input" name="ruang" placeholder="Lab RPL 1" /></div>
          <div class="field"><label>Kapasitas per slot</label><input class="input" type="number" name="kapasitas" value="1" min="1" max="50" /></div></div>
        <div class="callout info small" data-prev>${icon('info')}<span></span></div>
      </form>`,
      footer: '<button class="btn ghost" data-close>Batal</button><button class="btn primary" data-save>Buat slot</button>',
    });
    const fg = $('#fg', md.el);
    $$('[data-h]', fg).forEach((b) => b.addEventListener('click', () => { b.classList.toggle('on'); prev(); }));
    const compute = () => {
      const f = Object.fromEntries(new FormData(fg));
      const hari = $$('[data-h].on', fg).map((b) => Number(b.dataset.h));
      const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
      const toStr = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
      const dur = Number(f.durasi) || 20; const jeda = Number(f.jeda) || 0;
      const out = [];
      if (!f.dari || !f.sampai || f.sampai < f.dari) return out;
      for (let d = parseDate(f.dari); isoDate(d) <= f.sampai && out.length < 600; d.setDate(d.getDate() + 1)) {
        if (!hari.includes(d.getDay())) continue;
        for (let t = toMin(f.mulai); t + dur <= toMin(f.selesai); t += dur + jeda) {
          out.push({ tanggal: isoDate(d), jam_mulai: toStr(t), jam_selesai: toStr(t + dur), ruang: f.ruang || null, kapasitas: Number(f.kapasitas) || 1 });
        }
      }
      return out;
    };
    const prev = () => { const n = compute(); $('[data-prev] span', fg).textContent = n.length ? `Akan dibuat ${n.length} slot.` : 'Tidak ada slot yang terbentuk. Periksa tanggal, hari, dan jam.'; };
    fg.addEventListener('input', prev); prev();
    $('[data-save]', md.el).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
      const rows = compute();
      if (!rows.length) return toast('Tidak ada slot untuk dibuat.', 'err');
      const { error } = await sb.from('slots').insert(rows);
      if (error) return toast(errMsg(error), 'err');
      md.close(); toast(`${rows.length} slot dibuat.`);
      sel = rows[0].tanggal; cal.select(sel); await refresh();
    }));
  };

  $('[data-add]', view).addEventListener('click', () => formSlot());
  $('[data-gen]', view).addEventListener('click', formGen);
}

// =====================================================================
// Daftar murid + reset password
// =====================================================================
export async function daftarMurid(view, ctx) {
  const { data, error } = await sb.from('profiles').select('*').eq('role', 'murid').order('kelas').order('nama');
  if (error) throw error;
  const all = data || [];
  const { data: aj } = await sb.from('pengajuan').select('murid_id, status, created_at').order('created_at', { ascending: false });
  const last = {};
  (aj || []).forEach((p) => { if (!last[p.murid_id]) last[p.murid_id] = p.status; });
  const kelas = [...new Set(all.map((r) => r.kelas).filter(Boolean))].sort();
  const f = { q: '', kelas: '' };

  view.innerHTML = `
    <div class="page-head"><div><h1>Murid</h1><p>${all.length} murid terdaftar. Reset password murid yang lupa dengan verifikasi tanggal lahir.</p></div></div>
    <div class="filters">
      <select class="select" data-kelas><option value="">Semua kelas</option>${kelas.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      <input class="input" type="search" placeholder="Cari nama atau NIS" data-q />
    </div>
    <div data-list></div>`;
  const draw = () => {
    const q = f.q.toLowerCase();
    const rows = all.filter((r) => (!f.kelas || r.kelas === f.kelas) && (!q || `${r.nama} ${r.nis}`.toLowerCase().includes(q)));
    $('[data-list]', view).innerHTML = rows.length ? `<div class="table-wrap"><table class="t">
      <thead><tr><th>Murid</th><th>DUDI</th><th>Profil</th><th>Status terakhir</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr>
        <td>${who(r)}</td><td class="small">${esc(r.dudi || '-')}</td>
        <td class="small">${r.kompleksitas ? `${esc(r.kompleksitas)} / ${esc(r.porsi)}` : '<span class="muted">Belum lengkap</span>'}</td>
        <td>${last[r.id] ? badge(last[r.id]) : '<span class="muted small">Belum mengajukan</span>'}</td>
        <td class="num"><div class="row" style="justify-content:flex-end;gap:6px">
          <button class="btn sm ghost" data-edit="${r.id}">${icon('edit')} Ubah</button>
          <button class="btn sm ghost" data-reset="${r.id}">${icon('key')} Reset password</button>
          ${isAdmin() ? `<button class="btn sm ghost" data-hapus="${r.id}" aria-label="Hapus akun">${icon('trash')}</button>` : ''}
        </div></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card">${emptyState('users', 'Tidak ada murid', 'Murid mendaftar sendiri dari halaman awal.')}</div>`;
    $$('[data-reset]', view).forEach((b) => b.addEventListener('click', () => resetPw(all.find((x) => x.id === b.dataset.reset))));
    $$('[data-edit]', view).forEach((b) => b.addEventListener('click', () => editMurid(all.find((x) => x.id === b.dataset.edit))));
    $$('[data-hapus]', view).forEach((b) => b.addEventListener('click', async () => {
      const m = all.find((x) => x.id === b.dataset.hapus);
      if (!(await confirmDialog(`Hapus akun <b>${esc(m.nama)}</b> beserta semua pengajuan dan nilainya? Tindakan ini tidak bisa dibatalkan.`, { ok: 'Hapus akun', danger: true }))) return;
      try { await callAdmin({ action: 'delete_user', user_id: m.id }); toast('Akun dihapus.'); ctx.go('#/guru/murid'); } catch (e) { toast(errMsg(e), 'err'); }
    }));
  };
  $('[data-q]', view).addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  $('[data-kelas]', view).addEventListener('change', (e) => { f.kelas = e.target.value; draw(); });
  draw();

  function resetPw(m) {
    const md = modal({
      title: `Reset password ${m.nama}`,
      body: `<form class="stack" id="fr" novalidate>
        <p class="small muted">Minta murid menyebutkan tanggal lahirnya. Password hanya direset bila tanggal lahir cocok dengan data pendaftaran.</p>
        <div class="field"><label for="f-tl">Tanggal lahir murid</label><input class="input" id="f-tl" type="date" name="tgl" required /></div>
        ${pwField('pw', 'Password baru', 'new-password')}
      </form>`,
      footer: '<button class="btn ghost" data-close>Batal</button><button class="btn primary" data-save>Reset password</button>',
    });
    pwToggle(md.el);
    $('[data-save]', md.el).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
      const fr = $('#fr', md.el);
      if (!fr.tgl.value) return toast('Isi tanggal lahir.', 'err');
      if (fr.pw.value.length < 6) return toast('Password minimal 6 karakter.', 'err');
      try {
        await callAdmin({ action: 'reset_password', user_id: m.id, tgl_lahir: fr.tgl.value, password: fr.pw.value });
        md.close(); toast(`Password ${m.nama} direset. Beritahukan password baru ke murid.`);
      } catch (err) { toast(errMsg(err), 'err'); }
    }));
  }

  function editMurid(m) {
    const kelasList = [...new Set([...(state.settings.daftar_kelas || []), m.kelas].filter(Boolean))];
    const opt = (obj, v) => `<option value="">-</option>` + Object.keys(obj).map((k) => `<option ${v === k ? 'selected' : ''}>${k}</option>`).join('');
    const md = modal({
      title: `Ubah data ${m.nama}`,
      wide: true,
      body: `<form class="stack" id="fe">
        <div class="grid-2"><div class="field"><label>Nama</label><input class="input" name="nama" value="${esc(m.nama)}" /></div>
          <div class="field"><label>Kelas</label><select class="select" name="kelas">${kelasList.map((k) => `<option ${k === m.kelas ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div></div>
        <div class="grid-2"><div class="field"><label>NIS</label><input class="input" value="${esc(m.nis)}" readonly /><span class="hint">NIS dipakai untuk login dan tidak bisa diubah.</span></div>
          <div class="field"><label>Tanggal lahir</label><input class="input" type="date" name="tgl_lahir" value="${esc(m.tgl_lahir || '')}" /></div></div>
        <div class="field"><label>Tempat PKL (DUDI)</label><input class="input" name="dudi" value="${esc(m.dudi || '')}" /></div>
        <div class="field"><label>Judul project</label><input class="input" name="judul" value="${esc(m.judul || '')}" /></div>
        <div class="grid-2"><div class="field"><label>Kompleksitas</label><select class="select" name="kompleksitas">${opt(KOMPLEKSITAS, m.kompleksitas)}</select></div>
          <div class="field"><label>Porsi kontribusi</label><select class="select" name="porsi">${opt(PORSI, m.porsi)}</select></div></div>
      </form>`,
      footer: '<button class="btn ghost" data-close>Batal</button><button class="btn primary" data-save>Simpan</button>',
    });
    $('[data-save]', md.el).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
      const f = Object.fromEntries(new FormData($('#fe', md.el)));
      Object.keys(f).forEach((k) => { if (f[k] === '') f[k] = null; });
      const { error } = await sb.from('profiles').update(f).eq('id', m.id);
      if (error) return toast(errMsg(error), 'err');
      md.close(); toast('Data murid tersimpan.'); ctx.go('#/guru/murid');
    }));
  }
}
