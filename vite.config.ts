import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fallback to empty string if API_KEY is missing to prevent build crash
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});