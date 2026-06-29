import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage } from "@/components/site/HtmlPage";

export const Route = createFileRoute("/investir")({
  component: InvestirPage,
});

function InvestirPage() {
  return (
    <SiteLayout>
      <HtmlPage src="/pages/investir.html" />
    </SiteLayout>
  );
}
