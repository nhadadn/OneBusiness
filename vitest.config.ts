import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    isolate: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/jwt.ts',
        'src/middleware/auth-middleware.ts',
        'src/middleware/tenant-middleware.ts',
        'src/services/auth.service.ts',
        'src/app/api/auth/**/route.ts',
      ],
      exclude: ['src/**/*.d.ts', 'src/app/**/page.tsx', 'src/app/**/layout.tsx'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

