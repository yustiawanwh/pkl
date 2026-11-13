// Rubrik Penilaian Presentasi PKL – Project Web & Apps (RPL Kelas XII)
export const INDIKATOR_A = [
  { key: 'a1', judul: 'Latar belakang dan tujuan project', bobot: 10, level: [
    [9, 10, 'Sangat baik', 'Masalah, pengguna, dan tujuan dijelaskan runtut dan spesifik'],
    [7, 8, 'Baik', 'Jelas, tetapi ada bagian yang kurang spesifik'],
    [5, 6, 'Cukup', 'Terlalu umum, hubungan masalah dan solusi kurang tegas'],
    [0, 4, 'Kurang', 'Tidak jelas atau tidak disebutkan']] },
  { key: 'a2', judul: 'Pemahaman teknis atas bagian yang dikerjakan', bobot: 20, level: [
    [17, 20, 'Sangat baik', 'Menjelaskan alur data, logika, dan alasan pilihan teknologi; semua pertanyaan penguji dijawab tepat'],
    [13, 16, 'Baik', 'Paham hampir seluruhnya, ada jawaban yang kurang tepat'],
    [9, 12, 'Cukup', 'Hanya menjelaskan apa yang dikerjakan, belum bagaimana dan mengapa'],
    [0, 8, 'Kurang', 'Tidak dapat menjelaskan pekerjaannya sendiri']] },
  { key: 'a3', judul: 'Proses dan metode kerja', bobot: 10, level: [
    [9, 10, 'Sangat baik', 'Analisis kebutuhan, desain (ERD, wireframe, flowchart), tools, dan pengujian dipaparkan lengkap'],
    [7, 8, 'Baik', 'Sebagian besar tahap dipaparkan'],
    [5, 6, 'Cukup', 'Hanya sebagian kecil tahap dipaparkan'],
    [0, 4, 'Kurang', 'Proses tidak dijelaskan']] },
  { key: 'a4', judul: 'Demo dan bukti hasil kerja', bobot: 10, level: [
    [9, 10, 'Sangat baik', 'Demo lancar atau bukti kuat (commit, log, sebelum-sesudah, dokumentasi) dan sesuai klaim'],
    [7, 8, 'Baik', 'Demo atau bukti ada, dengan kendala kecil'],
    [5, 6, 'Cukup', 'Bukti terbatas'],
    [0, 4, 'Kurang', 'Tidak ada demo atau bukti']],
    catatan: 'Untuk pekerjaan tanpa produk jadi (misalnya maintenance), nilai dari studi kasus: kondisi sebelum-sesudah, laporan bug, atau dokumentasi.' },
  { key: 'a5', judul: 'Penyampaian dan slide', bobot: 10, level: [
    [9, 10, 'Sangat baik', 'Runtut, tepat waktu, percaya diri; slide ringkas dan terbaca'],
    [7, 8, 'Baik', 'Cukup runtut, sedikit melebihi atau kurang waktu'],
    [5, 6, 'Cukup', 'Kurang runtut, slide padat teks atau membaca penuh'],
    [0, 4, 'Kurang', 'Sulit diikuti']] },
  { key: 'a6', judul: 'Tantangan, solusi, dan refleksi', bobot: 10, level: [
    [9, 10, 'Sangat baik', 'Tantangan teknis dan non-teknis beserta solusi dan pelajaran konkret, ada masukan untuk sekolah'],
    [7, 8, 'Baik', 'Tantangan dan solusi jelas, refleksi terbatas'],
    [5, 6, 'Cukup', 'Tantangan disebut tanpa solusi yang jelas'],
    [0, 4, 'Kurang', 'Tidak ada refleksi']] },
];

export const KOMPLEKSITAS = {
  Dasar: { min: 9, max: 11, ciri: 'Tugas terarah: slicing desain ke HTML/CSS, perbaikan bug kecil, CRUD sederhana, pengujian, dokumentasi, pembaruan konten.' },
  Menengah: { min: 12, max: 13, ciri: 'Satu fitur atau modul utuh dengan logika bisnis, integrasi API, autentikasi, atau layar aplikasi lengkap.' },
  Lanjut: { min: 14, max: 15, ciri: 'Perancangan database atau arsitektur, optimasi performa, integrasi sistem pihak ketiga, deployment, atau project end-to-end.' },
};
export const PORSI = {
  Kecil: { min: 6, max: 7, ciri: 'Mengerjakan kurang dari sekitar 25% fitur atau modul tim.' },
  Sedang: { min: 8, max: 9, ciri: 'Mengerjakan sekitar 25–60% fitur atau modul tim.' },
  Besar: { min: 10, max: 10, ciri: 'Mengerjakan lebih dari 60% fitur/modul tim, atau mengerjakan project secara mandiri.' },
};
export const KESELARASAN = {
  Konsisten: { min: 5, max: 5, ciri: 'Surat DUDI, jurnal PKL, dan klaim murid konsisten.' },
  'Sebagian konsisten': { min: 3, max: 3, ciri: 'Sebagian konsisten.' },
  'Tidak konsisten / tidak ada': { min: 0, max: 1, ciri: 'Tidak konsisten atau bukti tidak ada.' },
};
export const ATURAN_B = [
  'Dalam satu tingkat, skor atas diberikan bila pekerjaan tuntas, rapi, dan sesuai standar DUDI; skor bawah bila belum tuntas.',
  'Tanpa surat keterangan atau penilaian dari DUDI, kompleksitas dan porsi dihitung di tingkat terendah (Dasar dan Kecil).',
  'Klaim kompleksitas yang tidak bisa dijelaskan murid saat tanya jawab diturunkan satu tingkat.',
];
export const PERTANYAAN_PEMANDU = [
  'Bagian mana yang kamu kerjakan sendiri, dan bagian mana yang dikerjakan orang lain?',
  'Jelaskan alur data dari input pengguna sampai tersimpan di database.',
  'Kenapa memilih framework atau teknologi ini dibanding alternatif lain?',
  'Bug tersulit apa yang kamu temui, dan bagaimana menyelesaikannya?',
  'Kalau ada waktu dua minggu lagi, apa yang akan kamu perbaiki?',
];

export const sumA = (r) => (r ? INDIKATOR_A.reduce((s, i) => s + (Number(r[i.key]) || 0), 0) : 0);
export const lengkapA = (r) => r && INDIKATOR_A.every((i) => r[i.key] !== null && r[i.key] !== undefined && r[i.key] !== '');
export const predikat = (t) => (t == null ? '-' : t >= 90 ? 'A (Sangat baik)' : t >= 80 ? 'B (Baik)' : t >= 70 ? 'C (Cukup)' : 'D (Perlu perbaikan)');
export const levelOf = (ind, v) => (v === '' || v == null ? -1 : ind.level.findIndex(([lo, hi]) => v >= lo && v <= hi));
export const fmtNilai = (n) => (n == null ? '-' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 }));
