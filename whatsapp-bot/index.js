const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==========================================
// KONFIGURASI API DAN DATABASE
// ==========================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || Buffer.from('QVEuQWI4Uk42S1BSRDBtaDBwQkhsRHdTREVXcGozU0NEa05Zc1F5eGdxNVc4LTlZakFidFE=', 'base64').toString('ascii');
const SUPABASE_KEY = process.env.SUPABASE_KEY || Buffer.from('c2Jfc2VjcmV0X21FaGNaSUdDam5GSXRGR2VpRWN0cUFfVTZwMlRNdnY=', 'base64').toString('ascii');
const SUPABASE_URL = 'https://ldpgqyglmoozflavnukk.supabase.co/rest/v1';
const HTTP_PORT = process.env.PORT || 3001;

let currentQR = null;
let isConnected = false;
let userPhoneNumber = '';

// ==========================================
// WHITELIST NOMOR PENGUJI / MITRA RESMI
// ==========================================
const WHITELIST_FILE = path.join(__dirname, 'whitelist.json');

function getWhitelist() {
  try {
    if (fs.existsSync(WHITELIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error('Error membaca whitelist:', e);
  }
  return ['244448164364471'];
}

function saveWhitelist(list) {
  try {
    fs.writeFileSync(WHITELIST_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error menyimpan whitelist:', e);
  }
}

function addToWhitelist(numOrId) {
  const clean = String(numOrId).trim().replace(/@.*$/, '');
  if (!clean) return;
  const list = getWhitelist();
  if (!list.includes(clean)) {
    list.push(clean);
    saveWhitelist(list);
    console.log(`✅ [WHITELIST] Menambahkan nomor/ID: ${clean}`);
  }
}

function removeFromWhitelist(numOrId) {
  const clean = String(numOrId).trim().replace(/@.*$/, '');
  let list = getWhitelist();
  list = list.filter(item => String(item).trim().replace(/@.*$/, '') !== clean);
  saveWhitelist(list);
  console.log(`🗑️ [WHITELIST] Menghapus nomor/ID: ${clean}`);
}

function isWhitelisted(from) {
  const list = getWhitelist();
  if (list.length === 0) return false;
  const cleanFrom = String(from).replace(/@.*$/, '');
  return list.some(item => {
    const cleanItem = String(item).trim().replace(/@.*$/, '');
    return cleanFrom.includes(cleanItem) || cleanItem.includes(cleanFrom);
  });
}

// Catatan riwayat chat masuk untuk dipantau di Web UI
const recentIncoming = [];
function recordIncoming(from, text, allowed) {
  recentIncoming.unshift({
    from: from.replace(/@.*$/, ''),
    fullFrom: from,
    text: text ? String(text).slice(0, 90) : '[Voice Note / Audio]',
    time: new Date().toLocaleTimeString('id-ID'),
    allowed
  });
  if (recentIncoming.length > 15) recentIncoming.pop();
}

// ==========================================
// TOOLS DAN FUNGSI SUPABASE
// ==========================================
const tools = [
  {
    functionDeclarations: [
      {
        name: 'cek_stok_telur',
        description: 'Mengecek jumlah stok telur ayam kampung yang tersedia saat ini di gudang Fian\'s Farm.',
        parameters: { type: 'OBJECT', properties: {} }
      },
      {
        name: 'kurangi_stok_telur',
        description: 'Mengurangi stok telur di gudang karena ada penjualan offline, pembelian langsung oleh warga, atau telur pecah.',
        parameters: {
          type: 'OBJECT',
          properties: {
            jumlah: { type: 'NUMBER', description: 'Jumlah butir telur yang ingin dikurangi' },
            alasan: { type: 'STRING', description: 'Keterangan atau alasan pengurangan (misal: dibeli tetangga, telur pecah, dll)' }
          },
          required: ['jumlah', 'alasan']
        }
      },
      {
        name: 'tambah_stok_telur',
        description: 'Menambah stok telur secara manual ke gudang.',
        parameters: {
          type: 'OBJECT',
          properties: {
            jumlah: { type: 'NUMBER', description: 'Jumlah butir telur yang ingin ditambahkan' },
            alasan: { type: 'STRING', description: 'Keterangan penambahan' }
          },
          required: ['jumlah']
        }
      },
      {
        name: 'cek_status_conveyor',
        description: 'Mengecek status terkini conveyor sortir telur dan aktivitas sensor IoT.',
        parameters: { type: 'OBJECT', properties: {} }
      }
    ]
  }
];

const systemInstruction = `
Kamu adalah "Baskara AI", Asisten Cerdas operasional peternakan telur ayam kampung Fian's Farm di Pasuruan.
Tugas utamamu adalah membantu mitra peternak dan pemilik peternakan mengelola stok telur, memantau kondisi mesin conveyor sortir telur, mencatat penjualan offline, dan menjawab pertanyaan operasional.

Kepribadian:
- Ramah, sopan, bersahabat, praktis khas suasana peternakan pedesaan Jawa Timur.
- Gunakan bahasa Indonesia yang santai dan hangat (boleh sesekali menggunakan sapaan akrab seperti "Mas", "Pak", "Nggih").
- Jika mitra bertanya stok atau ingin mencatat penjualan, SELALU gunakan tool yang sesuai untuk memeriksa atau memperbarui database nyata.
- Jika mitra bertanya tentang status Node-RED, conveyor, sensor, ESP32, atau kondisi sistem IoT peternakan:
  * SELALU panggil tool "cek_status_conveyor".
  * Laporkan status "Node-RED di laptop" dengan jelas: apakah AKTIF & ONLINE atau OFFLINE/MATI.
  * Laporkan status "Mesin Conveyor ESP32": apakah sedang aktif menyortir telur atau sedang standby.
  * Sebutkan kapan sensor terakhir kali mendeteksi telur dan berapa stok telur di gudang saat ini.
  * Berikan saran ramah jika Node-RED offline (misal: jalankan Jalankan_NodeRED_Background.vbs di laptop) atau jika conveyor standby.
- Berikan balasan yang ringkas dan jelas tanpa bertele-tele.
`;

async function executeTool(name, args) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };

  try {
    if (name === 'cek_stok_telur') {
      const res = await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.telur-ayam-kampung`, { headers });
      const data = await res.json();
      return { stok_tersedia: data[0]?.stok_tersedia || 0, satuan: 'butir' };
    }

    if (name === 'kurangi_stok_telur') {
      const resCur = await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.telur-ayam-kampung`, { headers });
      const dataCur = await resCur.json();
      const curStock = dataCur[0]?.stok_tersedia || 0;
      const newStock = Math.max(0, curStock - args.jumlah);

      await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.telur-ayam-kampung`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ stok_tersedia: newStock, updated_at: new Date().toISOString() })
      });

      await fetch(`${SUPABASE_URL}/log_aktivitas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: 'telur-ayam-kampung',
          delta: -Math.abs(args.jumlah),
          sumber: 'wa',
          catatan: `[WhatsApp AI] ${args.alasan} (-${args.jumlah} butir)`
        })
      });

      return { sukses: true, stok_sebelumnya: curStock, stok_sekarang: newStock, jumlah_berkurang: args.jumlah };
    }

    if (name === 'tambah_stok_telur') {
      const resCur = await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.telur-ayam-kampung`, { headers });
      const dataCur = await resCur.json();
      const curStock = dataCur[0]?.stok_tersedia || 0;
      const newStock = curStock + args.jumlah;

      await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.telur-ayam-kampung`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ stok_tersedia: newStock, updated_at: new Date().toISOString() })
      });

      await fetch(`${SUPABASE_URL}/log_aktivitas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: 'telur-ayam-kampung',
          delta: Math.abs(args.jumlah),
          sumber: 'wa',
          catatan: `[WhatsApp AI] ${args.alasan || 'Penambahan manual'} (+${args.jumlah} butir)`
        })
      });

      return { sukses: true, stok_sebelumnya: curStock, stok_sekarang: newStock, jumlah_bertambah: args.jumlah };
    }

    if (name === 'cek_status_conveyor') {
      try {
        const [nrRes, sensorRes, stockRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/riwayat_conveyor?id=eq.1`, { headers }),
          fetch(`${SUPABASE_URL}/log_aktivitas?sumber=eq.sensor&order=id.desc&limit=1`, { headers }),
          fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.telur-ayam-kampung`, { headers })
        ]);
        const nrData = await nrRes.json();
        const sensorData = await sensorRes.json();
        const stockData = await stockRes.json();

        // 1. Analisis Status Gateway Node-RED di Laptop
        let isNodeRedOnline = false;
        let nodeRedLastSeen = 'Belum pernah mengirim heartbeat';
        if (nrData && nrData[0]?.recorded_at) {
          const nrTime = new Date(nrData[0].recorded_at).getTime();
          const diffSec = Math.max(0, Math.round((Date.now() - nrTime) / 1000));
          if (diffSec < 90) {
            isNodeRedOnline = true;
            nodeRedLastSeen = `Aktif terhubung (ping ${diffSec} detik yang lalu)`;
          } else {
            const diffMin = Math.round(diffSec / 60);
            nodeRedLastSeen = `Terakhir aktif ${diffMin} menit yang lalu (Saat ini Offline)`;
          }
        }

        // 2. Analisis Status Sensor & Conveyor ESP32
        const lastSensor = sensorData[0];
        let isEspOnline = false;
        let lastSeenText = 'Belum ada deteksi telur tercatat';
        let diffMinutes = 999;

        if (lastSensor && lastSensor.created_at) {
          const lastTime = new Date(lastSensor.created_at).getTime();
          diffMinutes = Math.max(0, Math.round((Date.now() - lastTime) / 60000));
          if (diffMinutes <= 2) {
            isEspOnline = true;
            lastSeenText = `Baru saja (${diffMinutes} menit lalu)`;
          } else if (diffMinutes < 60) {
            lastSeenText = `${diffMinutes} menit yang lalu`;
          } else {
            const hours = Math.floor(diffMinutes / 60);
            const mins = diffMinutes % 60;
            lastSeenText = `${hours} jam ${mins} menit yang lalu`;
          }
        }

        return {
          gateway_nodered_laptop: isNodeRedOnline ? '🟢 AKTIF & ONLINE' : '🔴 OFFLINE / MATI',
          nodered_keterangan: nodeRedLastSeen,
          mesin_conveyor_esp32: isEspOnline ? '🟢 AKTIF / SEDANG MENYORTIR TELUR' : '🟡 STANDBY (Belum ada telur lewat)',
          conveyor_terakhir_deteksi: lastSeenText,
          stok_tersedia_gudang: (stockData[0]?.stok_tersedia || 0) + ' butir',
          panduan_operator: isNodeRedOnline
            ? (isEspOnline ? 'Semua sistem (Node-RED dan Conveyor) berjalan lancar.' : 'Node-RED di laptop aktif. Jika mesin conveyor sedang dinyalakan, pastikan ESP32 terhubung ke hotspot laptop.')
            : 'Node-RED di laptop belum aktif. Jalankan script "Jalankan_NodeRED_Background.vbs" di laptop Anda agar data conveyor bisa disinkronkan ke cloud.'
        };
      } catch (err) {
        return { status: 'STANDBY', error: err.message };
      }
    }
  } catch (err) {
    console.error('Error executeTool:', err);
    return { error: err.message };
  }

  return { error: 'Unknown tool' };
}

// ==========================================
// PROSES AI (TEKS MAUPUN AUDIO VOICE NOTE)
// ==========================================
async function processMessageWithGemini(userContent) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  
  let userParts = [];
  if (typeof userContent === 'string') {
    userParts = [{ text: userContent }];
  } else if (Array.isArray(userContent)) {
    userParts = userContent;
  }

  const payload = {
    contents: [{ role: 'user', parts: userParts }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    tools
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const functionCall = candidate?.content?.parts?.find(p => p.functionCall)?.functionCall;

  if (functionCall) {
    console.log(`[AI TOOL] Memanggil ${functionCall.name}:`, functionCall.args);
    const toolResult = await executeTool(functionCall.name, functionCall.args);

    const followUpPayload = {
      contents: [
        { role: 'user', parts: userParts },
        candidate.content,
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: { content: toolResult }
            }
          }]
        }
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const resFinal = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followUpPayload)
    });

    const dataFinal = await resFinal.json();
    return dataFinal.candidates?.[0]?.content?.parts?.[0]?.text || 'Siap, catatan sudah diperbarui di sistem!';
  } else {
    return candidate?.content?.parts?.[0]?.text || 'Ada yang bisa saya bantu terkait peternakan Fian\'s Farm?';
  }
}

// ==========================================
// WEB SERVER LOKAL & PANEL KONTROL WHITELIST
// ==========================================
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${HTTP_PORT}`);

  // Handle Tambah Whitelist
  if (req.method === 'POST' && reqUrl.pathname === '/add-whitelist') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const number = params.get('number');
      if (number) addToWhitelist(number);
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // Handle Hapus Whitelist
  if (reqUrl.pathname === '/remove-whitelist') {
    const id = reqUrl.searchParams.get('id');
    if (id) removeFromWhitelist(id);
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  // Quick Add dari query
  if (reqUrl.pathname === '/quick-add') {
    const id = reqUrl.searchParams.get('id');
    if (id) addToWhitelist(id);
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (isConnected) {
    const whitelist = getWhitelist();
    const whitelistHtml = whitelist.map(item => `
      <li style="display:flex; justify-content:space-between; align-items:center; padding: 6px 12px; background: #0c1a10; border: 1px solid #1e4526; border-radius: 8px; margin-bottom: 6px;">
        <span style="font-family: monospace; color: #a3e635;">${item}</span>
        <a href="/remove-whitelist?id=${encodeURIComponent(item)}" style="color: #f87171; text-decoration: none; font-size: 0.8rem; padding: 3px 8px; border: 1px solid #7f1d1d; border-radius: 5px;">Hapus</a>
      </li>
    `).join('') || '<li style="color:#94a3b8; font-size: 0.85rem;">Belum ada nomor whitelist. Masukkan nomor di bawah.</li>';

    const recentHtml = recentIncoming.map(msg => `
      <div style="font-size: 0.82rem; padding: 8px; border-bottom: 1px solid #1a2e20; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="color: ${msg.allowed ? '#4ade80' : '#f87171'}; font-weight:bold;">${msg.allowed ? '✅ DIJAWAB' : '🔒 DIABAIKAN'}</span>
          <span style="color: #94a3b8; margin-left: 6px;">${msg.from} (${msg.time})</span>
          <div style="color: #cbd5e1; margin-top: 3px; font-style: italic;">"${msg.text}"</div>
        </div>
        ${!msg.allowed ? `<a href="/quick-add?id=${encodeURIComponent(msg.fullFrom)}" style="background: #166534; color:white; padding: 4px 10px; border-radius: 6px; text-decoration:none; font-size: 0.75rem;">+ Izinkan</a>` : ''}
      </div>
    `).join('') || '<div style="color: #64748b; font-size: 0.85rem; padding: 8px 0;">Belum ada riwayat pesan masuk.</div>';

    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Bot Panel - Fian's Farm</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="10">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #070d08; color: #e0f2e9; padding: 2rem 1rem; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #0f1d13; border: 1px solid #1e3a24; border-radius: 16px; padding: 1.8rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: #166534; color: #bbf7d0; padding: 4px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: bold; }
          h2 { margin: 0.8rem 0 0.3rem; color: #86efac; font-size: 1.4rem; }
          .section { margin-top: 1.5rem; background: #142418; padding: 1rem; border-radius: 12px; border: 1px solid #23452b; }
          h3 { margin-top: 0; font-size: 1rem; color: #a7f3d0; display:flex; justify-content:space-between; }
          input[type=text] { background: #09120a; border: 1px solid #23452b; color: white; padding: 8px 12px; border-radius: 8px; width: 68%; }
          button { background: #15803d; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }
          button:hover { background: #16a34a; }
          ul { list-style: none; padding: 0; margin: 0.5rem 0 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">🟢 TERHUBUNG</div>
          <h2>Baskara AI — WhatsApp Bot</h2>
          <p style="color: #86efac; font-size: 0.9rem; margin-top: 0.2rem;">Nomor Peternakan: <strong>+${userPhoneNumber || 'Nomor WhatsApp'}</strong></p>

          <div class="section">
            <h3>🔒 Daftar Nomor Penguji (Whitelist)</h3>
            <p style="font-size: 0.82rem; color: #94a3b8; margin: 0 0 10px;">HANYA nomor di bawah ini yang akan dijawab bot. Chat pribadi dari teman/keluarga <strong>100% diabaikan otomatis</strong>.</p>
            <ul>
              ${whitelistHtml}
            </ul>

            <form method="POST" action="/add-whitelist" style="margin-top: 12px; display:flex; gap: 8px;">
              <input type="text" name="number" placeholder="Nomor HP (misal: 08123456789)" required>
              <button type="submit">+ Tambah</button>
            </form>
          </div>

          <div class="section">
            <h3>📥 Riwayat Pesan Masuk Terakhir</h3>
            <div style="max-height: 220px; overflow-y: auto;">
              ${recentHtml}
            </div>
          </div>
          
          <p style="font-size: 0.75rem; color: #64748b; text-align: center; margin-top: 1.5rem;">Halaman ini otomatis me-refresh setiap 10 detik.</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  if (currentQR) {
    const qrDataUrl = await QRCode.toDataURL(currentQR, { width: 300, margin: 2 });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scan WhatsApp - Fian's Farm</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="4">
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #1e293b; padding: 2rem; border-radius: 20px; border: 1px solid #334155; max-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          img { border-radius: 12px; background: white; padding: 10px; margin: 1rem 0; width: 260px; height: 260px; }
          h2 { margin: 0; color: #38bdf8; }
          p { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; }
          .step { background: #0f172a; padding: 8px 12px; border-radius: 8px; text-align: left; margin-top: 10px; font-size: 0.85rem; color: #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Sambungkan WhatsApp</h2>
          <p>Scan kode QR di bawah ini menggunakan WhatsApp di HP-mu:</p>
          <img src="${qrDataUrl}" alt="QR Code">
          <div class="step">
            1. Buka WhatsApp di HP<br>
            2. Menu Titik Tiga / Pengaturan &rarr; <strong>Perangkat Tertaut</strong><br>
            3. Klik <strong>Tautkan Perangkat</strong> & arahkan kamera ke sini
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }

  res.end(`
    <!DOCTYPE html>
    <html>
    <head><meta http-equiv="refresh" content="2"><title>Loading...</title></head>
    <body style="font-family:sans-serif;background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;">
      <h3>Menyiapkan Kode QR WhatsApp... Silakan tunggu beberapa detik.</h3>
    </body>
    </html>
  `);
});

server.listen(HTTP_PORT, () => {
  console.log(`🌐 Web UI & Whitelist Manager siap di: http://localhost:${HTTP_PORT}`);
});

// ==========================================
// INISIALISASI BAILEYS WHATSAPP
// ==========================================
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['Fian\'s Farm AI', 'Chrome', '1.0.0'],
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      console.log('\n======================================================');
      console.log('📲 KODE QR WHATSAPP SIAP!');
      console.log(`👉 Buka di browser: http://localhost:${HTTP_PORT}`);
      console.log('Atau scan langsung di terminal di bawah ini:');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Koneksi WhatsApp terputus. Mencoba sambung ulang:', shouldReconnect);
      isConnected = false;
      currentQR = null;
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      userPhoneNumber = sock.user?.id ? sock.user.id.split(':')[0] : '';
      console.log('\n======================================================');
      console.log(`✅ BOT WHATSAPP FIAN'S FARM BERHASIL TERHUBUNG!`);
      console.log(`Nomor WhatsApp Aktif: +${userPhoneNumber}`);
      console.log(`Kelola nomor whitelist di: http://localhost:${HTTP_PORT}`);
      console.log('======================================================\n');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // MENDENGARKAN PESAN MASUK
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // 1. Abaikan pesan grup
    if (isGroup) return;

    const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const audioMessage = msg.message.audioMessage;

    // 2. Dukungan fitur "Message Yourself" (Chat ke nomor sendiri untuk uji coba mandiri)
    // Jika pesan dikirim oleh diri sendiri (fromMe), hanya tanggapi jika diawali #bot
    if (msg.key.fromMe) {
      if (textMessage && textMessage.toLowerCase().startsWith('#bot')) {
        const cleanPrompt = textMessage.slice(4).trim();
        console.log(`\n💬 [Tes Mandiri dari Diri Sendiri]: "${cleanPrompt}"`);
        await sock.sendPresenceUpdate('composing', from);
        const aiResponse = await processMessageWithGemini(cleanPrompt);
        console.log(`🤖 [Balasan AI Mandiri]: "${aiResponse}"`);
        await sock.sendMessage(from, { text: aiResponse });
      }
      return;
    }

    // 3. Periksa Whitelist Pengirim
    const allowed = isWhitelisted(from);
    recordIncoming(from, textMessage || (audioMessage ? '[Voice Note]' : ''), allowed);

    if (!allowed) {
      console.log(`🔒 [DIABAIKAN] Chat dari ${from} bukan nomor whitelist: "${textMessage || 'Audio'}" (Tidak dijawab)`);
      return;
    }

    // 4. Jika pengirim terdaftar di Whitelist, proses dengan Gemini AI
    try {
      let aiResponse = '';

      if (textMessage) {
        console.log(`\n💬 [Pesan Teks DIIZINKAN dari ${from}]: "${textMessage}"`);
        await sock.sendPresenceUpdate('composing', from);
        aiResponse = await processMessageWithGemini(textMessage);
      } else if (audioMessage) {
        console.log(`\n🎙️ [Voice Note DIIZINKAN dari ${from}]: Mengunduh dan mendengarkan audio...`);
        await sock.sendPresenceUpdate('recording', from);

        // Download audio buffer
        const buffer = await downloadMediaMessage(
          msg,
          'buffer',
          {},
          { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
        );

        // Kirim audio langsung ke Gemini
        const audioPart = {
          inlineData: {
            mimeType: 'audio/ogg',
            data: buffer.toString('base64')
          }
        };

        const promptPart = {
          text: 'Dengarkan pesan suara dari mitra peternak ini dengan seksama, pahami maksudnya, lalu lakukan tindakan database atau berikan jawaban yang sesuai.'
        };

        aiResponse = await processMessageWithGemini([promptPart, audioPart]);
      } else {
        return;
      }

      console.log(`🤖 [Balasan AI]: "${aiResponse}"`);
      await sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
    } catch (err) {
      console.error('Error memproses pesan:', err);
      await sock.sendMessage(from, { text: 'Maaf Mas, sistem AI sedang sibuk sebentar. Coba kirim ulang ya.' }, { quoted: msg });
    }
  });
}

startBot().catch(console.error);
