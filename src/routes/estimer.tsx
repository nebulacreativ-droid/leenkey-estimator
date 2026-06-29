import { createFileRoute } from "@tanstack/react-router";
import { LeenkeyWizard } from "@/components/leenkey/Wizard";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

// On affiche Navbar + Footer pour la cohérence avec le reste du site.
// Le wizard a sa propre barre de nav fixe en bas pendant le formulaire ;
// elle disparait sur le dashboard (post-submit) → le footer reste visible.
export const Route = createFileRoute("/estimer")({
  component: Estimer,
});

function Estimer() {
  return (
    <>
      <Navbar />
      <main>
        <LeenkeyWizard />
      </main>
      <Footer />
    </>
  );
}
