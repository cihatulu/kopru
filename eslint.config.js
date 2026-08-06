import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Katman kuralları PLAN §18.2 / karar A20. Hook'lar (guard-layers) ikinci savunma hattıdır;
// burası geliştiricinin editöründe anında geri bildirim veren birinci hattır.
export default tseslint.config(
  {
    // supabase/functions = Deno runtime (ayrı toolchain), buradan hariç.
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'src/types/database.generated.ts',
      'supabase/functions/**',
      'scratch/**',
    ],
  },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',

      // A20 — feature iç dosyalarına doğrudan import yasak; yalnız public yüzey.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/features/*/api/*',
                '@/features/*/domain/*',
                '@/features/*/components/*',
                '../*/api/*',
                '../*/domain/*',
                '../*/components/*',
              ],
              message:
                'A20: Başka bir feature\'ın iç dosyası import edilemez. `@/features/<ad>` public yüzeyini kullan.',
            },
          ],
        },
      ],
    },
  },

  // --- A20: pages/ yalnız kompozisyon ---
  {
    files: ['src/pages/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase',
              message: 'A20: Sayfalar Supabase\'e dokunamaz. Veri erişimi features/<ad>/api içinde.',
            },
            {
              name: '@supabase/supabase-js',
              message: 'A20: Sayfalar Supabase\'e dokunamaz. Veri erişimi features/<ad>/api içinde.',
            },
            {
              name: '@tanstack/react-query',
              message:
                'A20: Sayfalarda doğrudan useQuery/useMutation yok. Feature api hook\'unu çağır.',
            },
          ],
        },
      ],
    },
  },

  // --- A20: domain/ SAF olmak zorunda (React yok, Supabase yok, DOM yok) ---
  {
    files: ['src/features/*/domain/**/*.ts'],
    ignores: ['src/features/*/domain/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-*', '@tanstack/*', '@supabase/*', '@/lib/supabase'],
              message:
                'A20: domain/ saf mantıktır — React, Supabase veya DOM bağımlılığı alamaz. Saf fonksiyon yaz, testini yanına koy.',
            },
          ],
        },
      ],
    },
  },

  // --- A20: components/ui sunum katmanı; feature veya veri erişimi göremez ---
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/lib/supabase', '@supabase/*', '@tanstack/*'],
              message:
                'A20: components/ui presentational katmandır. Veri çekmez, feature import etmez.',
            },
          ],
        },
      ],
    },
  },

  // --- A20: lib/ yardımcı katman; feature bilmez ---
  {
    files: ['src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/pages/*'],
              message: 'A20: lib/ alt katmandır; feature veya sayfa import edemez.',
            },
          ],
        },
      ],
    },
  },

  // Node/config dosyaları
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },

  // E2E — Playwright + Node
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-imports': 'off',
    },
  },

  // Test dosyaları — mock esnekliği
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-restricted-imports': 'off',
    },
  },
);
