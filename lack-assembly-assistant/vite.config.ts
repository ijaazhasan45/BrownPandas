/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Build modes:
//   (default)  web app served by the Express server; installable PWA with offline caching
//   static     server-free single page (used for the hosted preview)
//   app        bundle for the Capacitor iOS/Android shell (npm run build:app)
// "static" and "app" recognize the PDF in the browser. Help uses prepared content
// unless VITE_API_BASE points at a running server.
export default defineConfig(({ mode }) => {
  const offline = mode === "static" || mode === "app";
  return {
    plugins: [
      react(),
      VitePWA({
        disable: offline,
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
        manifest: {
          name: "LACK Assembly Assistant",
          short_name: "Assembly",
          description: "Step-by-step 3D help for assembling the IKEA LACK side table.",
          theme_color: "#1b2228",
          background_color: "#f3f5f3",
          display: "standalone",
          orientation: "any",
          start_url: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: { cacheName: "google-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
      }),
    ],
    base: offline ? "./" : "/",
    define: {
      __STATIC_DEMO__: JSON.stringify(offline),
    },
    server: {
      port: 5173,
      host: true, // reachable from a phone on the same network
      proxy: { "/api": "http://localhost:8787" },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Keep React in its own chunk so the start screen never waits for three.js.
          manualChunks: (id) => {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id) || /preload-helper|commonjsHelpers/.test(id)) return "react";
            if (/node_modules\/(three|@react-three|three-stdlib|three-mesh-bvh|troika-[^/]+|camera-controls|maath|meshline|stats-gl|suspend-react|zustand|its-fine|react-reconciler)\//.test(id)) return "three";
            return undefined;
          },
        },
      },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
    },
  };
});
