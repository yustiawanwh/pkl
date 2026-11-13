import { sb, state, toEmail, loadProfile } from '../lib/supa.js';
import { $, esc, icon, toast, errMsg, withBusy, pwField, pwToggle, ticket } from '../lib/ui.js';
import { NAMA_SEKOLAH } from '../config.js';

export function renderAuth(app, { onLogin }) {
  const kelasList = state.settings.daftar_kelas || [];
  const contoh = { status: 'disetujui', judul: 'Sistem Inventaris Gudang Berbasis Web', tanggal: nextWeekday(), jam_mulai: '09:00', jam_selesai: '09:20', ruang: 'Lab RPL 2', percobaan: 1 };

  app.innerHTML = `<div class="auth">
    <section class="auth-side">
      <div>
        <div class="brand"><div class="logo">${icon('slides')}</div><span>${esc(NAMA_SEKOLAH)} · RPL</span></div>
        <h1>Presentasi PKL, dari pengajuan sampai nilai.</h1>
        <p class="lead">Ajukan jadwal presentasi, unggah laporan dan slide, lalu pantau hasil penilaian dari guru di satu tempat.</p>
        <div class="auth-steps"><ol>
          <li><span class="n">1</span><span><b>Daftar dan lengkapi data diri</b>, termasuk tempat PKL dan judul project.</span></li>
          <li><span class="n">2</span><span><b>Ajukan jadwal</b> dengan draft laporan, PPT, dan lembar bimbingan.</span></li>
          <li><span class="n">3</span><span><b>Presentasi dan lihat hasilnya</b>, lengkap dengan feedback guru.</span></li>
        </ol></div>
      </div>
      <div class="auth-ticket">${ticket(contoh)}</div>
    </section>
    <section class="auth-main">
      <div class="auth-card stack-lg">
        <div class="tabs" role="tablist">
          <button role="tab" class="on" data-tab="masuk">Masuk</button>
          <button role="tab" data-tab="daftar">Daftar murid</button>
        </div>

        <form class="stack" data-form="masuk" novalidate>
          <div><h2>Selamat datang kembali</h2><p class="muted" style="margin-top:6px">Murid masuk dengan NIS. Guru masuk dengan username atau email.</p></div>
          <div class="field"><label for="f-id">NIS, username, atau email</label><input class="input" id="f-id" name="id" autocomplete="username" required /></div>
          ${pwField('password', 'Password')}
          <button class="btn primary block" type="submit">Masuk</button>
          <p class="small muted">Lupa password? Murid dapat meminta guru untuk meresetnya dengan verifikasi tanggal lahir.</p>
        </form>

        <form class="stack hidden" data-form="daftar" novalidate>
          <div><h2>Daftar akun murid</h2><p class="muted" style="margin-top:6px">Tanggal lahir dipakai guru untuk memverifikasi saat kamu lupa password.</p></div>
          <div class="field"><label for="f-nama">Nama lengkap</label><input class="input" id="f-nama" name="nama" autocomplete="name" required /></div>
          <div class="grid-2">
            <div class="field"><label for="f-nis">NIS</label><input class="input" id="f-nis" name="nis" placeholder="Contoh: 9999.9999/999.99" required /></div>
            <div class="field"><label for="f-kelas">Kelas</label>
              ${kelasList.length
                ? `<select class="select" id="f-kelas" name="kelas" required><option value="">Pilih kelas</option>${kelasList.map((k) => `<option>${esc(k)}</option>`).join('')}</select>`
                : '<input class="input" id="f-kelas" name="kelas" placeholder="XII RPL 1" required />'}
            </div>
          </div>
          <div class="field"><label for="f-tgl">Tanggal lahir</label><input class="input" id="f-tgl" name="tgl_lahir" type="date" required max="${new Date().toISOString().slice(0, 10)}" /></div>
          <div class="grid-2">
            ${pwField('password', 'Password', 'new-password')}
            ${pwField('password2', 'Ulangi password', 'new-password')}
          </div>
          <button class="btn primary block" type="submit">Buat akun</button>
        </form>
      </div>
    </section>
  </div>`;

  pwToggle(app);
  app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    app.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
    app.querySelectorAll('[data-form]').forEach((f) => f.classList.toggle('hidden', f.dataset.form !== b.dataset.tab));
    app.querySelector(`[data-form="${b.dataset.tab}"] input`)?.focus();
  }));

  const fMasuk = $('[data-form="masuk"]', app);
  fMasuk.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(fMasuk));
    if (!fd.id.trim() || !fd.password) return toast('Isi NIS/username dan password.', 'err');
    withBusy(fMasuk.querySelector('[type=submit]'), async () => {
      const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(fd.id), password: fd.password });
      if (error) return toast(errMsg(error), 'err');
      state.session = data.session;
      await loadProfile();
      toast(`Halo, ${state.profile.nama.split(' ')[0]}!`);
      location.hash = '#/';
      onLogin();
    });
  });

  const fDaftar = $('[data-form="daftar"]', app);
  fDaftar.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(fDaftar));
    const nis = (fd.nis || '').trim();
    if (!fd.nama.trim() || !nis || !fd.kelas || !fd.tgl_lahir) return toast('Lengkapi semua isian.', 'err');
    if (!/^[0-9A-Za-z](?:[0-9A-Za-z]|[.\/\-](?=[0-9A-Za-z])){2,29}$/.test(nis))
      return toast('NIS 3–30 karakter: huruf, angka, titik, garis miring (/), atau minus. Tidak boleh diawali/diakhiri tanda baca.', 'err');
    if (fd.password.length < 6) return toast('Password minimal 6 karakter.', 'err');
    if (fd.password !== fd.password2) return toast('Ulangi password belum sama.', 'err');
    withBusy(fDaftar.querySelector('[type=submit]'), async () => {
      const { data, error } = await sb.auth.signUp({
        email: toEmail(nis),
        password: fd.password,
        options: { data: { nis, nama: fd.nama.trim(), kelas: fd.kelas, tgl_lahir: fd.tgl_lahir } },
      });
      if (error) return toast(errMsg(error), 'err');
      if (!data.session) {
        // Bila "Confirm email" masih aktif di Supabase
        return toast('Akun dibuat, tetapi konfirmasi email masih aktif di Supabase. Minta admin menonaktifkannya.', 'err');
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) return toast('NIS ini sudah terdaftar. Silakan masuk.', 'err');
      state.session = data.session;
      await loadProfile();
      toast('Akun berhasil dibuat. Lengkapi data dirimu.');
      location.hash = '#/murid/lengkapi';
      onLogin();
    });
  });
}

function nextWeekday() {
  const d = new Date(); d.setDate(d.getDate() + 3);
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
