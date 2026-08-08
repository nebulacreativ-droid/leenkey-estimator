import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage } from "@/components/site/HtmlPage";

export const Route = createFileRoute("/tarifs")({
  component: Tarifs,
});

function Tarifs() {
  return (
    <SiteLayout>
      <HtmlPage src="/pages/tarifs.html" />
    </SiteLayout>
  );
}
