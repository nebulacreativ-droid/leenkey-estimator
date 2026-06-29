import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { IframePage } from "@/components/site/IframePage";

export const Route = createFileRoute("/qui-sommes-nous")({
  component: QuiSommesNousPage,
});

function QuiSommesNousPage() {
  return (
    <SiteLayout>
      <IframePage src="/pages/qui-sommes-nous.html" title="Qui sommes-nous — Leenkey" />
    </SiteLayout>
  );
}
