import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The Phaser chunk is loaded with a dynamic import, so the browser only discovers it
// after the entry chunk runs. Preloading it from the HTML fetches both in parallel.
function preloadGameChunk(): Plugin {
  return {
    name: 'preload-game-chunk',
    transformIndexHtml(html, context) {
      const game = Object.values(context.bundle ?? {}).find(
        (output) => output.type === 'chunk' && output.name === 'PhaserGame',
      );
      if (!game) return html;

      return {
        html,
        tags: [
          {
            tag: 'link',
            attrs: { rel: 'modulepreload', href: `./${game.fileName}` },
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), preloadGameChunk()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    target: 'es2022',
  },
});
