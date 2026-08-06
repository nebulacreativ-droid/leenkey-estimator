/**
 * Options énergie partagées par les parcours.
 *
 * Le DPE est obligatoire à la vente pour tout bien bâti : logement, local
 * commercial ou bien d'exception. Seul le terrain y échappe. Ces listes vivent
 * hors des composants pour que les cinq parcours s'appuient sur les mêmes.
 */

export const CHAUFFAGE_OPTS = [
  "Gaz naturel",
  "Fioul",
  "Électrique",
  "Bois",
  "Pompe à chaleur",
  "Géothermie",
  "Réseau de chaleur urbain",
  "Autre",
];

export const CHAUFFAGE_MODES = ["Individuel", "Collectif", "Je ne sais pas"];

/* ------------------------------------------------------------------ */
/* Profil énergétique                                                  */
/* ------------------------------------------------------------------ */

/** Points forts détectables depuis les prestations déclarées. */
const ATOUTS_PRESTATIONS: Record<string, string> = {
  pac: "Pompe à chaleur",
  photovoltaique: "Panneaux photovoltaïques",
  ite: "Isolation thermique renforcée",
  chauffe_eau_solaire: "Eau chaude solaire ou thermodynamique",
  double_vitrage: "Double ou triple vitrage",
  plancher_chauffant: "Chauffage au sol",
  chaudiere_recente: "Chaudière récente",
  clim_reversible: "Climatisation réversible",
};

/** Chauffages pénalisants : coût, émissions, et fin programmée pour le fioul. */
const CHAUFFAGES_PENALISANTS = ["Fioul", "Électrique"];

export interface ProfilEnergetique {
  score: number;
  mention: string;
  titre: string;
  description: string;
  forts: string[];
  ameliorer: string[];
  /** Gain de valeur atteignable en traitant les points à améliorer, en %. */
  impactMin: number;
  impactMax: number;
}

/**
 * Synthèse énergétique affichée pendant la saisie.
 *
 * Elle n'invente rien : tout vient des réponses déjà données. Son intérêt est
 * de rendre visible, au moment où le vendeur remplit, ce que chaque réponse
 * fait à la valeur — plutôt que de le lui apprendre à la fin.
 */
export function profilEnergetique(form: {
  dpe: string | null;
  ges: string | null;
  dpe_date: string | null;
  audit_energetique: string | null;
  chauffage: string | null;
  chauffage_mode: string | null;
  derniere_renovation: string | null;
  annee_construction: string | null;
  prestations: string[];
  dpe_vise: string | null;
}): ProfilEnergetique {
  const forts: string[] = [];
  const ameliorer: string[] = [];

  // ── Base : l'étiquette DPE ──
  const parLettre: Record<string, number> = { A: 95, B: 85, C: 72, D: 58, E: 44, F: 28, G: 15 };
  let score = form.dpe && form.dpe !== "inconnu" ? parLettre[form.dpe] : 50;

  if (form.dpe && ["A", "B", "C"].includes(form.dpe)) forts.push(`Étiquette DPE ${form.dpe}`);
  if (form.dpe === "F" || form.dpe === "G") {
    ameliorer.push(`Étiquette DPE ${form.dpe} — location interdite pour les G`);
    if (form.audit_energetique === "Non réalisé")
      ameliorer.push("Audit énergétique obligatoire non réalisé");
  }
  if (form.ges && ["F", "G"].includes(form.ges)) ameliorer.push(`Étiquette GES ${form.ges}`);

  // ── Équipements ──
  for (const [cle, libelle] of Object.entries(ATOUTS_PRESTATIONS)) {
    if (form.prestations.includes(cle)) {
      forts.push(libelle);
      score += 3;
    }
  }
  if (!form.prestations.includes("double_vitrage")) ameliorer.push("Double vitrage absent");
  if (!form.prestations.includes("ite")) ameliorer.push("Isolation des murs à renforcer");

  // ── Chauffage ──
  if (form.chauffage && CHAUFFAGES_PENALISANTS.includes(form.chauffage)) {
    ameliorer.push(`Chauffage ${form.chauffage.toLowerCase()} — coûteux et mal noté`);
    score -= 6;
  } else if (form.chauffage) {
    forts.push(`Chauffage ${form.chauffage.toLowerCase()}`);
  }
  if (form.chauffage_mode === "Collectif") {
    ameliorer.push("Chauffage collectif — charges peu maîtrisables");
    score -= 3;
  }

  // ── Ancienneté du diagnostic ──
  if (form.dpe_date === "Avant juillet 2021") {
    ameliorer.push("DPE ancien à actualiser — non opposable");
    score -= 4;
  }
  if (form.derniere_renovation === "Il y a moins de 5 ans") {
    forts.push("Rénovation énergétique récente");
    score += 5;
  } else if (form.derniere_renovation === "Jamais" && form.annee_construction === "Avant 1950") {
    ameliorer.push("Bâti ancien jamais rénové");
    score -= 4;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── Gain atteignable ──
  // Si le vendeur a chiffré un objectif, on prend l'écart réel entre les deux
  // étiquettes. Sinon on borne par le nombre de points à traiter.
  const gainParLettre: Record<string, number> = { A: 6, B: 4, C: 1, D: 0, E: -4, F: -9, G: -13 };
  let impactMin = 0;
  let impactMax = 0;
  if (form.dpe_vise && form.dpe && form.dpe !== "inconnu" && form.dpe_vise !== "inconnu") {
    const gain = (gainParLettre[form.dpe_vise] ?? 0) - (gainParLettre[form.dpe] ?? 0);
    impactMin = Math.max(0, Math.round(gain * 0.6));
    impactMax = Math.max(0, gain);
  } else {
    impactMax = Math.min(12, ameliorer.length * 3);
    impactMin = ameliorer.length > 2 ? Math.round(impactMax / 3) : 0;
  }

  const mention =
    score >= 80 ? "Excellent" : score >= 60 ? "Bon" : score >= 40 ? "Moyen" : "Faible";
  const titre =
    score >= 80
      ? "Profil énergétique excellent"
      : score >= 60
        ? "Profil énergétique satisfaisant"
        : score >= 40
          ? "Profil énergétique perfectible"
          : "Profil énergétique défavorable";
  const description =
    score >= 80
      ? "Le bien se situe parmi les plus performants du marché : c'est un argument de vente à mettre en avant."
      : score >= 60
        ? "Le bien est globalement rassurant, avec quelques optimisations possibles."
        : score >= 40
          ? "Des travaux ciblés amélioreraient nettement la perception du bien à la vente."
          : "La performance énergétique va peser dans la négociation. Mieux vaut la documenter que la subir.";

  return { score, mention, titre, description, forts, ameliorer, impactMin, impactMax };
}
