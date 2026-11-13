// Nilai diambil dari variabel lingkungan saat build (lihat README / .env.example)
const env = import.meta.env;
export const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
export const FILE_API = (env.VITE_FILE_API || 'https://api-files-kg16brantasku.smkbrantaskarangkates.net').replace(/\/+$/, '');
export const EMAIL_DOMAIN = env.VITE_LOGIN_EMAIL_DOMAIN || 'pkl.smkbrantaskarangkates.net';
export const NAMA_SEKOLAH = env.VITE_NAMA_SEKOLAH || 'SMK Brantas Karangkates';
