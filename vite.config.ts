import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/mcp': {
          target: env.SUPABASE_URL || 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/mcp/, '/functions/v1/mcp'),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const rawHost = (req.headers['x-forwarded-host'] || req.headers['host']) as string;
              if (rawHost) {
                const host = rawHost.split(',')[0].trim();
                const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                proxyReq.setHeader('x-mcp-origin', `${proto}://${host}`);
              }
            });
          }
        },
        '/api/push/resubscribe': {
          target: env.SUPABASE_URL || 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/push\/resubscribe/, '/functions/v1/push-resubscribe'),
        },
        '/.well-known/oauth-protected-resource': {
          target: env.SUPABASE_URL || 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => '/functions/v1/mcp' + path,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const rawHost = (req.headers['x-forwarded-host'] || req.headers['host']) as string;
              if (rawHost) {
                const host = rawHost.split(',')[0].trim();
                const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                proxyReq.setHeader('x-mcp-origin', `${proto}://${host}`);
              }
            });
          }
        },
        '/.well-known/oauth-authorization-server': {
          target: env.SUPABASE_URL || 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => '/functions/v1/mcp' + path,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const rawHost = (req.headers['x-forwarded-host'] || req.headers['host']) as string;
              if (rawHost) {
                const host = rawHost.split(',')[0].trim();
                const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                proxyReq.setHeader('x-mcp-origin', `${proto}://${host}`);
              }
            });
          }
        },
        '/oauth/': {
          target: env.SUPABASE_URL || 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => '/functions/v1/mcp' + path,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const rawHost = (req.headers['x-forwarded-host'] || req.headers['host']) as string;
              if (rawHost) {
                const host = rawHost.split(',')[0].trim();
                const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                proxyReq.setHeader('x-mcp-origin', `${proto}://${host}`);
              }
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.ATLASSIAN_CLIENT_ID': JSON.stringify(env.ATLASSIAN_CLIENT_ID),
      'process.env.APP_URL': JSON.stringify(env.APP_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
