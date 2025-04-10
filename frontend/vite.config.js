import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[tj]sx?$/  // Ensures .js files are read as JSX (optional if renaming)
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
