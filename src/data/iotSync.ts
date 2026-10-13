import { useEffect, useState } from 'react';
import { inventoryStorageKey, inventoryUpdateEvent, readInventory } from './inventory';

export const iotUpdateEvent = 'fiansfarm:iot-status-updated';
const activityKey = 'butir-pagi-admin-activity-v2';

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
        const stocks = readInventory();
        const currentProdStock = stocks['telur-ayam-kampung'] ?? 0;
        const updatedStocks = { ...stocks, 'telur-ayam-kampung': currentProdStock + delta };
        localStorage.setItem(inventoryStorageKey, JSON.stringify(updatedStocks));

        // Catat aktivitas baru dari sensor
        const rawAct = localStorage.getItem(activityKey);
        const activities = rawAct ? JSON.parse(rawAct) : [];
        const newMovement = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          productId: 'telur-ayam-kampung',
          delta,
          source: 'sensor',
          note: `Sensor IR conveyor mendeteksi +${delta} butir telur baru`,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(activityKey, JSON.stringify([newMovement, ...activities].slice(0, 50)));

        localStorage.setItem(lastCountKey, String(newCount));
        window.dispatchEvent(new Event(inventoryUpdateEvent));
      } catch (e) {
        console.error('Gagal sinkron inventaris:', e);
      }
    } else if (prevCount < 0) {
      // Inisialisasi awal saat pertama kali tersambung
      localStorage.setItem(lastCountKey, String(newCount));
    }
  } else {
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
