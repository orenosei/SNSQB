import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { global: "globalThis" },
  server: {
    proxy: {
      "/api": {
        target: "https://snsqb.duckdns.org",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          realtime: ["@stomp/stompjs", "sockjs-client"],
          vendor: [
            "react",
            "react-dom",
            "react-router",
            "@tanstack/react-query",
            "axios",
          ],
        },
      },
    },
  },
});
