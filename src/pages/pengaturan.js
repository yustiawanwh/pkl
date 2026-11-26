import { sb, state, saveSetting, callAdmin, isAdmin, getKKM } from '../lib/supa.js';
import { $, $$, esc, icon, toast, errMsg, withBusy, confirmDialog, modal, pwField, pwToggle, initials } from '../lib/ui.js';

export async function pengaturan(view, ctx) {
  const mode = state.settings.mode_penguji === 'banyak' ? 'banyak' : 'tunggal';
  let kelas = [...(state.settings.daftar_kelas || [])];
  let poin = structuredClone(state.settings.poin_presentasi || []);
  const pg = state.settings.pengumuman || { aktif: false, isi: '' };
  const kp = state.settings.ttd_kaprog || { tampil: false, nama: '' };
  const rp = state.settings.rekap_publik || { aktif: true };
  const rekapUrl = `${location.origin}${location.pathname.replace(/index\.html$/, '')}rekap`;

  view.innerHTML = `
    <div class="page-head"><div><h1>Pengaturan</h1><p>Atur cara penilaian, daftar kelas, poin presentasi, dan akun guru.</p></div></div>
    <div class="stack-lg">
      <section class="card stack" data-pg>
        <div class="card-title-row"><div><h2>Pengumuman di halaman awal</h2><p class="muted small mt-xs">Tampil di halaman masuk dan bisa dibaca siapa saja, termasuk yang belum login. Jangan tulis nama atau nilai murid.</p></div>
          <label class="switch on-primary"><input type="checkbox" name="pg_aktif" ${pg.aktif ? 'checked' : ''} /> Tampilkan</label></div>
        <textarea class="textarea" name="pg_isi" maxlength="500" placeholder="Mis. Batas pengajuan jadwal presentasi: Jumat, 20 November 2026.">${esc(pg.isi || '')}</textarea>
        <div class="row between"><span class="hint" data-pg-count></span><button class="btn primary" data-save-pg>${icon('check')} Simpan pengumuman</button></div>
      </section>

      <section class="card stack" data-rp>
        <div class="card-title-row"><div><h2>Halaman rekap publik</h2><p class="muted small mt-xs">Rekap presentasi yang bisa dibuka siapa saja tanpa login dan hanya untuk dilihat. Menampilkan nama, kelas, DUDI, judul, tanggal, tahap, serta nilai akhir dan predikat yang sudah diumumkan. NIS, tanggal lahir, berkas, dan catatan guru tidak pernah ditampilkan.</p></div>
          <label class="switch on-primary"><input type="checkbox" name="rp_aktif" ${rp.aktif !== false ? 'checked' : ''} /> Aktifkan</label></div>
        <div class="row" style="flex-wrap:wrap">
          <input class="input" readonly value="${esc(rekapUrl)}" aria-label="Alamat rekap publik" style="flex:1 1 280px" data-rp-url />
          <button class="btn ghost" data-rp-copy type="button">${icon('clipboard')} Salin alamat</button>
          <a class="btn ghost" href="#/rekap" target="_blank" rel="noopener">${icon('eye')} Buka</a>
        </div>
      </section>

      <section class="card stack" data-kp>
        <div class="card-title-row"><div><h2>Tanda tangan laporan cetak</h2><p class="muted small mt-xs">Laporan selalu memuat tanda tangan Guru Penguji (nama guru yang mencetak). Kolom Kepala Program Keahlian bersifat opsional.</p></div>
          <label class="switch on-primary"><input type="checkbox" name="kp_tampil" ${kp.tampil ? 'checked' : ''} /> Tampilkan Kepala Program</label></div>
        <div class="field ${kp.tampil ? '' : 'hidden'}" data-kp-nama><label for="f-kp">Nama Kepala Program Keahlian</label>
          <input class="input" id="f-kp" name="kp_nama" value="${esc(kp.nama || '')}" placeholder="Kosongkan bila ingin ditulis tangan" /></div>
        <div class="row" style="justify-content:flex-end"><button class="btn primary" data-save-kp>${icon('check')} Simpan</button></div>
      </section>

      <section class="card stack" data-kkm>
        <div><h2>KKM (Kriteria Ketuntasan Minimal)</h2><p class="muted small mt-xs">Nilai akhir di bawah KKM ditandai merah di halaman penilaian, rekap, riwayat, hasil murid, laporan cetak, dan ekspor Excel.</p></div>
        <div class="row">
          <input class="input" type="number" name="kkm" min="1" max="100" step="1" value="${getKKM()}" style="width:120px" aria-label="Nilai KKM" />
          <button class="btn primary" data-save-kkm>${icon('check')} Simpan KKM</button>
        </div>
      </section>

      <section class="card stack">
        <div><h2>Mode penguji</h2><p class="muted small" style="margin-top:4px">Menentukan siapa yang mengisi Komponen A pada setiap presentasi.</p></div>
        <div class="grid-2">
          ${[['tunggal', 'Penguji tunggal', 'Satu guru mengisi seluruh rubrik. Nilai A langsung dari guru tersebut. Setiap slot dan murid punya satu penguji.'],
            ['banyak', 'Beberapa penguji', 'Setiap guru penguji mengisi Komponen A sendiri. Nilai A adalah rata-rata semua penguji; Komponen B dan evaluasi diisi bersama. Setiap slot dan murid bisa punya hingga 5 penguji.']]
            .map(([k, t, d]) => `<label class="slot ${mode === k ? 'on' : ''}" style="align-items:flex-start;cursor:pointer">
              <input type="radio" name="mode" value="${k}" ${mode === k ? 'checked' : ''} style="margin-top:4px" />
              <span class="info"><b style="color:var(--ink);font-size:15px">${t}</b><br>${d}</span></label>`).join('')}
        </div>
      </section>

      <section class="card stack">
        <div><h2>Daftar kelas</h2><p class="muted small" style="margin-top:4px">Pilihan kelas pada form pendaftaran dan data diri murid.</p></div>
        <div class="chips" data-chips></div>
        <form class="row" data-add-kelas><input class="input" name="k" placeholder="Mis. XII RPL 4" style="max-width:260px" /><button class="btn ghost" type="submit">${icon('plus')} Tambah kelas</button></form>
      </section>

      <section class="card stack">
        <div class="row between"><div><h2>Poin-poin presentasi</h2><p class="muted small" style="margin-top:4px">Ditampilkan ke murid sebagai panduan menyusun slide. Urutan bagian bisa diubah.</p></div>
          <button class="btn primary" data-save-poin>${icon('check')} Simpan poin presentasi</button></div>
        <div class="stack" data-poin></div>
        <button class="btn ghost" data-add-sec style="justify-self:start">${icon('plus')} Tambah bagian</button>
      </section>

      ${isAdmin() ? `<section class="card stack">
        <div class="row between"><div><h2>Akun guru</h2><p class="muted small" style="margin-top:4px">Guru masuk dengan username dan password yang dibuat di sini.</p></div>
          <button class="btn primary" data-add-guru>${icon('plus')} Tambah guru</button></div>
        <div data-guru></div>
      </section>` : ''}
    </div>`;

  // ---- pengumuman
  const pgEl = $('[data-pg]', view);
  const cnt = () => ($('[data-pg-count]', pgEl).textContent = `${pgEl.querySelector('[name=pg_isi]').value.length}/500 karakter`);
  pgEl.querySelector('[name=pg_isi]').addEventListener('input', cnt); cnt();
  $('[data-save-pg]', pgEl).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    const isi = pgEl.querySelector('[name=pg_isi]').value.trim();
    const aktif = pgEl.querySelector('[name=pg_aktif]').checked;
    if (aktif && !isi) return toast('Tulis isi pengumuman, atau matikan "Tampilkan".', 'err');
    try { await saveSetting('pengumuman', { aktif, isi }); toast(aktif ? 'Pengumuman tampil di halaman awal.' : 'Pengumuman disimpan dan disembunyikan.'); }
    catch (err) { toast(errMsg(err), 'err'); }
  }));

  // ---- rekap publik
  const rpEl = $('[data-rp]', view);
  rpEl.querySelector('[name=rp_aktif]').addEventListener('change', async (e) => {
    const aktif = e.target.checked;
    try { await saveSetting('rekap_publik', { aktif }); toast(aktif ? 'Halaman rekap publik aktif.' : 'Halaman rekap publik dinonaktifkan.'); }
    catch (err) { e.target.checked = !aktif; toast(errMsg(err), 'err'); }
  });
  $('[data-rp-copy]', rpEl).addEventListener('click', async () => {
    const inp = $('[data-rp-url]', rpEl);
    try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand('copy'); }
    toast('Alamat rekap disalin.');
  });

  // ---- KKM
  const kkmEl = $('[data-kkm]', view);
  $('[data-save-kkm]', kkmEl).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    const v = Number(kkmEl.querySelector('[name=kkm]').value);
    if (!Number.isFinite(v) || v < 1 || v > 100) return toast('KKM harus angka 1 sampai 100.', 'err');
    try { await saveSetting('kkm', Math.round(v * 100) / 100); toast(`KKM disimpan: ${v}.`); }
    catch (err) { toast(errMsg(err), 'err'); }
  }));

  // ---- tanda tangan laporan
  const kpEl = $('[data-kp]', view);
  kpEl.querySelector('[name=kp_tampil]').addEventListener('change', (e) => $('[data-kp-nama]', kpEl).classList.toggle('hidden', !e.target.checked));
  $('[data-save-kp]', kpEl).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    const val = { tampil: kpEl.querySelector('[name=kp_tampil]').checked, nama: kpEl.querySelector('[name=kp_nama]').value.trim() };
    try { await saveSetting('ttd_kaprog', val); toast(val.tampil ? 'Kolom Kepala Program ditampilkan di laporan.' : 'Kolom Kepala Program disembunyikan.'); }
    catch (err) { toast(errMsg(err), 'err'); }
  }));

  // ---- mode penguji
  $$('[name=mode]', view).forEach((r) => r.addEventListener('change', async () => {
    try {
      await saveSetting('mode_penguji', r.value);
      $$('[name=mode]', view).forEach((x) => x.closest('label').classList.toggle('on', x.checked));
      toast(r.value === 'banyak' ? 'Mode beberapa penguji aktif.' : 'Mode penguji tunggal aktif.');
    } catch (e) { toast(errMsg(e), 'err'); }
  }));

  // ---- kelas
  const drawKelas = () => {
    $('[data-chips]', view).innerHTML = kelas.length ? kelas.map((k, i) => `<span class="chip">${esc(k)}<button data-rm="${i}" aria-label="Hapus ${esc(k)}">${icon('x')}</button></span>`).join('') : '<span class="muted small">Belum ada kelas. Murid akan mengetik kelasnya sendiri.</span>';
    $$('[data-rm]', view).forEach((b) => b.addEventListener('click', async () => { kelas.splice(Number(b.dataset.rm), 1); await simpanKelas(); }));
  };
  const simpanKelas = async () => { try { await saveSetting('daftar_kelas', kelas); drawKelas(); toast('Daftar kelas tersimpan.'); } catch (e) { toast(errMsg(e), 'err'); } };
  $('[data-add-kelas]', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = e.target.k.value.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (kelas.includes(v)) return toast('Kelas sudah ada.', 'err');
    kelas.push(v); e.target.reset(); await simpanKelas();
  });
  drawKelas();

  // ---- poin presentasi
  const drawPoin = () => {
    $('[data-poin]', view).innerHTML = poin.map((s, i) => `
      <div class="editor-sec" data-sec="${i}">
        <div class="row">
          <b class="muted" style="width:22px">${i + 1}</b>
          <input class="input" data-judul value="${esc(s.judul)}" placeholder="Judul bagian" aria-label="Judul bagian ${i + 1}" />
          <button class="btn icon ghost" data-up ${i === 0 ? 'disabled' : ''} aria-label="Naikkan">${icon('arrowup')}</button>
          <button class="btn icon ghost" data-down ${i === poin.length - 1 ? 'disabled' : ''} aria-label="Turunkan">${icon('arrowdown')}</button>
          <button class="btn icon ghost" data-del aria-label="Hapus bagian">${icon('trash')}</button>
        </div>
        <div class="stack" style="gap:6px;padding-left:32px">
          ${(s.poin || []).map((p, j) => `<div class="row"><input class="input" data-p="${j}" value="${esc(p)}" aria-label="Poin" /><button class="btn icon ghost" data-delp="${j}" aria-label="Hapus poin">${icon('x')}</button></div>`).join('')}
          <button class="btn sm ghost" data-addp style="justify-self:start">${icon('plus')} Tambah poin</button>
        </div>
      </div>`).join('');
    $$('[data-sec]', view).forEach((el) => {
      const i = Number(el.dataset.sec);
      $('[data-judul]', el).addEventListener('input', (e) => (poin[i].judul = e.target.value));
      $$('[data-p]', el).forEach((inp) => inp.addEventListener('input', (e) => (poin[i].poin[Number(inp.dataset.p)] = e.target.value)));
      $$('[data-delp]', el).forEach((b) => b.addEventListener('click', () => { poin[i].poin.splice(Number(b.dataset.delp), 1); drawPoin(); }));
      $('[data-addp]', el).addEventListener('click', () => { (poin[i].poin ||= []).push(''); drawPoin(); $$(`[data-sec="${i}"] [data-p]`, view).pop()?.focus(); });
      $('[data-up]', el).addEventListener('click', () => { [poin[i - 1], poin[i]] = [poin[i], poin[i - 1]]; drawPoin(); });
      $('[data-down]', el).addEventListener('click', () => { [poin[i + 1], poin[i]] = [poin[i], poin[i + 1]]; drawPoin(); });
      $('[data-del]', el).addEventListener('click', async () => {
        if (await confirmDialog(`Hapus bagian "${esc(poin[i].judul)}"?`, { ok: 'Hapus', danger: true })) { poin.splice(i, 1); drawPoin(); }
      });
    });
  };
  $('[data-add-sec]', view).addEventListener('click', () => { poin.push({ judul: '', poin: [''] }); drawPoin(); $$('[data-judul]', view).pop()?.focus(); });
  $('[data-save-poin]', view).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    const clean = poin.map((s) => ({ judul: s.judul.trim(), poin: (s.poin || []).map((p) => p.trim()).filter(Boolean) })).filter((s) => s.judul);
    try { await saveSetting('poin_presentasi', clean); poin = structuredClone(clean); drawPoin(); toast('Poin presentasi tersimpan.'); }
    catch (err) { toast(errMsg(err), 'err'); }
  }));
  drawPoin();

  // ---- akun guru (admin)
  if (isAdmin()) {
    const drawGuru = async () => {
      const { data } = await sb.from('profiles').select('id, nama, username, role').in('role', ['guru', 'admin']).order('nama');
      $('[data-guru]', view).innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th></th></tr></thead><tbody>
        ${(data || []).map((g) => `<tr><td><div class="row"><span class="avatar">${esc(initials(g.nama))}</span><b>${esc(g.nama)}</b></div></td><td>${esc(g.username || '-')}</td>
          <td>${g.role === 'admin' ? 'Admin' : 'Guru'}</td>
          <td class="num">${g.id === state.profile.id ? '<span class="muted small">Akun Anda</span>' : `<div class="row" style="justify-content:flex-end;gap:6px">
            <button class="btn sm ghost" data-rp="${g.id}" data-n="${esc(g.nama)}">${icon('key')} Reset password</button>
            <button class="btn sm ghost" data-dg="${g.id}" data-n="${esc(g.nama)}" aria-label="Hapus">${icon('trash')}</button></div>`}</td></tr>`).join('')}
        </tbody></table></div>`;
      $$('[data-rp]', view).forEach((b) => b.addEventListener('click', () => {
        const md = modal({
          title: `Reset password ${b.dataset.n}`,
          body: `<form class="stack" id="fp">${pwField('pw', 'Password baru', 'new-password')}</form>`,
          footer: '<button class="btn ghost" data-close>Batal</button><button class="btn primary" data-save>Reset password</button>',
        });
        pwToggle(md.el);
        $('[data-save]', md.el).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
          const pw = $('#fp', md.el).pw.value;
          if (pw.length < 6) return toast('Password minimal 6 karakter.', 'err');
          try { await callAdmin({ action: 'reset_password', user_id: b.dataset.rp, password: pw }); md.close(); toast('Password direset.'); }
          catch (err) { toast(errMsg(err), 'err'); }
        }));
      }));
      $$('[data-dg]', view).forEach((b) => b.addEventListener('click', async () => {
        if (!(await confirmDialog(`Hapus akun <b>${b.dataset.n}</b>? Slot jadwal milik akun ini tetap ada tanpa nama guru.`, { ok: 'Hapus akun', danger: true }))) return;
        try { await callAdmin({ action: 'delete_user', user_id: b.dataset.dg }); toast('Akun dihapus.'); drawGuru(); } catch (err) { toast(errMsg(err), 'err'); }
      }));
    };
    $('[data-add-guru]', view).addEventListener('click', () => {
      const md = modal({
        title: 'Tambah akun guru',
        body: `<form class="stack" id="fg" novalidate>
          <div class="field"><label>Nama lengkap</label><input class="input" name="nama" required /></div>
          <div class="field"><label>Username</label><input class="input" name="username" required pattern="[a-z0-9._-]{3,32}" autocapitalize="off" />
            <span class="hint">Huruf kecil, angka, titik, - atau _. Dipakai untuk login.</span></div>
          ${pwField('password', 'Password awal', 'new-password')}
          <div class="field"><label>Peran</label><select class="select" name="role"><option value="guru">Guru</option><option value="admin">Admin (bisa mengelola akun guru)</option></select></div>
        </form>`,
        footer: '<button class="btn ghost" data-close>Batal</button><button class="btn primary" data-save>Buat akun</button>',
      });
      pwToggle(md.el);
      $('[data-save]', md.el).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
        const f = Object.fromEntries(new FormData($('#fg', md.el)));
        if (!f.nama.trim()) return toast('Isi nama guru.', 'err');
        try {
          await callAdmin({ action: 'create_user', ...f });
          md.close(); toast(`Akun ${f.username} dibuat.`); drawGuru();
        } catch (err) { toast(errMsg(err), 'err'); }
      }));
    });
    drawGuru();
  }
}
