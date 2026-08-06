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

/** Équipements qui pèsent favorablement, avec leur poids sur le score. */
const ATOUTS_PRESTATIONS: Record<string, { l: string; p: number }> = {
  pac: { l: "Pompe à chaleur", p: 5 },
  photovoltaique: { l: "Panneaux photovoltaïques", p: 5 },
  ite: { l: "Isolation thermique renforcée", p: 5 },
  chauffe_eau_solaire: { l: "Eau chaude solaire ou thermodynamique", p: 4 },
  plancher_chauffant: { l: "Chauffage au sol", p: 3 },
  chaudiere_recente: { l: "Chaudière récente", p: 3 },
  double_vitrage: { l: "Double ou triple vitrage", p: 3 },
  clim_reversible: { l: "Climatisation réversible", p: 2 },
  volets_elec: { l: "Volets roulants électriques", p: 1 },
  poele_bois: { l: "Poêle à bois ou cheminée", p: 1 },
};

/** Chauffages vertueux et pénalisants. */
const CHAUFFAGES_VERTUEUX = ["Pompe à chaleur", "Géothermie", "Bois", "Réseau de chaleur urbain"];
const CHAUFFAGES_PENALISANTS = ["Fioul", "Électrique"];

const EAU_CHAUDE_VERTUEUSE = ["Ballon thermodynamique", "Chauffe-eau solaire"];

/** Périodes de construction associées à une réglementation thermique. */
const ANNEES_RECENTES = ["2011-2020", "Après 2020"];
const ANNEES_ANCIENNES = ["Avant 1950", "1950-1970"];

export interface ProfilEnergetique {
  score: number;
  mention: string;
  titre: string;
  description: string;
  forts: string[];
  ameliorer: string[];
  /** Champs encore vides qui affineraient le profil. */
  manquants: string[];
  /** Gain de valeur atteignable en traitant les points à améliorer, en %. */
  impactMin: number;
  impactMax: number;
}

/**
 * Synthèse énergétique affichée pendant la saisie.
 *
 * Elle s'appuie sur tout ce que le vendeur a déjà renseigné — état général,
 * époque de construction, extérieurs, prestations, chauffage — et pas
 * seulement sur les champs de l'étape en cours. Sinon le panneau reste quasi
 * vide à l'arrivée sur l'étape, alors que le formulaire contient déjà de quoi
 * dire beaucoup.
 */
