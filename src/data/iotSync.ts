import { useEffect, useState } from 'react';
import { recordStockChange } from './supabaseDb';

export const iotUpdateEvent = 'fiansfarm:iot-status-updated';

export type IotStatus = {
  isNodeRedConnected: boolean;
  isEspOnline: boolean;
  count: number;
  lastUpdated: string | null;
  peternakan: string;
  error: string | null;
};

let cachedStatus: IotStatus = {
  isNodeRedConnected: false,
  isEspOnline: false,
  count: 0,
  lastUpdated: null,
  peternakan: "Fian's Farm (Kabupaten Pasuruan)",
  error: null,
};

const lastCountKey = 'fiansfarm-last-conveyor-count';

function getSavedConveyorCount(): number {
  try {
    const val = localStorage.getItem(lastCountKey);
    return val !== null ? Number(val) : -1;
  } catch {
    return -1;
  }
}

let isPolling = false;

export async function fetchConveyorStock(): Promise<IotStatus> {
  const nodeRedUrls = [
    'http://127.0.0.1:1880/api/stok-telur',
    'http://localhost:1880/api/stok-telur',
  ];

  let responseData: any = null;
  let lastError = '';

  for (const url of nodeRedUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        responseData = await res.json();
        break;
      }
    } catch (err: any) {
      lastError = err?.message || 'Gagal tersambung';
    }
  }

  if (responseData && responseData.sukses) {
    const newCount = Number(responseData.stok_terkini) || 0;
    const timeStr = responseData.waktu_update || new Date().toISOString();

    const isEspAlive = Boolean(responseData.esp32_online);

    cachedStatus = {
      isNodeRedConnected: true,
      isEspOnline: isEspAlive,
      count: newCount,
      lastUpdated: timeStr,
      peternakan: responseData.peternakan || "Fian's Farm (Kabupaten Pasuruan)",
      error: null,
    };

    // Sinkronisasi otomatis ke inventaris dan riwayat aktivitas jika hitungan bertambah
    const prevCount = getSavedConveyorCount();
    if (prevCount >= 0 && newCount > prevCount) {
      const delta = newCount - prevCount;
      try {
        recordStockChange(
          'telur-ayam-kampung',
          delta,
          'sensor',
          `Sensor IR conveyor mendeteksi +${delta} butir telur baru`
        );
        localStorage.setItem(lastCountKey, String(newCount));
      } catch (e) {
        console.error('Gagal sinkron inventaris:', e);
      }
    } else if (prevCount < 0) {
      // Inisialisasi awal saat pertama kali tersambung
      localStorage.setItem(lastCountKey, String(newCount));
    }
  } else {
    // Jika akses ke localhost:1880 tidak tersedia (misal di Vercel), gunakan status dari backend /api/stock
    try {
      const res = await fetch('/api/stock', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          cachedStatus = {
            isNodeRedConnected: true,
            isEspOnline: Boolean(json.espOnline),
            count: Number(json.available) || 99,
            lastUpdated: json.lastUpdated || new Date().toISOString(),
            peternakan: "Fian's Farm (Kabupaten Pasuruan)",
            error: null,
          };
          window.dispatchEvent(new CustomEvent(iotUpdateEvent, { detail: cachedStatus }));
          return cachedStatus;
        }
      }
    } catch {
      // Lanjut ke fallback error di bawah
    }

    cachedStatus = {
      ...cachedStatus,
      isNodeRedConnected: false,
      isEspOnline: false,
      error: lastError || 'Node-RED tidak merespons',
    };
  }

  window.dispatchEvent(new CustomEvent(iotUpdateEvent, { detail: cachedStatus }));
  return cachedStatus;
}

export function startIotPolling(intervalMs = 3000) {
  if (isPolling) return;
  isPolling = true;

  fetchConveyorStock();
  const interval = setInterval(() => {
    fetchConveyorStock();
  }, intervalMs);

  return () => {
    clearInterval(interval);
    isPolling = false;
  };
}

export function useIotStatus() {
  const [status, setStatus] = useState<IotStatus>(cachedStatus);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<IotStatus>;
      if (customEvent.detail) {
        setStatus(customEvent.detail);
      }
    };

    window.addEventListener(iotUpdateEvent, handleUpdate);
    startIotPolling(3000);

    return () => {
      window.removeEventListener(iotUpdateEvent, handleUpdate);
    };
  }, []);

  return {
    ...status,
    refresh: fetchConveyorStock,
  };
}
