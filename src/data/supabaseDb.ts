import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { defaultStocks, inventoryStorageKey, inventoryUpdateEvent, readInventory } from './inventory';

const activityKey = 'butir-pagi-admin-activity-v2';

/**
 * Mengambil stok terkini dari Supabase (atau fallback ke localStorage jika belum terhubung)
 */
export async function getLiveStock(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured || !supabase) {
    return readInventory();
  }

  try {
    const { data, error } = await supabase
      .from('stok_inventaris')
      .select('id_produk, stok_tersedia');

    if (error || !data) {
      console.warn('Gagal membaca stok dari Supabase, menggunakan lokal:', error?.message);
      return readInventory();
    }

    const stockMap: Record<string, number> = { ...defaultStocks };
    data.forEach((row: any) => {
      stockMap[row.id_produk] = row.stok_tersedia;
    });

    // Simpan salinan lokal untuk cache
    localStorage.setItem(inventoryStorageKey, JSON.stringify(stockMap));
    return stockMap;
  } catch (err) {
    console.error('Error getLiveStock:', err);
    return readInventory();
  }
}

/**
 * Mencatat perubahan stok ke Supabase dan tabel log_aktivitas
 */
export async function recordStockChange(
  productId: string,
  delta: number,
  source: 'sensor' | 'shopee' | 'manual' | 'wa',
  note: string
): Promise<boolean> {
  // Update lokal terlebih dahulu untuk responsivitas instan
  const currentStocks = readInventory();
  const currentStock = currentStocks[productId] ?? 0;
  const newStock = Math.max(0, currentStock + delta);
  const updatedStocks = { ...currentStocks, [productId]: newStock };
  localStorage.setItem(inventoryStorageKey, JSON.stringify(updatedStocks));

  // Catat riwayat aktivitas lokal
  const rawAct = localStorage.getItem(activityKey);
  const activities = rawAct ? JSON.parse(rawAct) : [];
  const localMovement = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId,
    delta,
    source,
    note,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(activityKey, JSON.stringify([localMovement, ...activities].slice(0, 50)));
  window.dispatchEvent(new Event(inventoryUpdateEvent));

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // 1. Update stok di Supabase
    const { error: stockErr } = await supabase
      .from('stok_inventaris')
      .update({ 
        stok_tersedia: newStock, 
        updated_at: new Date().toISOString() 
      })
      .eq('id_produk', productId);

    if (stockErr) console.error('Gagal update stok di Supabase:', stockErr.message);

    // 2. Tambah log aktivitas di Supabase
    const { error: logErr } = await supabase
      .from('log_aktivitas')
      .insert({
        product_id: productId,
        delta,
        sumber: source,
        catatan: note,
        created_at: new Date().toISOString(),
      });

    if (logErr) console.error('Gagal simpan log di Supabase:', logErr.message);

    return true;
  } catch (err) {
    console.error('Error recordStockChange:', err);
    return false;
  }
}

/**
 * Mengambil riwayat log aktivitas dari Supabase (atau fallback ke localStorage)
 */
export async function getLiveActivities(): Promise<any[]> {
  if (!isSupabaseConfigured || !supabase) {
    const rawAct = localStorage.getItem(activityKey);
    return rawAct ? JSON.parse(rawAct) : [];
  }

  try {
    const { data, error } = await supabase
      .from('log_aktivitas')
      .select('*')
      .order('id', { ascending: false })
      .limit(50);

    if (error || !data) {
      console.warn('Gagal membaca log dari Supabase:', error?.message);
      const rawAct = localStorage.getItem(activityKey);
      return rawAct ? JSON.parse(rawAct) : [];
    }

    const mapped = data.map((item: any) => ({
      id: String(item.id),
      productId: item.product_id,
      delta: item.delta,
      source: item.sumber,
      note: item.catatan,
      createdAt: item.created_at,
    }));
    localStorage.setItem(activityKey, JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Error getLiveActivities:', err);
    const rawAct = localStorage.getItem(activityKey);
    return rawAct ? JSON.parse(rawAct) : [];
  }
}

/**
 * Berlangganan perubahan data secara real-time dari Supabase
 */
export function subscribeToSupabaseRealtime(onChange?: () => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('fiansfarm-live-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stok_inventaris' },
      () => {
        if (onChange) onChange();
        window.dispatchEvent(new Event(inventoryUpdateEvent));
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'log_aktivitas' },
      () => {
        if (onChange) onChange();
        window.dispatchEvent(new Event(inventoryUpdateEvent));
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

