import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App.tsx";
import { api } from "./lib/api";
import "./index.css";

// Wake the backend early (Render free tier cold-starts ~40s) so the first
// auth/analysis request from the user lands on an already-warm server.
api.warmup();

createRoot(document.getElementById("root")!).render(
  <>
    <Analytics />
    <SpeedInsights />
    <App />
  </>
);
