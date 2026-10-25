// Vite build/dev configuration.
// - `host: true` exposes the dev server on the LAN so a phone can open the app.
// - /api/* goes to the Wanderlust API server (server/index.js, `npm run server`) on port 8787,
//   the same way nginx routes it in production. Google Lens can only fetch the photo from a
//   public HTTPS address, so real Lens results need the deployed server; locally the scan
//   falls back to demo data.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
});
