import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'supabase/functions/arena-registrar',
    emptyOutDir: false,
    minify: false,
    lib: { entry: 'tools/edge/motor.ts', formats: ['es'], fileName: () => 'motor.js' },
  },
});
