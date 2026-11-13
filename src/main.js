import './style.css';
import { sb, state, configured, loadProfile, loadSettings, isStaff, isAdmin, profilLengkap } from './lib/supa.js';
import { $, esc, icon, initials, relatif, toast, labelTables } from './lib/ui.js';
import { NAMA_SEKOLAH } from './config.js';
import { renderAuth } from './pages/auth.js';
import * as M from './pages/murid.js';
import * as G from './pages/guru.js';
import * as N from './pages/nilai.js';
import * as S from './pages/pengaturan.js';

const app = document.getElementById('app');

const NAV = {
  murid: [
    ['#/murid/pengajuan', 'send', 'Pengajuan'],
    ['#/murid/poin', 'list', 'Poin presentasi'],
    ['#/murid/hasil', 'award', 'Hasil'],
    ['#/murid/profil', 'user', 'Data diri'],
  ],
  guru: [
    ['#/guru', 'home', 'Beranda'],
    ['#/guru/pengajuan', 'send', 'Pengajuan', 'pending'],
    ['#/guru/jadwal', 'calendar', 'Jadwal & slot'],
    ['#/guru/penilaian', 'clipboard', 'Penilaian'],
    ['#/guru/murid', 'users', 'Murid'],
    ['#/guru/rekap', 'chart', 'Rekap nilai'],
    ['#/guru/poin', 'list', 'Poin presentasi'],
    ['#/guru/pengaturan', 'settings', 'Pengaturan'],
  ],
};

