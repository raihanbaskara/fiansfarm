import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore
import handler from './api/stock.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-stock-dev',
      configureServer(server) {
        server.middlewares.use('/api/stock', async (req: any, res: any) => {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            if (body) {
              try { (req as any).body = JSON.parse(body); } catch { (req as any).body = body; }
            }
            (res as any).status = function (code: number) {
              this.statusCode = code;
              return this;
            };
            (res as any).json = function (data: any) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(data));
              return this;
            };
            try {
              await handler(req as any, res as any);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['.manus.computer'],
  },
});
