import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [react()];

  // PWA: 离线缓存静态资源，在线优先
  const pwa = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: [],
    manifest: {
      name: '小学数学练习',
      short_name: '数学练习',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      icons: [
        {
          src: '/icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          // Supabase API 一律走网络实时请求，避免缓存导致的同步延迟
          urlPattern: /^https:\/\/([a-zA-Z0-9-]+\.)?supabase\.co\/.*/,
          handler: 'NetworkOnly' as const,
        },
      ],
    },
    devOptions: {
      enabled: command === 'serve',
      type: 'module',
    },
  });
  plugins.push(pwa);

  if (command === 'build') {
    // For local file access, we need to inline all assets into a single file
    plugins.push(viteSingleFile());
  }

  return {
    plugins,
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      outDir: 'docs',
      emptyOutDir: true, // 构建前清空输出目录
    },
  };
});