const ROUTES = [
  [/^#\/murid\/lengkapi$/, 'murid', M.lengkapi],
  [/^#\/murid\/pengajuan$/, 'murid', M.pengajuan],
  [/^#\/murid\/poin$/, 'murid', M.poin],
  [/^#\/murid\/hasil$/, 'murid', M.hasil],
  [/^#\/murid\/profil$/, 'murid', M.profil],
  [/^#\/guru$/, 'staff', G.beranda],
  [/^#\/guru\/pengajuan$/, 'staff', G.daftarPengajuan],
  [/^#\/guru\/pengajuan\/(\d+)$/, 'staff', G.detailPengajuan],
  [/^#\/guru\/jadwal$/, 'staff', G.jadwal],
  [/^#\/guru\/penilaian$/, 'staff', N.daftarPenilaian],
  [/^#\/guru\/nilai\/(\d+)$/, 'staff', N.formNilai],
  [/^#\/guru\/murid$/, 'staff', G.daftarMurid],
  [/^#\/guru\/rekap$/, 'staff', N.rekap],
  [/^#\/guru\/poin$/, 'staff', M.poin],
  [/^#\/guru\/pengaturan$/, 'staff', S.pengaturan],
  [/^#\/guru\/profil$/, 'staff', M.profil],
];

export const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

function home() {
  if (!state.profile) return '#/masuk';
  if (isStaff()) return '#/guru';
  return profilLengkap() ? '#/murid/pengajuan' : '#/murid/lengkapi';
}

// ---------------- Shell ----------------
function renderShell() {
  const role = isStaff() ? 'guru' : 'murid';
  const p = state.profile;
  const nav = NAV[role].map(([h, ic, label, extra]) =>
    `<a href="${h}" data-nav="${h}">${icon(ic)}<span>${label}</span>${extra === 'pending' ? '<span class="count hidden" data-pending></span>' : ''}</a>`).join('');
  app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><div class="logo">${icon('slides')}</div><div><div class="brand-name">Presentasi PKL</div><div class="brand-sub">${esc(NAMA_SEKOLAH)}</div></div></div>
      ${role === 'guru' ? '<div class="nav-group">Menu guru</div>' : ''}
      <nav class="nav" aria-label="Menu utama">${nav}</nav>
      <div class="me">
        <a class="avatar" href="${role === 'guru' ? '#/guru/profil' : '#/murid/profil'}" title="Profil">${esc(initials(p.nama))}</a>
        <div class="me-info"><b>${esc(p.nama)}</b><span>${role === 'guru' ? (isAdmin() ? 'Admin' : 'Guru') : esc(p.kelas || 'Murid')}</span></div>
        <button class="btn icon ghost" data-logout title="Keluar" aria-label="Keluar">${icon('logout')}</button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="mobile-brand"><div class="logo">${icon('slides')}</div><div class="brand-name">Presentasi PKL</div></div>
        <button class="btn icon ghost" data-theme-toggle aria-label="Ganti tema">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
        <div class="bell"><button class="btn icon ghost" data-bell aria-label="Notifikasi">${icon('bell')}<span class="dot hidden" data-notif-count></span></button><div class="notif-pop hidden" data-notif-pop></div></div>
        <button class="btn icon ghost mobile-only" data-logout aria-label="Keluar" style="display:none">${icon('logout')}</button>
      </header>
      <main class="view" id="view" tabindex="-1"></main>
    </div>
    <nav class="bottom-nav" aria-label="Menu">${(role === 'guru' ? NAV.guru.slice(0, 4) : NAV.murid).map(([h, ic, label]) => `<a href="${h}" data-nav="${h}">${icon(ic)}<span>${label.replace(' & slot', '')}</span></a>`).join('')}
      ${role === 'guru' ? `<button type="button" data-more>${icon('list')}<span>Lainnya</span></button>` : ''}</nav>
    <div class="sheet hidden" data-sheet><div class="sheet-panel" role="dialog" aria-label="Menu lainnya">
      <div class="sheet-handle"></div>
      ${NAV.guru.slice(4).map(([h, ic, label]) => `<a href="${h}" data-nav="${h}">${icon(ic)}<span>${label}</span></a>`).join('')}
      <a href="#/guru/profil" data-nav="#/guru/profil">${icon('user')}<span>Profil saya</span></a>
      <button type="button" data-logout>${icon('logout')}<span>Keluar</span></button>
    </div></div>
  </div>`;
  app.dataset.shell = role;
  app.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', async () => { await sb.auth.signOut(); }));
  if (matchMedia('(max-width: 860px)').matches && role === 'murid') app.querySelector('.mobile-only').style.display = '';
  const sheet = app.querySelector('[data-sheet]');
  app.querySelector('[data-more]')?.addEventListener('click', () => sheet.classList.remove('hidden'));
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('a,button')) sheet.classList.add('hidden'); });
  // tabel otomatis berubah menjadi kartu di layar kecil
  new MutationObserver(() => labelTables(document.getElementById('view'))).observe(document.getElementById('view'), { childList: true, subtree: true });
  $('[data-theme-toggle]', app).addEventListener('click', (e) => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('pkl-theme', t); } catch {}
    e.currentTarget.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  });
  setupNotif();
}

function setActive(hash) {
  const more = app.querySelector('[data-more]');
  if (more) more.classList.toggle('on', NAV.guru.slice(4).some(([h]) => hash.startsWith(h)) || hash === '#/guru/profil');
  app.querySelectorAll('[data-nav]').forEach((a) => {
    const h = a.dataset.nav;
    const on = hash === h || (h !== '#/guru' && hash.startsWith(h + '/')) || (h === '#/guru/penilaian' && hash.startsWith('#/guru/nilai/'));
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ---------------- Notifikasi ----------------
let notifTimer;
async function refreshNotif() {
  if (!state.session) return;
  const { data } = await sb.from('notifikasi').select('*').order('created_at', { ascending: false }).limit(30);
  const list = data || [];
  const unread = list.filter((n) => !n.dibaca).length;
  const dot = app.querySelector('[data-notif-count]');
  if (dot) { dot.textContent = unread > 9 ? '9+' : unread; dot.classList.toggle('hidden', !unread); }
  const pop = app.querySelector('[data-notif-pop]');
  if (pop) {
    pop.innerHTML = `<header><b>Notifikasi</b>${unread ? '<button class="btn sm ghost" data-read-all>Tandai semua dibaca</button>' : ''}</header>
      ${list.length ? list.map((n) => `<a class="notif-item ${n.dibaca ? '' : 'unread'}" href="${esc(n.tautan || '#')}" data-nid="${n.id}">
        <b>${esc(n.judul)}</b>${n.pesan ? `<p>${esc(n.pesan)}</p>` : ''}<time>${esc(relatif(n.created_at))}</time></a>`).join('')
        : '<div class="empty"><p>Belum ada notifikasi.</p></div>'}`;
    pop.querySelector('[data-read-all]')?.addEventListener('click', async () => {
      await sb.from('notifikasi').update({ dibaca: true }).eq('dibaca', false).eq('user_id', state.profile.id);
      refreshNotif();
    });
    pop.querySelectorAll('[data-nid]').forEach((a) => a.addEventListener('click', async () => {
      pop.classList.add('hidden');
      await sb.from('notifikasi').update({ dibaca: true }).eq('id', a.dataset.nid);
      refreshNotif();
    }));
  }
  if (isStaff()) {
    const { count } = await sb.from('pengajuan').select('id', { count: 'exact', head: true }).eq('status', 'menunggu');
    app.querySelectorAll('[data-pending]').forEach((el) => { el.textContent = count || ''; el.classList.toggle('hidden', !count); });
  }
}
function setupNotif() {
  const btn = app.querySelector('[data-bell]');
  const pop = app.querySelector('[data-notif-pop]');
  btn.addEventListener('click', (e) => { e.stopPropagation(); pop.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => { if (!pop.contains(e.target)) pop.classList.add('hidden'); });
  clearInterval(notifTimer);
  notifTimer = setInterval(() => { if (!document.hidden) refreshNotif(); }, 60000);
  refreshNotif();
}
export { refreshNotif };

// ---------------- Router ----------------
let routing = 0;
async function route() {
  const my = ++routing;
  const hash = location.hash || '#/';

  if (!configured) {
    app.innerHTML = `<div class="auth-main" style="min-height:100vh"><div class="auth-card stack"><h2>Aplikasi belum dikonfigurasi</h2>
      <p class="muted">Isi <b>VITE_SUPABASE_URL</b> dan <b>VITE_SUPABASE_ANON_KEY</b> (lihat README), lalu build ulang.</p></div></div>`;
    return;
  }
  if (!state.session) {
    delete app.dataset.shell;
    if (hash !== '#/masuk') { history.replaceState(null, '', '#/masuk'); }
    return renderAuth(app, { onLogin: boot });
  }
  if (hash === '#/' || hash === '#/masuk' || hash === '#') return go(home());

  const match = ROUTES.map(([re, need, fn]) => [hash.match(re), need, fn]).find(([m]) => m);
  if (!match) return go(home());
  const [m, need, fn] = match;
  if (need === 'staff' && !isStaff()) return go(home());
  if (need === 'murid' && isStaff()) return go(home());
  if (need === 'murid' && !profilLengkap() && hash !== '#/murid/lengkapi' && hash !== '#/murid/poin') return go('#/murid/lengkapi');

  const role = isStaff() ? 'guru' : 'murid';
  if (app.dataset.shell !== role) renderShell();
  setActive(hash);
  const view = document.getElementById('view');
  view.innerHTML = '<div class="boot" style="min-height:40vh"><span class="spinner"></span></div>';
  try {
    await fn(view, { params: m.slice(1), go, refreshNotif, isCurrent: () => my === routing });
    if (isStaff()) refreshNotif();
  } catch (e) {
    console.error(e);
    if (my === routing) view.innerHTML = `<div class="card"><div class="empty">${icon('alert')}<b>Halaman gagal dimuat</b><p>${esc(e.message || e)}</p><button class="btn primary" onclick="location.reload()">Muat ulang</button></div></div>`;
  }
  window.scrollTo({ top: 0 });
}

async function boot() {
  try {
    const { data } = await sb.auth.getSession();
    state.session = data.session;
    await loadSettings();
    if (state.session) {
      try { await loadProfile(); } catch (e) {
        toast('Akun ini sudah tidak terdaftar atau dihapus. Silakan daftar ulang atau hubungi guru.', 'err');
        await sb.auth.signOut(); state.session = null;
      }
    }
  } catch (e) { console.error(e); }
  delete app.dataset.shell;
  route();
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    state.session = null; state.profile = null;
    delete app.dataset.shell;
    clearInterval(notifTimer);
    location.hash = '#/masuk';
    route();
  } else if (event === 'TOKEN_REFRESHED' && session) {
    state.session = session;
  }
});

window.addEventListener('hashchange', route);
boot();
