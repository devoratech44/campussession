// frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    preview: {
      xfwd: true,
      host: true,
      port: 4173,
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app'],
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
    server: {
      xfwd: true,
      host: true,
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app'],
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
  };
});