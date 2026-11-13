import { sb, state, saveSetting, callAdmin, isAdmin } from '../lib/supa.js';
import { $, $$, esc, icon, toast, errMsg, withBusy, confirmDialog, modal, pwField, pwToggle, initials } from '../lib/ui.js';

export async function pengaturan(view, ctx) {
  const mode = state.settings.mode_penguji === 'banyak' ? 'banyak' : 'tunggal';
  let kelas = [...(state.settings.daftar_kelas || [])];
  let poin = structuredClone(state.settings.poin_presentasi || []);

  view.innerHTML = `
    <div class="page-head"><div><h1>Pengaturan</h1><p>Atur cara penilaian, daftar kelas, poin presentasi, dan akun guru.</p></div></div>
    <div class="stack-lg">
      <section class="card stack">
        <div><h2>Mode penguji</h2><p class="muted small" style="margin-top:4px">Menentukan siapa yang mengisi Komponen A pada setiap presentasi.</p></div>
        <div class="grid-2">
          ${[['tunggal', 'Penguji tunggal', 'Satu guru mengisi seluruh rubrik. Nilai A langsung dari guru tersebut.'],
            ['banyak', 'Beberapa penguji', 'Setiap guru penguji mengisi Komponen A sendiri. Nilai A adalah rata-rata semua penguji; Komponen B dan evaluasi diisi bersama.']]
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
