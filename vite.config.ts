import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Kendi portumuz. `strictPort` ZORUNLU: port doluysa Vite sessizce başka bir
    // porta kayardı ve e2e, makinede açık olan BAŞKA bir projeye bağlanabilirdi —
    // bu gerçekten yaşandı ve testler eski projenin giriş ekranını gördü.
    port: 5180,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // PLAN §17.2 — vendor ayrımı. Panel bazlı bölme rota seviyesinde React.lazy ile.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // PLAN §17.2 — ilk yükleme bütçesi.
    chunkSizeWarningLimit: 300,
  },
});