export function profilEnergetique(form: {
  dpe: string | null;
  ges: string | null;
  dpe_date: string | null;
  audit_energetique: string | null;
  chauffage: string | null;
  chauffage_mode: string | null;
  eau_chaude: string | null;
  derniere_renovation: string | null;
  annee_construction: string | null;
  etat: string | null;
  exterieur: string[];
  prestations: string[];
  dpe_vise: string | null;
}): ProfilEnergetique {
  const forts: string[] = [];
  const ameliorer: string[] = [];
  const manquants: string[] = [];

  // ── Étiquettes ──
  const parLettre: Record<string, number> = { A: 95, B: 85, C: 72, D: 58, E: 44, F: 28, G: 15 };
  const dpeConnu = !!form.dpe && form.dpe !== "inconnu";
  let score = dpeConnu ? parLettre[form.dpe as string] : 50;

  if (dpeConnu) {
    const d = form.dpe as string;
    if (["A", "B", "C"].includes(d)) forts.push(`Étiquette DPE ${d}`);
    else if (d === "D") forts.push("Étiquette DPE D — dans la moyenne du parc");
    else ameliorer.push(`Étiquette DPE ${d}${d === "G" ? " — location interdite" : ""}`);
  } else {
    manquants.push("l'étiquette DPE");
  }

  if (form.ges && form.ges !== "inconnu") {
    if (["A", "B", "C"].includes(form.ges)) forts.push(`Étiquette GES ${form.ges}`);
    else if (["F", "G"].includes(form.ges)) ameliorer.push(`Étiquette GES ${form.ges}`);
  } else {
    manquants.push("l'étiquette GES");
  }

  if (form.dpe_date === "Depuis juillet 2021") forts.push("Diagnostic à jour et opposable");
  else if (form.dpe_date === "Avant juillet 2021") {
    ameliorer.push("DPE ancien à actualiser — non opposable");
    score -= 4;
  } else if (dpeConnu) manquants.push("la date du DPE");

  if (form.dpe === "F" || form.dpe === "G") {
    if (form.audit_energetique === "Réalisé") forts.push("Audit énergétique réalisé");
    else if (form.audit_energetique === "Non réalisé")
      ameliorer.push("Audit énergétique obligatoire non réalisé");
    else manquants.push("l'audit énergétique");
  }

  // ── Chauffage et eau chaude ──
  if (form.chauffage) {
    if (CHAUFFAGES_VERTUEUX.includes(form.chauffage)) {
      forts.push(`Chauffage ${form.chauffage.toLowerCase()}`);
      score += 5;
    } else if (CHAUFFAGES_PENALISANTS.includes(form.chauffage)) {
      ameliorer.push(`Chauffage ${form.chauffage.toLowerCase()} — coûteux et mal noté`);
      score -= 6;
    }
  } else manquants.push("le type de chauffage");

  if (form.chauffage_mode === "Individuel") forts.push("Chauffage individuel");
  else if (form.chauffage_mode === "Collectif") {
    ameliorer.push("Chauffage collectif — charges peu maîtrisables");
    score -= 3;
  }

  if (form.eau_chaude) {
    if (EAU_CHAUDE_VERTUEUSE.includes(form.eau_chaude)) {
      forts.push(form.eau_chaude);
      score += 3;
    } else if (form.eau_chaude === "Chauffe-eau électrique") {
      ameliorer.push("Eau chaude électrique — poste de consommation élevé");
      score -= 2;
    }
  } else manquants.push("la production d'eau chaude");

  // ── Le bâti ──
  if (form.annee_construction) {
    if (ANNEES_RECENTES.includes(form.annee_construction)) {
      forts.push(
        `Construction ${form.annee_construction.toLowerCase()} — réglementation thermique récente`,
      );
      score += 6;
    } else if (ANNEES_ANCIENNES.includes(form.annee_construction)) {
      ameliorer.push(
        `Bâti ${form.annee_construction.toLowerCase()} — antérieur à toute réglementation thermique`,
      );
      score -= 4;
    }
  } else manquants.push("l'année de construction");

  if (form.derniere_renovation === "Il y a moins de 5 ans") {
    forts.push("Rénovation énergétique récente");
    score += 6;
  } else if (form.derniere_renovation === "Il y a 5 à 10 ans") {
    forts.push("Rénovation énergétique il y a moins de 10 ans");
    score += 3;
  } else if (form.derniere_renovation === "Jamais") {
    ameliorer.push("Aucune rénovation énergétique réalisée");
    score -= 3;
  } else if (!form.derniere_renovation) manquants.push("la dernière rénovation");

  if (form.etat === "excellent") {
    forts.push("Bien en excellent état");
    score += 3;
  } else if (form.etat === "a_renover") {
    ameliorer.push("Bien à rénover entièrement");
    score -= 4;
  }

  // ── Équipements déjà déclarés à l'étape Prestations ──
  for (const [cle, a] of Object.entries(ATOUTS_PRESTATIONS)) {
    if (form.prestations.includes(cle)) {
      forts.push(a.l);
      score += a.p;
    }
  }
  if (form.prestations.length === 0) manquants.push("les prestations du bien");
  else {
    if (!form.prestations.includes("double_vitrage")) ameliorer.push("Double vitrage absent");
    if (!form.prestations.includes("ite")) ameliorer.push("Isolation des murs à renforcer");
  }
  if (form.exterieur.includes("solaire")) forts.push("Panneaux solaires");

  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── Gain atteignable ──
  // Si le vendeur a fixé un objectif, on prend l'écart réel entre les deux
  // étiquettes. Sinon on borne par le nombre de leviers identifiés.
  const gainParLettre: Record<string, number> = { A: 6, B: 4, C: 1, D: 0, E: -4, F: -9, G: -13 };
  let impactMin = 0;
  let impactMax = 0;
  if (form.dpe_vise && form.dpe_vise !== "inconnu" && dpeConnu) {
    const gain = (gainParLettre[form.dpe_vise] ?? 0) - (gainParLettre[form.dpe as string] ?? 0);
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

  return { score, mention, titre, description, forts, ameliorer, manquants, impactMin, impactMax };
}
