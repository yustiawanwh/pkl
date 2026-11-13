import { sb, state } from '../lib/supa.js';
import { $, $$, esc, icon, toast, errMsg, withBusy, confirmDialog, fmtTanggal, fmtJam, badge, emptyState, today } from '../lib/ui.js';
import {
  INDIKATOR_A, KOMPLEKSITAS, PORSI, KESELARASAN, ATURAN_B, PERTANYAAN_PEMANDU, sumA, lengkapA, predikat, levelOf, fmtNilai,
} from '../lib/rubrik.js';
import { daftarBerkas } from './murid.js';
import { notFound } from './guru.js';
import { NAMA_SEKOLAH } from '../config.js';

const SEL = '*, murid:profiles!pengajuan_murid_id_fkey(id, nama, nis, kelas, dudi, kompleksitas, porsi), hasil(*), penilaian(*)';

// =====================================================================
// Daftar penilaian
// =====================================================================
export async function daftarPenilaian(view) {
  const { data, error } = await sb.from('pengajuan').select(SEL).in('status', ['disetujui', 'selesai', 'remidi']).order('tanggal').order('jam_mulai');
  if (error) throw error;
  const all = data || [];
  const me = state.profile.id;
  const kelas = [...new Set(all.map((r) => r.murid?.kelas).filter(Boolean))].sort();
  const f = { tab: 'belum', q: '', kelas: '' };
  const t = today();

  view.innerHTML = `
    <div class="page-head"><div><h1>Penilaian presentasi</h1><p>Isi rubrik untuk presentasi yang sudah disetujui. Hasil baru terlihat oleh murid setelah dipublikasikan.</p></div></div>
    <div class="filters">
      <div class="seg">${[['belum', 'Belum dipublikasi'], ['sudah', 'Sudah dipublikasi'], ['', 'Semua']].map(([k, l]) => `<button data-tab="${k}" class="${k === f.tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="spacer"></span>
      <select class="select" data-kelas><option value="">Semua kelas</option>${kelas.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      <input class="input" type="search" placeholder="Cari nama atau judul" data-q />
    </div><div data-list></div>`;

  const draw = () => {
    const q = f.q.toLowerCase();
    const rows = all.filter((r) => (f.tab === '' || (f.tab === 'sudah' ? r.hasil?.dipublikasi : !r.hasil?.dipublikasi))
      && (!f.kelas || r.murid?.kelas === f.kelas) && (!q || `${r.murid?.nama} ${r.judul}`.toLowerCase().includes(q)));
    $('[data-list]', view).innerHTML = rows.length ? `<div class="table-wrap"><table class="t">
      <thead><tr><th>Jadwal</th><th>Murid</th><th>Penguji</th><th class="num">Nilai</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((r) => {
        const mine = r.penilaian.find((p) => p.penguji_id === me);
        const st = r.hasil?.dipublikasi ? badge(r.status) : r.penilaian.length ? '<span class="badge menunggu">Draf</span>' : '<span class="badge">Belum dinilai</span>';
        return `<tr class="click" data-id="${r.id}" tabindex="0">
          <td>${r.tanggal === t ? '<b>Hari ini</b>' : esc(fmtTanggal(r.tanggal, false))}<div class="small muted">${fmtJam(r.jam_mulai)} ${esc(r.ruang || '')}</div></td>
          <td><div class="who"><b>${esc(r.murid?.nama)}</b><span>${esc(r.murid?.kelas)} · ${esc(r.judul)}</span></div></td>
          <td class="small">${r.penilaian.length} penguji${mine ? ' (termasuk Anda)' : ''}</td>
          <td class="num"><b>${fmtNilai(r.hasil?.total)}</b>${r.hasil?.predikat ? `<div class="small muted">${esc(r.hasil.predikat)}</div>` : ''}</td>
          <td>${st}</td><td class="num">${icon('chevr')}</td></tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="card">${emptyState('clipboard', f.tab === 'belum' ? 'Tidak ada yang menunggu dinilai' : 'Belum ada data', 'Presentasi muncul di sini setelah pengajuannya disetujui.')}</div>`;
    $$('[data-id]', view).forEach((tr) => {
      const open = () => (location.hash = `#/guru/nilai/${tr.dataset.id}`);
      tr.addEventListener('click', open); tr.addEventListener('keydown', (e) => e.key === 'Enter' && open());
    });
  };
  $$('[data-tab]', view).forEach((b) => b.addEventListener('click', () => { f.tab = b.dataset.tab; $$('[data-tab]', view).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $('[data-q]', view).addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  $('[data-kelas]', view).addEventListener('change', (e) => { f.kelas = e.target.value; draw(); });
  draw();
}

// =====================================================================
// Form penilaian
// =====================================================================
export async function formNilai(view, ctx) {
  const id = Number(ctx.params[0]);
  const { data: r, error } = await sb.from('pengajuan').select(SEL).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!r) return notFound(view, '#/guru/penilaian', 'Kembali ke daftar penilaian');
  if (!['disetujui', 'selesai', 'remidi'].includes(r.status)) {
    view.innerHTML = `<div class="card">${emptyState('alert', 'Belum bisa dinilai', 'Pengajuan ini harus disetujui terlebih dahulu.', `<a class="btn ghost" href="#/guru/pengajuan/${id}">Buka pengajuan</a>`)}</div>`;
    return;
  }
  const me = state.profile.id;
  const mode = state.settings.mode_penguji === 'banyak' ? 'banyak' : 'tunggal';
  const ids = [...new Set(r.penilaian.map((p) => p.penguji_id))];
  const names = {};
  if (ids.length) { const { data: ps } = await sb.from('profiles').select('id, nama').in('id', ids); (ps || []).forEach((p) => (names[p.id] = p.nama)); }
  const mine = r.penilaian.find((p) => p.penguji_id === me) || null;
  const others = r.penilaian.filter((p) => p.penguji_id !== me);
  const lockA = mode === 'tunggal' && !mine && others.length > 0;
  const aVals = { ...(lockA ? others[0] : mine || {}) };
  const h = r.hasil || {};
  const m = r.murid || {};
  const b = {
    kompleksitas: h.kompleksitas || m.kompleksitas || '', porsi: h.porsi || m.porsi || '', keselarasan: h.keselarasan || '',
    b1: h.b1 ?? '', b2: h.b2 ?? '', b3: h.b3 ?? '',
  };
  const published = !!h.dipublikasi;

  const opt = (obj, v) => `<option value="">Pilih</option>` + Object.keys(obj).map((k) => `<option ${v === k ? 'selected' : ''}>${esc(k)}</option>`).join('');

  view.innerHTML = `
    <div class="page-head"><div><a href="#/guru/penilaian" class="back">${icon('chevl')} Daftar penilaian</a>
      <h1>${esc(m.nama)}</h1>
      <p>${esc(m.kelas)} · ${esc(m.dudi)} · ${esc(fmtTanggal(r.tanggal))}, ${fmtJam(r.jam_mulai)}${r.percobaan > 1 ? ` · percobaan ke-${r.percobaan}` : ''}</p></div>
      <div class="row">${badge(r.status)}<span class="badge plain">${mode === 'banyak' ? 'Mode beberapa penguji' : 'Mode penguji tunggal'}</span></div></div>

    <form class="cols" novalidate data-form>
      <div class="stack-lg">
        <section class="card stack">
          <div class="row between"><h3>${esc(r.judul)}</h3><a class="btn sm ghost" href="#/guru/pengajuan/${id}">Detail pengajuan</a></div>
          <details><summary style="cursor:pointer;font-weight:600">Berkas murid dan panduan tanya jawab</summary>
            <div class="cols even" style="margin-top:12px">
              <div>${daftarBerkas(r)}</div>
              <div class="stack small">
                <b>Pertanyaan pemandu</b><ul style="margin:0;padding-left:18px;color:var(--ink-2)">${PERTANYAAN_PEMANDU.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
                <b>Periksa juga</b><ul style="margin:0;padding-left:18px;color:var(--ink-2)">
                  <li>Klaim peran dan porsi sesuai surat keterangan DUDI dan jurnal PKL.</li>
                  <li>Tidak ada data rahasia perusahaan di slide atau demo.</li></ul>
              </div>
            </div>
          </details>
        </section>

        <section class="stack">
          <div><h2>Komponen A: kualitas presentasi dan pemahaman</h2><p class="muted small" style="margin-top:4px">70 poin, standar sama untuk semua murid. Klik tingkat untuk mengisi skor teratasnya, lalu sesuaikan angkanya.</p></div>
          ${lockA ? `<div class="callout info">${icon('info')}<span>Mode penguji tunggal: Komponen A sudah diisi oleh <b>${esc(names[others[0].penguji_id] || 'guru lain')}</b>. Anda masih bisa melengkapi Komponen B dan evaluasi.</span></div>` : ''}
          ${INDIKATOR_A.map((ind, n) => `
            <div class="indikator" data-ind="${ind.key}">
              <div class="indikator-head">
                <div><h3>${n + 1}. ${esc(ind.judul)}</h3>${ind.catatan ? `<p class="small muted" style="margin-top:4px">${esc(ind.catatan)}</p>` : ''}</div>
                <label class="score-in"><span class="sr">Skor ${esc(ind.judul)}</span>
                  <input class="input" type="number" inputmode="numeric" min="0" max="${ind.bobot}" name="${ind.key}" value="${aVals[ind.key] ?? ''}" ${lockA ? 'disabled' : ''} /><span>/ ${ind.bobot}</span></label>
              </div>
              <div class="levels">${ind.level.map(([lo, hi, nm, desc], li) => `
                <button type="button" class="level" data-lv="${li}" data-hi="${hi}" ${lockA ? 'disabled' : ''}><span class="level-top"><b>${nm}</b><span class="level-range">${lo === hi ? lo : `${lo}–${hi}`}</span></span>${esc(desc)}</button>`).join('')}</div>
            </div>`).join('')}
          ${mode === 'banyak' ? `<div class="field"><label for="f-cp">Catatan penguji (pribadi)</label><textarea class="textarea" id="f-cp" name="catatan_penguji" ${lockA ? 'disabled' : ''}>${esc(mine?.catatan || '')}</textarea></div>` : ''}
        </section>

        <section class="card stack">
          <div><h2>Komponen B: tingkat tantangan pekerjaan</h2><p class="muted small" style="margin-top:4px">30 poin, dari profil murid dan bukti DUDI, bukan dari penampilan saat presentasi. Klaim murid: ${esc(m.kompleksitas)} / ${esc(m.porsi)}.</p></div>
          <div class="grid-3">
            <div class="field"><label for="f-k">Kompleksitas pekerjaan</label><select class="select" id="f-k" name="kompleksitas">${opt(KOMPLEKSITAS, b.kompleksitas)}</select>
              <div class="score-in"><input class="input" type="number" name="b1" value="${b.b1}" /><span>/ 15</span></div><span class="hint" data-r="b1"></span></div>
            <div class="field"><label for="f-p">Porsi kontribusi</label><select class="select" id="f-p" name="porsi">${opt(PORSI, b.porsi)}</select>
              <div class="score-in"><input class="input" type="number" name="b2" value="${b.b2}" /><span>/ 10</span></div><span class="hint" data-r="b2"></span></div>
            <div class="field"><label for="f-s">Keselarasan bukti</label><select class="select" id="f-s" name="keselarasan">${opt(KESELARASAN, b.keselarasan)}</select>
              <div class="score-in"><input class="input" type="number" name="b3" value="${b.b3}" /><span>/ 5</span></div><span class="hint" data-r="b3"></span></div>
          </div>
          <ul class="small muted" style="margin:0;padding-left:18px">${ATURAN_B.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
        </section>

        <section class="card stack">
          <h2>Evaluasi dan feedback</h2>
          <div class="field"><label for="f-ev">Evaluasi dan feedback presentasi</label><textarea class="textarea" id="f-ev" name="evaluasi">${esc(h.evaluasi || '')}</textarea></div>
          <div class="grid-2">
            <div class="field"><label for="f-sa">Saran</label><textarea class="textarea" id="f-sa" name="saran">${esc(h.saran || '')}</textarea></div>
            <div class="field"><label for="f-kr">Kritik</label><textarea class="textarea" id="f-kr" name="kritik">${esc(h.kritik || '')}</textarea></div>
          </div>
          <div class="field"><label for="f-ca">Catatan</label><textarea class="textarea" id="f-ca" name="catatan" rows="2">${esc(h.catatan || '')}</textarea></div>
          <label class="switch"><input type="checkbox" name="remidi" ${h.remidi ? 'checked' : ''} /> Murid perlu remidi / presentasi ulang</label>
          <div class="field ${h.remidi ? '' : 'hidden'}" data-remidi><label for="f-ir">Informasi remidi</label>
            <textarea class="textarea" id="f-ir" name="info_remidi" placeholder="Apa yang harus diperbaiki, dan batas waktu penjadwalan ulang">${esc(h.info_remidi || '')}</textarea></div>
        </section>
      </div>

      <aside class="card stack sticky" data-sum></aside>
    </form>`;

  const form = $('[data-form]', view);
  const num = (n) => { const v = form[n]?.value; return v === '' || v == null ? null : Number(v); };
  const readA = () => Object.fromEntries(INDIKATOR_A.map((i) => [i.key, num(i.key)]));
  const RANGE = { b1: [KOMPLEKSITAS, 'kompleksitas'], b2: [PORSI, 'porsi'], b3: [KESELARASAN, 'keselarasan'] };

  const update = () => {
    // highlight level A
    INDIKATOR_A.forEach((ind) => {
      const v = num(ind.key);
      const box = $(`[data-ind="${ind.key}"]`, form);
      const lv = levelOf(ind, v);
      $$('.level', box).forEach((x) => x.classList.toggle('on', Number(x.dataset.lv) === lv));
      form[ind.key].style.borderColor = v != null && (v < 0 || v > ind.bobot) ? 'var(--rose)' : '';
    });
    // rentang B
    let bOk = true;
    Object.entries(RANGE).forEach(([k, [obj, sel]]) => {
      const lvl = form[sel].value; const v = num(k); const hint = $(`[data-r="${k}"]`, form);
      const rg = obj[lvl];
      form[k].min = rg ? rg.min : 0; form[k].max = rg ? rg.max : 15;
      const bad = rg && v != null && (v < rg.min || v > rg.max);
      if (bad || v == null) bOk = false;
      hint.textContent = rg ? `Rentang ${rg.min === rg.max ? rg.min : `${rg.min}–${rg.max}`}${bad ? ' · nilai di luar rentang' : ''}` : 'Pilih tingkat dulu';
      hint.style.color = bad ? 'var(--rose)' : '';
      form[k].style.borderColor = bad ? 'var(--rose)' : '';
    });
    $('[data-remidi]', form).classList.toggle('hidden', !form.remidi.checked);

    // ringkasan
    const myA = readA();
    const myAFull = lengkapA(myA);
    const pool = [...others.filter((o) => lengkapA(o)).map((o) => ({ nama: names[o.penguji_id] || 'Guru', total: sumA(o) }))];
    if (!lockA && myAFull) pool.push({ nama: 'Anda', total: sumA(myA) });
    if (lockA) pool.splice(0, pool.length, { nama: names[others[0].penguji_id] || 'Guru', total: sumA(others[0]) });
    const nilaiA = pool.length ? Math.round((pool.reduce((s, x) => s + x.total, 0) / pool.length) * 100) / 100 : null;
    const nilaiB = bOk ? num('b1') + num('b2') + num('b3') : null;
    const total = nilaiA != null && nilaiB != null ? Math.round((nilaiA + nilaiB) * 100) / 100 : null;
    const sumMine = sumA(myA);
    $('[data-sum]', view).innerHTML = `
      <span class="label">Nilai akhir</span>
      <div class="total-big">${total == null ? '–' : fmtNilai(total)}</div>
      <div class="meter" aria-hidden="true"><i class="a" style="width:${nilaiA || 0}%"></i><i class="b" style="width:${nilaiB || 0}%"></i></div>
      <div>
        <div class="sum-row"><span>Komponen A${pool.length > 1 ? ` (rata-rata ${pool.length} penguji)` : ''}</span><b>${fmtNilai(nilaiA)} / 70</b></div>
        <div class="sum-row"><span>Komponen B</span><b>${fmtNilai(nilaiB)} / 30</b></div>
        <div class="sum-row"><span>Predikat</span><b>${esc(predikat(total))}</b></div>
      </div>
      ${mode === 'banyak' ? `<div class="stack" style="gap:4px"><span class="label">Nilai A per penguji</span>
        ${pool.length ? pool.map((p) => `<div class="sum-row"><span>${esc(p.nama)}</span><b>${fmtNilai(p.total)}</b></div>`).join('') : '<p class="small muted">Belum ada penguji yang melengkapi nilai.</p>'}
        ${!lockA && !myAFull ? `<p class="small muted">Nilai Anda: ${sumMine} (belum lengkap)</p>` : ''}</div>` : ''}
      ${published ? `<div class="callout ok small">${icon('check')}<span>Hasil sudah dipublikasikan ${h.dipublikasi_at ? 'pada ' + esc(new Date(h.dipublikasi_at).toLocaleDateString('id-ID')) : ''}. Perubahan langsung terlihat oleh murid.</span></div>` : ''}
      <div class="stack" style="gap:8px">
        ${published
          ? `<button type="button" class="btn primary" data-save="pub">${icon('check')} Simpan perubahan</button>
             <button type="button" class="btn ghost" data-save="unpub">Tarik publikasi</button>`
          : `<button type="button" class="btn primary" data-save="pub">${icon('send')} Simpan dan publikasikan</button>
             <button type="button" class="btn ghost" data-save="draft">Simpan draf</button>`}
      </div>`;
    $$('[data-save]', view).forEach((btn) => btn.addEventListener('click', () => save(btn)));
  };

  $$('.level', form).forEach((btn) => btn.addEventListener('click', () => {
    const key = btn.closest('[data-ind]').dataset.ind;
    form[key].value = btn.dataset.hi; update();
  }));
  // pilih tingkat B otomatis mengisi skor atas
  [['kompleksitas', 'b1', KOMPLEKSITAS], ['porsi', 'b2', PORSI], ['keselarasan', 'b3', KESELARASAN]].forEach(([sel, k, obj]) =>
    form[sel].addEventListener('change', () => { const rg = obj[form[sel].value]; form[k].value = rg ? rg.max : ''; update(); }));
  form.addEventListener('input', update);
  update();

  async function save(btn) {
    const act = btn.dataset.save;
    const myA = readA();
    for (const ind of INDIKATOR_A) {
      const v = myA[ind.key];
      if (v != null && (!Number.isInteger(v) || v < 0 || v > ind.bobot)) return toast(`Skor "${ind.judul}" harus 0–${ind.bobot}.`, 'err');
    }
    const publish = act === 'pub';
    if (publish) {
      if (!lockA && !lengkapA(myA) && !others.some(lengkapA)) return toast('Lengkapi keenam skor Komponen A.', 'err');
      if (!lockA && mode === 'tunggal' && !lengkapA(myA)) return toast('Lengkapi keenam skor Komponen A.', 'err');
      if (!form.kompleksitas.value || !form.porsi.value || !form.keselarasan.value || num('b1') == null || num('b2') == null || num('b3') == null)
        return toast('Lengkapi Komponen B.', 'err');
      if (form.remidi.checked && !form.info_remidi.value.trim()) return toast('Isi informasi remidi untuk murid.', 'err');
      if (!published && !(await confirmDialog(`Publikasikan hasil? ${esc(m.nama)} akan langsung melihat nilai dan feedback${form.remidi.checked ? ', serta diminta menjadwalkan ulang' : ''}.`, { ok: 'Publikasikan' }))) return;
    }
    await withBusy(btn, async () => {
      try {
        const anyA = Object.values(myA).some((v) => v != null);
        if (!lockA && (anyA || mine)) {
          const { error: e1 } = await sb.from('penilaian').upsert({
            pengajuan_id: id, penguji_id: me, ...myA, catatan: form.catatan_penguji?.value.trim() || null,
          }, { onConflict: 'pengajuan_id,penguji_id' });
          if (e1) throw e1;
        }
        const s = (n) => form[n].value.trim() || null;
        const { error: e2 } = await sb.from('hasil').upsert({
          pengajuan_id: id,
          kompleksitas: form.kompleksitas.value || null, porsi: form.porsi.value || null, keselarasan: form.keselarasan.value || null,
          b1: num('b1'), b2: num('b2'), b3: num('b3'),
          evaluasi: s('evaluasi'), saran: s('saran'), kritik: s('kritik'), catatan: s('catatan'),
          remidi: form.remidi.checked, info_remidi: form.remidi.checked ? s('info_remidi') : null,
          dipublikasi: act === 'pub' ? true : act === 'unpub' ? false : published,
        }, { onConflict: 'pengajuan_id' });
        if (e2) throw e2;
        toast(act === 'pub' ? (published ? 'Perubahan tersimpan.' : 'Hasil dipublikasikan.') : act === 'unpub' ? 'Publikasi ditarik.' : 'Draf tersimpan.');
        ctx.go(`#/guru/nilai/${id}`);
      } catch (err) { toast(errMsg(err), 'err'); }
    });
  }
}

// =====================================================================
// Rekap nilai + ekspor Excel
// =====================================================================
export async function rekap(view) {
  const [{ data: murid, error }, { data: aj, error: e2 }] = await Promise.all([
    sb.from('profiles').select('id, nama, nis, kelas, dudi, judul').eq('role', 'murid').order('kelas').order('nama'),
    sb.from('pengajuan').select('id, murid_id, status, tanggal, percobaan, judul, created_at, hasil(*), penilaian(*)').in('status', ['disetujui', 'selesai', 'remidi']).order('created_at', { ascending: false }),
  ]);
  if (error || e2) throw error || e2;
  const latest = {};
  (aj || []).forEach((p) => { if (p.hasil?.dipublikasi && !latest[p.murid_id]) latest[p.murid_id] = p; });
  const rows = (murid || []).map((m) => {
    const p = latest[m.id];
    const h = p?.hasil || {};
    const pen = p?.penilaian || [];
    const rataA = Object.fromEntries(INDIKATOR_A.map((i) => [i.key, pen.length ? Math.round((pen.reduce((s, x) => s + (x[i.key] || 0), 0) / pen.length) * 100) / 100 : null]));
    return {
      ...m, judul: p?.judul || m.judul, tanggal: p?.tanggal, percobaan: p?.percobaan, status: p?.status,
      ...h, rataA,
      nilai_a: h.nilai_a != null ? Number(h.nilai_a) : null, nilai_b: h.nilai_b != null ? Number(h.nilai_b) : null, total: h.total != null ? Number(h.total) : null,
      catatan_rekap: h.remidi ? `Remidi: ${h.info_remidi || ''}` : h.catatan || '',
    };
  });
  const kelas = [...new Set(rows.map((r) => r.kelas).filter(Boolean))].sort();
  const f = { kelas: '', hanyaDinilai: false };

  view.innerHTML = `
    <div class="page-head"><div><h1>Rekap nilai</h1><p>Nilai akhir terbaru yang sudah dipublikasikan untuk setiap murid.</p></div>
      <button class="btn primary" data-xls>${icon('download')} Ekspor Excel</button></div>
    <div class="filters">
      <select class="select" data-kelas><option value="">Semua kelas</option>${kelas.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      <label class="row small" style="gap:6px"><input type="checkbox" data-only /> Hanya yang sudah dinilai</label>
    </div>
    <div data-stats></div><div data-list></div>`;

  const filtered = () => rows.filter((r) => (!f.kelas || r.kelas === f.kelas) && (!f.hanyaDinilai || r.total != null));
  const draw = () => {
    const rs = filtered();
    const dinilai = rs.filter((r) => r.total != null);
    const tot = dinilai.map((r) => r.total);
    const avg = tot.length ? tot.reduce((a, b) => a + b, 0) / tot.length : null;
    const dist = ['A', 'B', 'C', 'D'].map((k) => dinilai.filter((r) => r.predikat?.startsWith(k)).length);
    $('[data-stats]', view).innerHTML = `<div class="stats">
      <div class="stat pri"><b>${dinilai.length}<span class="muted" style="font-size:16px"> / ${rs.length}</span></b><span>Murid dinilai</span></div>
      <div class="stat"><b>${fmtNilai(avg == null ? null : Math.round(avg * 100) / 100)}</b><span>Rata-rata nilai akhir</span></div>
      <div class="stat ok"><b>${fmtNilai(tot.length ? Math.max(...tot) : null)}</b><span>Tertinggi</span></div>
      <div class="stat bad"><b>${fmtNilai(tot.length ? Math.min(...tot) : null)}</b><span>Terendah</span></div>
    </div>
    ${dinilai.length ? `<div class="card" style="margin-bottom:16px"><div class="row between"><b>Sebaran predikat</b><span class="small muted">${dinilai.filter((r) => r.remidi).length} murid remidi</span></div>
      <div class="meter" style="height:14px;margin-top:12px">${dist.map((n, i) => n ? `<i style="width:${(n / dinilai.length) * 100}%;background:${['var(--mint)', 'var(--primary)', 'var(--marigold)', 'var(--rose)'][i]}" title="${['A', 'B', 'C', 'D'][i]}: ${n}"></i>` : '').join('')}</div>
      <div class="cal-legend">${['A (90–100)', 'B (80–89)', 'C (70–79)', 'D (<70)'].map((l, i) => `<span><i style="background:${['var(--mint)', 'var(--primary)', 'var(--marigold)', 'var(--rose)'][i]}"></i>${l}: ${dist[i]}</span>`).join('')}</div></div>` : ''}`;
    $('[data-list]', view).innerHTML = rs.length ? `<div class="table-wrap"><table class="t">
      <thead><tr><th>Murid</th><th>DUDI</th><th class="num">Nilai A</th><th class="num">Nilai B</th><th class="num">Nilai akhir</th><th>Predikat</th><th></th></tr></thead><tbody>
      ${rs.map((r) => `<tr>
        <td><div class="who"><b>${esc(r.nama)}</b><span>${esc(r.kelas || '')} · NIS ${esc(r.nis || '')}</span></div></td>
        <td class="small">${esc(r.dudi || '-')}</td>
        <td class="num">${fmtNilai(r.nilai_a)}</td><td class="num">${fmtNilai(r.nilai_b)}</td>
        <td class="num"><b>${fmtNilai(r.total)}</b></td>
        <td>${r.predikat ? esc(r.predikat) : '<span class="muted small">Belum dinilai</span>'}${r.remidi ? ' <span class="badge remidi">Remidi</span>' : ''}</td>
        <td class="num">${latest[r.id] ? `<a class="btn sm ghost" href="#/guru/nilai/${latest[r.id].id}">Buka</a>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card">${emptyState('chart', 'Belum ada data', 'Murid yang terdaftar akan muncul di sini.')}</div>`;
  };
  $('[data-kelas]', view).addEventListener('change', (e) => { f.kelas = e.target.value; draw(); });
  $('[data-only]', view).addEventListener('change', (e) => { f.hanyaDinilai = e.target.checked; draw(); });
  $('[data-xls]', view).addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    try {
      const { eksporRekap } = await import('../lib/excel.js');
      await eksporRekap(filtered(), { judulKelas: f.kelas || 'Semua kelas', sekolah: NAMA_SEKOLAH });
      toast('File Excel diunduh.');
    } catch (err) { toast(errMsg(err), 'err'); }
  }));
  draw();
}
