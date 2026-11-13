// Utilitas antarmuka: escape HTML, ikon, toast, modal, format tanggal

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  slides: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4M8 21h8M8 9h8M8 12h5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 19h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.3 2.6 3.8 5.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2.5h6v3H9zM9 12l2 2 4-4M9 18h6"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  alert: '<path d="M12 3 2 20h20zM12 10v4M12 17.5h.01"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h3a1 1 0 0 1 1 1v11M2 21h20M8 7h4M8 11h4M8 15h4"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
  chevl: '<path d="m15 18-6-6 6-6"/>',
  chevr: '<path d="m9 18 6-6-6-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  arrowup: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowdown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};
export const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

export function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'err' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), type === 'err' ? 6000 : 3500);
}

export function errMsg(e) {
  const m = e?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'NIS/username atau password salah.';
  if (/User already registered|already been registered/i.test(m)) return 'NIS ini sudah terdaftar. Silakan masuk.';
  if (/Password should be at least/i.test(m)) return 'Password minimal 6 karakter.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
  if (/pengajuan_satu_aktif/.test(m)) return 'Kamu masih punya pengajuan yang aktif.';
  return m;
}

export function modal({ title, body, footer = '', wide = false, onClose }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h3>${esc(title)}</h3><button class="btn icon ghost" data-close aria-label="Tutup">${icon('x')}</button></header>
    <div class="body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</div>`;
  const prev = document.activeElement;
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  ov.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  document.body.append(ov);
  setTimeout(() => (ov.querySelector('input,select,textarea,button.primary') || ov.querySelector('button'))?.focus(), 30);
  return { el: ov, close };
}

export function confirmDialog(message, { ok = 'Lanjutkan', danger = false, title = 'Konfirmasi' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title,
      body: `<p>${message}</p>`,
      footer: `<button class="btn ghost" data-close>Batal</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>`,
      onClose: () => { if (!done) resolve(false); },
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
  });
}

export async function withBusy(btn, fn) {
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner sm"></span> ${esc(btn.textContent.trim())}`;
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const parseDate = (d) => (d instanceof Date ? d : new Date(`${d}T00:00:00`));
export const fmtTanggal = (d, withDay = true) => {
  if (!d) return '-';
  return parseDate(d).toLocaleDateString('id-ID', { weekday: withDay ? 'long' : undefined, day: 'numeric', month: 'long', year: 'numeric' });
};
export const fmtJam = (t) => (t ? String(t).slice(0, 5) : '-');
export const fmtWaktu = (ts) => (ts ? new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => isoDate(new Date());
export const namaBulan = (m) => BULAN[m];
export function relatif(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 604800) return `${Math.floor(s / 86400)} hari lalu`;
  return fmtWaktu(ts);
}

export const STATUS = {
  menunggu: 'Menunggu verifikasi',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
  selesai: 'Selesai',
  remidi: 'Remidi',
};
export const badge = (s) => `<span class="badge ${esc(s)}">${esc(STATUS[s] || s)}</span>`;
export const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function emptyState(ic, title, text = '', action = '') {
  return `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${text ? `<p>${text}</p>` : ''}${action}</div>`;
}

export function ticket(p, { extra = '' } = {}) {
  const d = p.tanggal ? parseDate(p.tanggal) : null;
  return `<article class="ticket ${esc(p.status)}">
    <div class="t-main">
      <div class="row between">${badge(p.status)}<span class="small muted">Percobaan ke-${p.percobaan || 1}</span></div>
      <div class="t-title">${esc(p.judul)}</div>
      <div class="t-meta">
        <span>${icon('calendar')}${d ? esc(fmtTanggal(p.tanggal)) : 'Belum dijadwalkan'}</span>
        <span>${icon('clock')}${esc(fmtJam(p.jam_mulai))}–${esc(fmtJam(p.jam_selesai))} WIB</span>
        ${p.ruang ? `<span>${icon('pin')}${esc(p.ruang)}</span>` : ''}
      </div>
      ${extra}
    </div>
    <div class="t-stub">
      <div class="t-day">${d ? d.getDate() : '–'}</div>
      <div class="t-month">${d ? `${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}` : ''}</div>
      <div class="t-time">${esc(fmtJam(p.jam_mulai))}</div>
    </div>
  </article>`;
}

export function pwToggle(root) {
  $$('.toggle-pw', root).forEach((b) =>
    b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.innerHTML = icon(show ? 'eyeoff' : 'eye');
      b.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
    })
  );
}
export const pwField = (name, label, auto = 'current-password', extra = '') => `
  <div class="field"><label for="f-${name}">${label}</label>
    <div class="input-wrap"><input class="input" id="f-${name}" name="${name}" type="password" autocomplete="${auto}" minlength="6" required ${extra}/>
    <button type="button" class="toggle-pw" aria-label="Tampilkan password">${icon('eye')}</button></div></div>`;
