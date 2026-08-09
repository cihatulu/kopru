import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/**
 * Test yapılandırması AYRI dosyada.
 *
 * `vite.config.ts` içinde durduğunda `defineConfig` çakışması çıkıyordu:
 * vite'ın `defineConfig`'i `test` bloğunu tanımıyor, vitest'inki ise
 * `@vitejs/plugin-react`'in Plugin tipiyle sürüm uyuşmazlığı veriyordu. İkisini
 * ayırmak her iki tarafı da kendi tipiyle doğru bırakıyor.
 *
 * JSX dönüşümü için plugin gerekmez: vitest esbuild kullanır ve tsconfig'teki
 * `"jsx": "react-jsx"` ayarını okur.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**/*'],
    css: false,
    coverage: {
      provider: 'v8',
      // A20 — domain saf ve yüksek kapsamlı olmak zorunda.
      include: ['src/features/**/domain/**'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
