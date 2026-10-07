import vinext from "vinext";
import {defineConfig} from "vite";

export default defineConfig({
  plugins: [vinext()],
  server: {
    proxy: {
      '/api/game/ws': {
        target: 'ws://127.0.0.1:8788',
        ws: true,
      },
    },
  },
});
