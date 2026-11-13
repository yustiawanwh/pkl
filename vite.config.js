import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: (c) => (c.name.startsWith('vendor') ? 'assets/[name]-[hash].js' : 'assets/app-[hash].js'),
        manualChunks(id) {
          if (id.includes('node_modules/exceljs')) return 'vendor-excel';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
