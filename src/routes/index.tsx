import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage, preloadPage } from "@/components/site/HtmlPage";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  // Préchargement des autres pages en arrière-plan (idle) — navigation instantanée ensuite
  useEffect(() => {
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 800));
    idle(() => {
      preloadPage("/pages/concept.html");
      preloadPage("/pages/investir.html");
    });
  }, []);

  return (
    <SiteLayout>
      <HtmlPage src="/pages/landing.html" />
    </SiteLayout>
  );
}
