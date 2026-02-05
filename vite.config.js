import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: '/motw-tools/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    }
  },
  server: {
    port: 3000,
    open: false,
    host: '0.0.0.0',
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, '/v1'),
        headers: {
          'anthropic-version': '2023-06-01'
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[PROXY] Request:', req.method, proxyReq.path);
            console.log('[PROXY] x-api-key:', req.headers['x-api-key'] ? 'present (length: ' + req.headers['x-api-key'].length + ')' : 'MISSING');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[PROXY] Response:', proxyRes.statusCode);
          });

          proxy.on('error', (err, req, res) => {
            console.error('[PROXY] Error:', err.message);
          });
        }
      }
    }
  }
});
