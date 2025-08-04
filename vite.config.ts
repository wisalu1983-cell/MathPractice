import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [react()];

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
