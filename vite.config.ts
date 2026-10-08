import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

// Use import.meta.dirname (native ESM) with a __dirname fallback so the config
// also works when loaded by Vite's "native" config loader (default in future majors).
const projectRoot = import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    /**
     * 部署基准路径。
     *
     * 默认 `'/'`（本地 dev / 根域名部署如 Vercel、Netlify）。
     * GitHub Pages 的项目站点是子路径（https://<user>.github.io/<repo>/），
     * 若保持 `'/'`，构建产物里的 `/assets/index-xxx.js` 会解析到
     * `<user>.github.io/assets/...` → 全部 404、白屏。
     * 故由环境变量注入：CI 里传 `VITE_BASE=/<repo>/`。
     *
     * 注意必须写成 `'./'` 之外的形式并**带结尾斜杠**，否则
     * `/dao-pro` 会被当成文件名前缀而非目录。
     */
    base: process.env.VITE_BASE ?? '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
