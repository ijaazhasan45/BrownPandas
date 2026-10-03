/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run build:static` (mode "static") produces a server-free build:
// recognition hashes the PDF in the browser and help uses prepared content only.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "static" ? "./" : "/",
  define: {
    __STATIC_DEMO__: JSON.stringify(mode === "static"),
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
}));
