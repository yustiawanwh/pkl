import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL_DOMAIN } from '../config.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const sb = createClient(SUPABASE_URL || 'https://belum-diatur.supabase.co', SUPABASE_ANON_KEY || 'x', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'pkl-auth' },
});

// NIS / username -> email internal (tidak pernah dikirimi email)
// Bila yang diketik sudah berupa alamat email lengkap (mis. Gmail admin), dipakai apa adanya.
export const toEmail = (id) => {
  const v = String(id).trim().toLowerCase().replace(/\s+/g, '');
  if (v.includes('@')) return v;
  // "/" tidak lazim di alamat email, jadi diganti "_" (karakter "_" tidak dipakai di NIS)
  return `${v.replace(/\//g, '_')}@${EMAIL_DOMAIN}`;
};

export const state = { session: null, profile: null, settings: {} };

export async function loadProfile() {
  const uid = state.session?.user?.id;
  if (!uid) { state.profile = null; return null; }
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Akun ini sudah tidak terdaftar.');
  state.profile = data;
  return data;
}

export async function loadSettings() {
  const { data } = await sb.from('settings').select('key, value');
  state.settings = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  return state.settings;
}

export async function saveSetting(key, value) {
  const { error } = await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
  state.settings[key] = value;
}

export async function callAdmin(payload) {
  const { data, error } = await sb.functions.invoke('admin', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const isStaff = () => ['guru', 'admin'].includes(state.profile?.role);
export const isAdmin = () => state.profile?.role === 'admin';
export const profilLengkap = (p = state.profile) =>
  Boolean(p && p.nama && p.kelas && p.dudi && p.judul && p.kompleksitas && p.porsi);
