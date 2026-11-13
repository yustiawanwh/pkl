// Kalender bulanan sederhana. getDay(iso) -> { dots: [...'ok'|'full'|'mine'], has: bool }
import { esc, icon, isoDate, namaBulan, today } from './ui.js';

export function calendar(root, { month = new Date(), getDay, onPick, onMonth, selected = null, legend = '' }) {
  let cur = new Date(month.getFullYear(), month.getMonth(), 1);
  let sel = selected;
  const draw = () => {
    const first = new Date(cur);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // mulai Senin
    const t = today();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const iso = isoDate(d);
      const info = getDay?.(iso) || {};
      const cls = ['cal-day', d.getMonth() === cur.getMonth() ? 'in' : '', info.has ? 'has' : '', iso === t ? 'today' : '', iso === sel ? 'sel' : ''].join(' ');
      cells += `<button type="button" class="${cls}" data-d="${iso}" ${info.has ? '' : 'tabindex="-1"'} aria-label="${iso}">
        ${d.getDate()}<span class="dots">${(info.dots || []).slice(0, 4).map((c) => `<i class="${c}"></i>`).join('')}</span></button>`;
    }
    root.innerHTML = `<div class="cal">
      <div class="cal-head">
        <button type="button" class="btn icon ghost" data-nav="-1" aria-label="Bulan sebelumnya">${icon('chevl')}</button>
        <h3>${esc(namaBulan(cur.getMonth()))} ${cur.getFullYear()}</h3>
        <button type="button" class="btn icon ghost" data-nav="1" aria-label="Bulan berikutnya">${icon('chevr')}</button>
      </div>
      <div class="cal-grid">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
      ${legend ? `<div class="cal-legend">${legend}</div>` : ''}</div>`;
    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', async () => {
      cur = new Date(cur.getFullYear(), cur.getMonth() + Number(b.dataset.nav), 1);
      await onMonth?.(cur);
      draw();
    }));
    root.querySelectorAll('.cal-day.has').forEach((b) => b.addEventListener('click', () => { sel = b.dataset.d; draw(); onPick?.(sel); }));
  };
  draw();
  return { redraw: draw, get month() { return cur; }, select(d) { sel = d; draw(); } };
}

export const monthRange = (m) => {
  const a = new Date(m.getFullYear(), m.getMonth(), 1);
  const b = new Date(m.getFullYear(), m.getMonth() + 1, 0);
  // perluas agar sel minggu awal/akhir ikut terisi
  a.setDate(a.getDate() - 7); b.setDate(b.getDate() + 14);
  return [isoDate(a), isoDate(b)];
};
