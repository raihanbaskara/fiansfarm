import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { defaultStocks, inventoryStorageKey, inventoryUpdateEvent, readInventory } from './inventory';

const activityKey = 'butir-pagi-admin-activity-v2';

/**
 * Mengambil stok terkini dari backend API (/api/stock -> Supabase Cloud)
 * dengan fallback ke direct Supabase client atau localStorage
 */
export async function getLiveStock(): Promise<Record<string, number>> {
  // 1. Coba fetch dari backend serverless route /api/stock (BFF pattern)
  try {
    const res = await fetch('/api/stock', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.stocks) {
        const stockMap: Record<string, number> = { ...defaultStocks, ...json.stocks };
        localStorage.setItem(inventoryStorageKey, JSON.stringify(stockMap));
        return stockMap;
      }
    }
  } catch (apiErr) {
    // Jalankan fallback di bawah jika /api/stock gagal
  }

  // 2. Fallback direct Supabase client jika terkonfigurasi
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('stok_inventaris')
        .select('id_produk, stok_tersedia');

      if (!error && data && data.length > 0) {
        const stockMap: Record<string, number> = { ...defaultStocks };
        data.forEach((row: any) => {
          stockMap[row.id_produk] = row.stok_tersedia;
        });
        localStorage.setItem(inventoryStorageKey, JSON.stringify(stockMap));
        return stockMap;
      }
    } catch {
      // lanjut ke fallback local
    }
  }

  // 3. Fallback terakhir: localStorage
  return readInventory();
}

/**
 * Mencatat perubahan stok ke backend /api/stock dan Supabase Cloud
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

  // Kirim ke backend /api/stock
  try {
    const res = await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, delta, source, note }),
    });
    if (res.ok) {
      return true;
    }
  } catch (e) {
    console.warn('Gagal POST ke /api/stock, mencoba fallback direct supabase:', e);
  }

  // Fallback direct Supabase jika ada client
  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    await supabase
      .from('stok_inventaris')
      .update({ 
        stok_tersedia: newStock, 
        updated_at: new Date().toISOString() 
      })
      .eq('id_produk', productId);

    await supabase
      .from('log_aktivitas')
      .insert({
        product_id: productId,
        delta,
        sumber: source,
        catatan: note,
        created_at: new Date().toISOString(),
      });

    return true;
  } catch {
    return false;
  }
}

/**
 * Mengambil riwayat log aktivitas dari /api/stock atau Supabase Cloud
 */
export async function getLiveActivities(): Promise<any[]> {
  // 1. Coba fetch dari backend /api/stock
  try {
    const res = await fetch('/api/stock', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.activities)) {
        localStorage.setItem(activityKey, JSON.stringify(json.activities));
        return json.activities;
      }
    }
  } catch {
    // lanjut ke fallback
  }

  // 2. Fallback direct Supabase client
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('log_aktivitas')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

      if (!error && data) {
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
      }
    } catch {
      // lanjut ke fallback
    }
  }

  // 3. Fallback localStorage
  const rawAct = localStorage.getItem(activityKey);
  return rawAct ? JSON.parse(rawAct) : [];
}

/**
 * Berlangganan perubahan data secara real-time dari Supabase
 */
export function subscribeToSupabaseRealtime(onChange?: () => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  try {
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
  } catch {
    return () => {};
  }
}
