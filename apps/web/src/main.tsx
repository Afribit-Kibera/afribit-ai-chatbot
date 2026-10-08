import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";
import { applyBranding, getPack } from "./lib/pack.js";
import { captureSource } from "./lib/source.js";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

// A learner link such as /app?ref=kibera-hub: keep the channel label (and only that) for later chats.
if (window.location.pathname.startsWith("/app"))
  captureSource(window.location.search);

// The community's accent colour, from the last pack this browser saw, before the first paint of the app.
if (window.location.pathname.startsWith("/app"))
  applyBranding(document.documentElement, getPack().branding);

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (rootEl.hasChildNodes()) hydrateRoot(rootEl, app);
else createRoot(rootEl).render(app);
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  window.location.pathname.startsWith("/app")
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    },
    { once: true },
  );
}
