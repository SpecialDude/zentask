import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Everything the SPA calls goes through the Django API. In development the
// proxy hides CORS and cookie-domain differences; in a deployed build set
// VITE_API_BASE to the API origin instead (e.g. https://api.zentask.space).
const API_PREFIXES = [
  '/auth',
  '/tasks',
  '/categories',
  '/lists',
  '/feedback',
  '/analytics',
  '/api-keys',
  '/jira',
  '/ai',
  '/push',
  '/notification-preferences',
  '/admins',
  '/oauth',
  '/.well-known',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000';

  const proxy: Record<string, object> = {};
  for (const prefix of API_PREFIXES) {
    proxy[prefix] = { target: apiTarget, changeOrigin: true };
  }
  // The service worker fetches this path without knowing the API origin.
  proxy['/api/push/resubscribe'] = {
    target: apiTarget,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/push\/resubscribe/, '/push/resubscribe'),
  };
  // The SPA advertises /api/mcp; the API serves the same handler at /mcp.
  proxy['/api/mcp'] = {
    target: apiTarget,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/mcp/, '/mcp'),
  };
  proxy['/mcp'] = { target: apiTarget, changeOrigin: true };
  proxy['/healthz'] = { target: apiTarget, changeOrigin: true };

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
