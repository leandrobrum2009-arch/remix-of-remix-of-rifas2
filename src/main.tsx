import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister any previously installed service worker (it was intercepting
// Supabase POSTs and breaking writes). The replacement worker at
// /service-worker.js self-unregisters on activate.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
