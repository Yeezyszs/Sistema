import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Só o fonte. Sem isto, os testes compilados em dist/ pelo `build` são
    // coletados de novo e a contagem sai dobrada.
    include: ['src/**/*.test.ts'],
  },
});
