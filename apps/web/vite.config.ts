import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "prerendered-clean-routes",
      configurePreviewServer(server) {
        server.middlewares.use((request, _response, next) => {
          const path = (request.url ?? "/").split("?")[0]!.replace(/\/$/, "");
          if (
            /^\/(app|privacy|community|sw|sh)(\/|$)/.test(path) &&
            existsSync(
              resolve(server.config.root, "dist", `.${path}`, "index.html"),
            )
          ) {
            request.url = `${path}/index.html${request.url?.includes("?") ? `?${request.url.split("?")[1]}` : ""}`;
          }
          next();
        });
      },
    },
  ],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:3001" } },
  build: { manifest: true },
});
