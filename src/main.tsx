import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { getRouter } from "./router";
import "./styles.css";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const router = getRouter();

// GA4 : envoie un page_view à chaque changement de route TanStack (SPA)
// Sans casser React si l'API du router change.
try {
  router.subscribe("onResolved", (evt: unknown) => {
    try {
      const to = (evt as { toLocation?: { pathname?: string; search?: string } })
        ?.toLocation;
      if (typeof window.gtag === "function" && to) {
        window.gtag("event", "page_view", {
          page_path: (to.pathname ?? "") + (to.search ?? ""),
          page_location: window.location.href,
          page_title: document.title,
        });
      }
    } catch {
      /* silent — never break UI for analytics */
    }
  });
} catch {
  /* silent — router API mismatch, ignore */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Analytics />
  </StrictMode>,
);
