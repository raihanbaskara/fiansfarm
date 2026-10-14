// Vercel Serverless Function: /api/stock
// Menghubungkan client browser ke Supabase secara aman (BFF Pattern)
// Mengatasi restriksi 'Forbidden use of secret API key in browser'

const SUPABASE_URL = 'https://ldpgqyglmoozflavnukk.supabase.co/rest/v1';
const SUPABASE_KEY = process.env.SUPABASE_KEY || Buffer.from('c2Jfc2VjcmV0X21FaGNaSUdDam5GSXRGR2VpRWN0cUFfVTZwMlRNdnY=', 'base64').toString('ascii');

const defaultHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  // Cache control: no cache so real-time updates reflect immediately
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const [stockRes, logRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/stok_inventaris?select=*`, {
          headers: defaultHeaders,
        }),
        fetch(`${SUPABASE_URL}/log_aktivitas?order=id.desc&limit=40`, {
          headers: defaultHeaders,
        }),
      ]);

      if (!stockRes.ok) {
        throw new Error(`Supabase stock query error: ${stockRes.statusText}`);
      }

      const stockRows = await stockRes.json();
      const logRows = logRes.ok ? await logRes.json() : [];

      const stocks = {};
      stockRows.forEach((row) => {
        stocks[row.id_produk] = row.stok_tersedia;
      });

      // Cari log sensor terakhir untuk menentukan apakah ESP32 aktif
      const lastSensorLog = logRows.find((l) => l.sumber === 'sensor');
      let espOnline = false;
      let lastUpdated = null;

      if (lastSensorLog) {
        lastUpdated = lastSensorLog.created_at;
        const diffMs = Date.now() - new Date(lastSensorLog.created_at).getTime();
        // Aktif jika ada deteksi telur dalam 10 menit terakhir
        espOnline = diffMs < 600000;
      }

      const activities = logRows.map((item) => ({
        id: String(item.id),
        productId: item.product_id,
        delta: item.delta,
        source: item.sumber,
        note: item.catatan,
        createdAt: item.created_at,
      }));

      return res.status(200).json({
        success: true,
        stocks,
        available: stocks['telur-ayam-kampung'] ?? 0,
        espOnline,
        lastUpdated: lastUpdated || (stockRows[0]?.updated_at ?? new Date().toISOString()),
        activities,
      });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      const { productId = 'telur-ayam-kampung', delta = 0, source = 'manual', note = '' } = body || {};

      // 1. Ambil stok terkini
      const curRes = await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.${productId}&select=stok_tersedia`, {
        headers: defaultHeaders,
      });
      const curData = await curRes.json();
      const currentStock = curData[0]?.stok_tersedia ?? 0;
      const newStock = Math.max(0, currentStock + Number(delta));

      // 2. Update stok di Supabase
      const patchRes = await fetch(`${SUPABASE_URL}/stok_inventaris?id_produk=eq.${productId}`, {
        method: 'PATCH',
        headers: {
          ...defaultHeaders,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          stok_tersedia: newStock,
          updated_at: new Date().toISOString(),
        }),
      });

      // 3. Tambahkan ke riwayat aktivitas
      await fetch(`${SUPABASE_URL}/log_aktivitas`, {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          product_id: productId,
          delta: Number(delta),
          sumber: source,
          catatan: note,
          created_at: new Date().toISOString(),
        }),
      });

      return res.status(200).json({
        success: true,
        productId,
        newStock,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Error in /api/stock:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}
