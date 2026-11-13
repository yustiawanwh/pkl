// Upload & akses berkas di Nextcloud melalui Worker proxy (lihat dokumentasi API sekolah)
import { FILE_API } from '../config.js';

export const fileUrl = (f) => (f?.path ? `${FILE_API}/${f.path.split('/').map(encodeURIComponent).join('/')}` : '#');

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const ext = (name) => (name.match(/\.([a-z0-9]+)$/i)?.[1] || 'bin').toLowerCase();

export const JENIS = {
  laporan: { label: 'Draft laporan', accept: '.pdf', exts: ['pdf'], maxMB: 25, ket: 'PDF, maks. 25 MB' },
  ppt: { label: 'File presentasi', accept: '.ppt,.pptx,.pdf,.odp', exts: ['ppt', 'pptx', 'pdf', 'odp'], maxMB: 60, ket: 'PPT/PPTX (atau PDF), maks. 60 MB' },
  bimbingan: { label: 'Lembar bimbingan', accept: '.pdf,.jpg,.jpeg,.png', exts: ['pdf', 'jpg', 'jpeg', 'png'], maxMB: 10, ket: 'PDF/JPG/PNG, maks. 10 MB' },
};

export function validasi(file, jenis) {
  const j = JENIS[jenis];
  if (!j.exts.includes(ext(file.name))) return `${j.label}: format harus ${j.ket.split(',')[0]}`;
  if (file.size > j.maxMB * 1024 * 1024) return `${j.label}: ukuran melebihi ${j.maxMB} MB`;
  return null;
}

// Nama berkas acak (UUID) supaya tidak bisa ditebak orang lain
export function uploadFile(file, jenis, { nis = 'x', onProgress } = {}) {
  const now = new Date();
  const path = `pkl_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}_${String(nis).replace(/\W/g, '')}_${jenis}_${uuid()}.${ext(file.name)}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${FILE_API}/${path}`);
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve({ path, name: file.name, size: file.size, type: file.type, uploaded_at: now.toISOString() })
        : reject(new Error(`Upload ${JENIS[jenis].label} gagal (kode ${xhr.status})`));
    xhr.onerror = () => reject(new Error(`Upload ${JENIS[jenis].label} gagal: server berkas tidak dapat dihubungi`));
    xhr.send(file);
  });
}

export async function hapusFile(f) {
  if (!f?.path) return;
  try { await fetch(`${FILE_API}/${f.path}`, { method: 'DELETE' }); } catch {}
}

export const ukuran = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
