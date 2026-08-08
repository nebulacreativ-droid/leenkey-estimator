import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HtmlPage } from "@/components/site/HtmlPage";

export const Route = createFileRoute("/faq")({
  component: Faq,
});

function Faq() {
  return (
    <SiteLayout>
      <HtmlPage src="/pages/faq.html" />
    </SiteLayout>
  );
}
