import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage } from "@/components/site/HtmlPage";

export const Route = createFileRoute("/concept")({
  component: ConceptPage,
});

function ConceptPage() {
  return (
    <SiteLayout>
      <HtmlPage src="/pages/concept.html" />
    </SiteLayout>
  );
}
