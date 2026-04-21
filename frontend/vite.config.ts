import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Frontend uses /v1; proxy to local Functions endpoint for local E2E.
      "/v1": {
        target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:5001/demo-aegis/us-central1/api",
        changeOrigin: true
      }
    }
  }
});
