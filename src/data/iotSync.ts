import { useEffect, useState } from 'react';
import { recordStockChange } from './supabaseDb';

export const iotUpdateEvent = 'fiansfarm:iot-status-updated';

export type IotStatus = {
  isNodeRedConnected: boolean;
  isEspOnline: boolean;
  motorRunning: boolean;
  count: number;
  lastUpdated: string | null;
  lastCommand: { command: string; at: string } | null;
  peternakan: string;
  error: string | null;
};

let cachedStatus: IotStatus = {
  isNodeRedConnected: false,
  isEspOnline: false,
  motorRunning: false,
  count: 0,
  lastUpdated: null,
  lastCommand: null,
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
    const isMotorRunning =
      typeof responseData.motor_running === 'boolean'
        ? responseData.motor_running
        : isEspAlive;

    cachedStatus = {
      isNodeRedConnected: true,
      isEspOnline: isEspAlive,
      motorRunning: isMotorRunning,
      count: newCount,
      lastUpdated: timeStr,
      lastCommand: responseData.motor_last_command || cachedStatus.lastCommand,
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
          const cloudEspOnline = Boolean(json.espOnline);
          cachedStatus = {
            ...cachedStatus,
            isNodeRedConnected: false,
            isEspOnline: cloudEspOnline,
            motorRunning: cloudEspOnline,
            count: Number(json.available) || cachedStatus.count,
            lastUpdated: json.lastUpdated || new Date().toISOString(),
            peternakan: "Fian's Farm (Kabupaten Pasuruan)",
            error: 'Node-RED lokal belum terhubung; menampilkan sinkronisasi Cloud.',
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
      motorRunning: false,
      error: lastError || 'Node-RED tidak merespons',
    };
  }

  window.dispatchEvent(new CustomEvent(iotUpdateEvent, { detail: cachedStatus }));
  return cachedStatus;
}

export type ConveyorCommand = 'START' | 'STOP' | 'RESET';

export type ConveyorCommandResult = {
  ok: boolean;
  command: ConveyorCommand;
  motorRunning: boolean;
  message: string;
};

export async function sendConveyorCommand(command: ConveyorCommand): Promise<ConveyorCommandResult> {
  for (const baseUrl of [
    'http://127.0.0.1:1880/api/conveyor/motor',
    'http://localhost:1880/api/conveyor/motor',
  ]) {
    // Gunakan text/plain agar browser mengirim simple POST tanpa preflight OPTIONS, lalu fallback ke simple GET
    const attempts: Array<{ url: string; init: RequestInit }> = [
      {
        url: baseUrl,
        init: {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            Accept: 'application/json',
          },
          body: JSON.stringify({ command }),
        },
      },
      {
        url: `${baseUrl}?cmd=${encodeURIComponent(command)}&_t=${Date.now()}`,
        init: {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        },
      },
    ];

    for (const attempt of attempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(attempt.url, {
          ...attempt.init,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const nextRunning =
            typeof json?.motor_running === 'boolean'
              ? json.motor_running
              : command === 'START'
                ? true
                : command === 'STOP'
                  ? false
                  : cachedStatus.motorRunning;

          cachedStatus = {
            ...cachedStatus,
            isNodeRedConnected: true,
            motorRunning: nextRunning,
            count: command === 'RESET' ? 0 : cachedStatus.count,
            lastCommand: {
              command,
              at: json?.waktu || new Date().toISOString(),
            },
            error: null,
          };
          window.dispatchEvent(new CustomEvent(iotUpdateEvent, { detail: cachedStatus }));
          window.setTimeout(() => {
            fetchConveyorStock();
          }, 450);

          const label =
            command === 'START'
              ? 'Perintah START dikirim: conveyor dijalankan.'
              : command === 'STOP'
                ? 'Perintah STOP dikirim: conveyor dihentikan sementara.'
                : 'Hitungan conveyor direset ke 0 butir.';

          return {
            ok: true,
            command,
            motorRunning: nextRunning,
            message: label,
          };
        }
      } catch {
        // Lanjut ke metode/URL berikutnya
      }
    }
  }

  return {
    ok: false,
    command,
    motorRunning: cachedStatus.motorRunning,
    message: 'Node-RED lokal (port 1880) tidak terjangkau dari browser ini. Pastikan Node-RED aktif di laptop.',
  };
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
    sendCommand: sendConveyorCommand,
  };
}
