import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vite sẽ thay thế 'process.env.API_KEY' trong code bằng giá trị thực tế khi build.
    // Chúng ta kiểm tra ưu tiên:
    // 1. process.env.API_KEY (Biến chuẩn)
    // 2. process.env.gemini_api_key (Tên biến bạn đặt trong GitHub Secrets)
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || process.env.gemini_api_key || '')
  }
});