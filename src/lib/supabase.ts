import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ldpgqyglmoozflavnukk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.startsWith('sb_secret_') &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type StokInventarisRow = {
  id_produk: string;
  nama_produk: string;
  stok_tersedia: number;
  harga_per_butir: number;
  satuan: string;
  updated_at: string;
};

export type RiwayatConveyorRow = {
  id?: number;
  total_hitungan: number;
  delta: number;
  status_mesin: string;
  recorded_at?: string;
};

export type PesananRow = {
  id_pesanan: string;
  nama_pemesan: string;
  alamat?: string;
  jumlah_butir: number;
  total_biaya: number;
  sumber: string;
  status: string;
  created_at?: string;
};

export type LogAktivitasRow = {
  id?: number;
  product_id: string;
  delta: number;
  sumber: string;
  catatan: string;
  created_at?: string;
};
