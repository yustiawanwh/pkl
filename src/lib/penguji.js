// Penguji yang ditetapkan: disimpan sebagai [{ id, nama }] di slots.penguji dan pengajuan.penguji.
// id = akun guru; id null = penguji tamu (nama diketik bebas). Database merapikan & memvalidasi isian.
import { sb, state } from './supa.js';
import { esc, icon } from './ui.js';

export const modeBanyak = () => state.settings.mode_penguji === 'banyak';
export const maksPenguji = () => (modeBanyak() ? 5 : 1);

/** Teks nama penguji, mis. "Bu Ani, Pak Budi". */
export function teksPenguji(arr, kosong = '') {
  const n = (Array.isArray(arr) ? arr : []).map((x) => (typeof x === 'string' ? x : x?.nama)).filter(Boolean);
  return n.length ? n.join(', ') : kosong;
}
/** Potongan HTML kecil: ikon + nama penguji (atau "Penguji belum ditentukan"). */
export function pengujiLine(arr, { kosong = 'Penguji belum ditentukan', cls = 'small muted' } = {}) {
  const t = teksPenguji(arr);
  return `<span class="penguji-line ${cls}">${icon('user')}${t ? esc(t) : `<i>${esc(kosong)}</i>`}</span>`;
}
export const samaPenguji = (a, b) => JSON.stringify((a || []).map((x) => [x.id || null, x.nama])) === JSON.stringify((b || []).map((x) => [x.id || null, x.nama]));

let cacheGuru = null;
export async function daftarGuru(force = false) {
  if (cacheGuru && !force) return cacheGuru;
  const { data, error } = await sb.from('profiles').select('id, nama, role').in('role', ['guru', 'admin']).order('nama');
  if (error) throw error;
  cacheGuru = data || [];
  return cacheGuru;
}

/**
 * Pemilih penguji di dalam form. Mode tunggal: memilih mengganti; mode beberapa: menambah (maks. 5).
 * Mengembalikan { get(): [{id, nama}] }.
 */
export async function pemilihPenguji(host, awal = []) {
  const guru = await daftarGuru();
  const maks = maksPenguji();
  let pilih = (awal || []).map((x) => ({ id: x.id || null, nama: x.nama })).slice(0, maks);

  host.classList.add('pj');
  const draw = () => {
    const sisaGuru = guru.filter((g) => !pilih.some((p) => p.id === g.id));
    host.innerHTML = `
      <div class="pj-chips" aria-live="polite">${pilih.length
        ? pilih.map((p, i) => `<span class="pj-chip ${p.id ? '' : 'tamu'}">${icon('user')}<span>${esc(p.nama)}${p.id ? '' : ' <small>(tamu)</small>'}</span>
            <button type="button" data-rm="${i}" aria-label="Hapus ${esc(p.nama)}">${icon('x')}</button></span>`).join('')
        : '<span class="muted small">Belum ada penguji</span>'}</div>
      <div class="pj-add">
        <select class="select" data-pj-sel aria-label="${maks > 1 ? 'Tambah penguji' : 'Pilih penguji'}">
          <option value="">${maks > 1 ? (pilih.length >= maks ? `Maksimal ${maks} penguji` : 'Tambah penguji…') : (pilih.length ? 'Ganti penguji…' : 'Pilih penguji…')}</option>
          ${sisaGuru.map((g) => `<option value="${esc(g.id)}">${esc(g.nama)}</option>`).join('')}
          <option value="__lain">Nama lain (ketik sendiri)</option>
        </select>
        <div class="pj-lain" hidden>
          <input class="input" data-pj-nama maxlength="80" placeholder="Nama penguji tamu, mis. pembimbing DUDI" aria-label="Nama penguji lain" />
          <button type="button" class="btn ghost" data-pj-ok>${maks > 1 ? 'Tambah' : 'Pakai'}</button>
        </div>
      </div>`;
    const sel = host.querySelector('[data-pj-sel]');
    sel.disabled = maks > 1 && pilih.length >= maks;
    const lain = host.querySelector('.pj-lain');
    const inp = host.querySelector('[data-pj-nama]');
    const tambah = (p) => {
      if (!p.nama) return;
      if (pilih.some((x) => (p.id && x.id === p.id) || x.nama.toLowerCase() === p.nama.toLowerCase())) return;
      pilih = maks > 1 ? [...pilih, p].slice(0, maks) : [p];
      draw();
    };
    sel.addEventListener('change', () => {
      if (sel.value === '__lain') { lain.hidden = false; inp.focus(); return; }
      const g = guru.find((x) => x.id === sel.value);
      if (g) tambah({ id: g.id, nama: g.nama });
    });
    const okLain = () => tambah({ id: null, nama: inp.value.replace(/\s+/g, ' ').trim().slice(0, 80) });
    host.querySelector('[data-pj-ok]').addEventListener('click', okLain);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); okLain(); } });
    host.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { pilih.splice(Number(b.dataset.rm), 1); draw(); }));
  };
  draw();
  return {
    get: () => {
      // nama tamu yang sudah diketik tapi belum diklik "Tambah" tetap ikut tersimpan
      const inp = host.querySelector('.pj-lain:not([hidden]) [data-pj-nama]');
      const ketik = inp?.value.replace(/\s+/g, ' ').trim().slice(0, 80);
      let out = pilih.map((p) => ({ id: p.id, nama: p.nama }));
      if (ketik && !out.some((x) => x.nama.toLowerCase() === ketik.toLowerCase())) out = maks > 1 ? [...out, { id: null, nama: ketik }].slice(0, maks) : [{ id: null, nama: ketik }];
      return out;
    },
  };
}
