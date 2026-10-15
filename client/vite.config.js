import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    // Development only. Each microservice gets its own prefix, so the browser
    // talks to two separate backends exactly like it does in production:
    //   /user-api/...    -> user-service    (localhost:5001/api/...)
    //   /billing-api/... -> billing-service (localhost:5002/api/...)
    proxy: {
      '/user-api': {
        target: process.env.USER_SERVICE_URL || 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/user-api/, '/api'),
      },
      '/billing-api': {
        target: process.env.BILLING_SERVICE_URL || 'http://localhost:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/billing-api/, '/api'),
      },
      '/notify-api': {
        target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notify-api/, '/api'),
      },
    },
  },
});
