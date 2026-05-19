import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { apiSyncPlugin } from './server/api-plugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiSyncPlugin()],
  base: './', // 使用相对路径，支持 file:// 协议访问
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // 必需：允许外部访问
    allowedHosts: true, // 必需：跳过 Host Header 检查（由 Ingress 层处理安全性）
    port: 8000, // 默认端口
  },
});
