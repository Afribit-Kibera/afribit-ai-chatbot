import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/voice/",
  plugins: [react(), tailwindcss()],
  envPrefix: "VITE_VOICE_",
  server: { host: "127.0.0.1", port: 5186, proxy: { "/api": "http://127.0.0.1:3001" } },
  build: {
    outDir: "../public/voice/dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    manifest: true,
  },
});
