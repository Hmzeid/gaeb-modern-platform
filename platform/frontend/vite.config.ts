import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8080", "/health": "http://localhost:8080" } },
  preview: { port: 5173, host: true, proxy: { "/api": process.env.API_PROXY ?? "http://localhost:8080", "/health": process.env.API_PROXY ?? "http://localhost:8080" } },
});
