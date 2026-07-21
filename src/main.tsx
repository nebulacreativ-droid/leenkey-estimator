import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

// GA4 : envoie un page_view à chaque changement de route TanStack (SPA)
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
router.subscribe("onResolved", ({ toLocation }) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: toLocation.pathname + toLocation.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Analytics />
  </StrictMode>,
);
