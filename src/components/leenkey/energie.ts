/**
 * Options énergie partagées par les parcours.
 *
 * Le DPE est obligatoire à la vente pour tout bien bâti : logement, local
 * commercial ou bien d'exception. Seul le terrain y échappe. Ces listes vivent
 * hors des composants pour que les cinq parcours s'appuient sur les mêmes.
 */

export const CHAUFFAGE_OPTS = [
  "Pompe à chaleur",
  "Gaz naturel",
  "Électrique",
  "Bois",
  "Fioul",
  "Géothermie",
  "Réseau de chaleur urbain",
  "Autre",
];

/** Précisions ouvertes selon le chauffage choisi. */
export const PAC_TYPES = ["Air / Air", "Air / Eau", "Géothermique", "Je ne sais pas"];
export const CHAUDIERE_GAZ_TYPES = ["À condensation", "Classique", "Je ne sais pas"];
export const BOIS_TYPES = ["Poêle", "Insert", "Chaudière", "Je ne sais pas"];

export const EAU_CHAUDE_OPTS = [
  "Ballon thermodynamique",
  "Chauffe-eau électrique",
  "Chauffe-eau gaz",
  "Chauffe-eau solaire",
  "Production instantanée gaz",
  "Autre",
];

export const DPE_DATES = ["Avant juillet 2021", "Après juillet 2021", "Je ne sais pas"];
export const AUDIT_OPTS = ["Réalisé", "Non réalisé", "Je ne sais pas"];

export const ISOLATION_COMBLES = ["Oui", "Non", "Je ne sais pas"];
export const ISOLATION_MURS = [
  "Isolation intérieure",
  "Isolation extérieure",
  "Aucune",
  "Je ne sais pas",
];
export const FENETRES_OPTS = [
  "Simple vitrage",
  "Double vitrage ancien",
  "Double vitrage récent",
  "Triple vitrage",
  "Je ne sais pas",
];
export const VENTILATION_OPTS = [
  "Naturelle",
  "VMC simple flux",
  "VMC double flux",
  "Aucune",
  "Je ne sais pas",
];

export const EQUIPEMENTS_ENERGIE = [
  "Climatisation",
  "Panneaux photovoltaïques",
  "Chauffe-eau solaire",
  "Batterie domestique",
  "Borne de recharge véhicule électrique",
];
export const TRAVAUX_ENERGIE = [
  "Isolation toiture",
  "Isolation murs",
  "Isolation plancher bas",
  "Fenêtres",
  "Pompe à chaleur",
  "Ballon thermodynamique",
  "Panneaux photovoltaïques",
  "VMC",
];

export const ANNEES_CONSTRUCTION = [
  "Avant 1950",
  "1950–1970",
  "1971–1990",
  "1991–2000",
  "2001–2010",
  "2011–2020",
  "Après 2020",
];
export const RENOVATIONS = [
  "Jamais",
  "Il y a plus de 10 ans",
  "Il y a 5 à 10 ans",
  "Il y a moins de 5 ans",
];

export const CHAUFFAGE_MODES = ["Individuel", "Collectif", "Je ne sais pas"];

/* ------------------------------------------------------------------ */
/* Profil énergétique                                                  */
/* ------------------------------------------------------------------ */

/** Chauffages vertueux et pénalisants. */
const CHAUFFAGES_VERTUEUX = ["Pompe à chaleur", "Géothermie", "Bois", "Réseau de chaleur urbain"];
const CHAUFFAGES_PENALISANTS = ["Fioul", "Électrique"];
const EAU_CHAUDE_VERTUEUSE = ["Ballon thermodynamique", "Chauffe-eau solaire"];
const ANNEES_RECENTES = ["2011–2020", "Après 2020"];
const ANNEES_ANCIENNES = ["Avant 1950", "1950–1970"];

/**
 * Effet des réponses énergétiques sur la valeur, en plus du multiplicateur DPE
 * déjà appliqué par le moteur.
 *
 * Ces postes étaient portés par l'étape Prestations ; en les déplaçant vers
 * l'étape Énergie, leur poids avait disparu du calcul. Ils y reviennent, en
 * plus fin : l'isolation des combles et des murs pèse plus qu'un volet
 * roulant.
 */
export function impactEnergie(form: EntreeProfil): number {
  let m = 0;

  if (form.isolation_combles === "Oui") m += 0.01;
  else if (form.isolation_combles === "Non") m -= 0.02;

  if (form.isolation_murs === "Isolation extérieure") m += 0.02;
  else if (form.isolation_murs === "Isolation intérieure") m += 0.01;
  else if (form.isolation_murs === "Aucune") m -= 0.02;

  if (form.fenetres === "Triple vitrage") m += 0.015;
  else if (form.fenetres === "Double vitrage récent") m += 0.01;
  else if (form.fenetres === "Double vitrage ancien") m -= 0.005;
  else if (form.fenetres === "Simple vitrage") m -= 0.02;

  if (form.ventilation === "VMC double flux") m += 0.015;
  else if (form.ventilation === "VMC simple flux") m += 0.005;
  else if (form.ventilation === "Aucune") m -= 0.01;

  if (CHAUFFAGES_VERTUEUX.includes(form.chauffage ?? "")) m += 0.015;
  else if (CHAUFFAGES_PENALISANTS.includes(form.chauffage ?? "")) m -= 0.02;

  for (const e of form.equipements_energie ?? []) {
    m += e === "Panneaux photovoltaïques" ? 0.02 : 0.005;
  }
  m += Math.min((form.travaux_energie ?? []).length * 0.005, 0.02);

  // Borné : ce volet affine l'estimation, il ne doit pas la piloter.
  return Math.max(-0.08, Math.min(0.08, m));
}

export interface ProfilEnergetique {
  score: number;
  mention: string;
  titre: string;
  description: string;
  forts: string[];
  ameliorer: string[];
  /** Champs encore vides qui affineraient le profil. */
  manquants: string[];
  impactMin: number;
  impactMax: number;
  /** Faux tant qu'aucune réponse ne permet de chiffrer l'impact. */
  calculable: boolean;
  /** Conseil principal, déduit du poste le plus pénalisant. */
  recommandation: string | null;
}

type EntreeProfil = {
  dpe: string | null;
  ges: string | null;
  dpe_date: string | null;
  audit_energetique: string | null;
  chauffage: string | null;
  chauffage_mode: string | null;
  pac_type: string | null;
  bois_type: string | null;
  chaudiere_gaz_type: string | null;
  eau_chaude: string | null;
  isolation_combles: string | null;
  isolation_murs: string | null;
  fenetres: string | null;
  ventilation: string | null;
  equipements_energie: string[];
  travaux_energie: string[];
  derniere_renovation: string | null;
  annee_construction: string | null;
  etat: string | null;
};

/**
 * Synthèse énergétique affichée pendant la saisie.
 *
 * Elle s'appuie sur toutes les réponses déjà données — étiquettes, chauffage,
 * isolation, ventilation, équipements, travaux, époque du bâti — et se
 * densifie au fil du remplissage plutôt que d'attendre la fin.
 */
export function profilEnergetique(form: EntreeProfil): ProfilEnergetique {
  const forts: string[] = [];
  const ameliorer: string[] = [];
  const manquants: string[] = [];

  const parLettre: Record<string, number> = { A: 95, B: 85, C: 72, D: 58, E: 44, F: 28, G: 15 };
  const dpeConnu = !!form.dpe && form.dpe !== "inconnu";
  let score = dpeConnu ? parLettre[form.dpe as string] : 45;

  // ── Étiquettes ──
  if (dpeConnu) {
    const d = form.dpe as string;
    if (["A", "B", "C"].includes(d)) forts.push(`DPE ${d} favorable`);
    else if (d === "D") forts.push("Étiquette DPE D — dans la moyenne du parc");
    else ameliorer.push(`Étiquette DPE ${d}${d === "G" ? " — location interdite" : ""}`);
  } else manquants.push("l'étiquette DPE");

  if (form.ges && form.ges !== "inconnu") {
    if (["A", "B", "C"].includes(form.ges)) forts.push(`Étiquette GES ${form.ges}`);
    else if (["F", "G"].includes(form.ges)) ameliorer.push(`Étiquette GES ${form.ges}`);
  } else manquants.push("l'étiquette GES");

  if (form.dpe_date === "Après juillet 2021") forts.push("Diagnostic à jour et opposable");
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
      const precision =
        form.chauffage === "Pompe à chaleur" && form.pac_type && form.pac_type !== "Je ne sais pas"
          ? ` ${form.pac_type}`
          : form.chauffage === "Bois" && form.bois_type && form.bois_type !== "Je ne sais pas"
            ? ` — ${form.bois_type.toLowerCase()}`
            : "";
      forts.push(`Chauffage ${form.chauffage.toLowerCase()}${precision}`);
      score += 6;
    } else if (CHAUFFAGES_PENALISANTS.includes(form.chauffage)) {
      ameliorer.push(`Chauffage ${form.chauffage.toLowerCase()} — coûteux et mal noté`);
      score -= 7;
    } else if (form.chauffage === "Gaz naturel") {
      if (form.chaudiere_gaz_type === "À condensation") {
        forts.push("Chaudière gaz à condensation");
        score += 2;
      } else if (form.chaudiere_gaz_type === "Classique") {
        ameliorer.push("Chaudière gaz classique — rendement dépassé");
        score -= 3;
      }
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

  // ── Isolation et ventilation : le premier levier d'un DPE ──
  if (form.isolation_combles === "Oui") {
    forts.push("Combles isolés");
    score += 6;
  } else if (form.isolation_combles === "Non") {
    ameliorer.push("Combles non isolés");
    score -= 7;
  } else manquants.push("l'isolation des combles");

  if (form.isolation_murs === "Isolation extérieure") {
    forts.push("Isolation des murs par l'extérieur");
    score += 7;
  } else if (form.isolation_murs === "Isolation intérieure") {
    forts.push("Murs isolés par l'intérieur");
    score += 4;
  } else if (form.isolation_murs === "Aucune") {
    ameliorer.push("Isolation des murs absente");
    score -= 7;
  } else manquants.push("l'isolation des murs");

  if (form.fenetres === "Triple vitrage" || form.fenetres === "Double vitrage récent") {
    forts.push(form.fenetres);
    score += 4;
  } else if (form.fenetres === "Simple vitrage") {
    ameliorer.push("Simple vitrage — à remplacer en priorité");
    score -= 6;
  } else if (form.fenetres === "Double vitrage ancien") {
    ameliorer.push("Double vitrage ancien — rendement limité");
    score -= 2;
  } else manquants.push("le type de fenêtres");

  if (form.ventilation === "VMC double flux") {
    forts.push("VMC double flux");
    score += 5;
  } else if (form.ventilation === "VMC simple flux") {
    forts.push("VMC simple flux");
    score += 2;
  } else if (form.ventilation === "Aucune") {
    ameliorer.push("Absence de ventilation mécanique");
    score -= 4;
  } else manquants.push("la ventilation");

  // ── Équipements et travaux ──
  for (const e of form.equipements_energie ?? []) {
    forts.push(e);
    score += e === "Panneaux photovoltaïques" ? 5 : 2;
  }
  for (const t of form.travaux_energie ?? []) {
    forts.push(`Travaux réalisés : ${t.toLowerCase()}`);
    score += 2;
  }
  if (!(form.equipements_energie ?? []).length && !(form.travaux_energie ?? []).length)
    manquants.push("les équipements et travaux");

  // ── Contexte du bâti ──
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

  if (form.etat === "excellent") score += 3;
  else if (form.etat === "a_renover") score -= 4;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── Gain atteignable ──
  // Impact réel des réponses sur la valeur : l'étiquette DPE, plus les postes
  // d'isolation, de ventilation et d'équipement. Il peut être négatif.
  const gainParLettre: Record<string, number> = { A: 6, B: 4, C: 1, D: 0, E: -4, F: -9, G: -13 };
  const pct = (dpeConnu ? (gainParLettre[form.dpe as string] ?? 0) : 0) + impactEnergie(form) * 100;
  // Fourchette d'un point de part et d'autre : c'est une estimation, pas une
  // mesure. « −2 % à 0 % » se lit mieux et se défend mieux que « −1 % ».
  const impactMin = Math.round(pct) - 1;
  const impactMax = Math.round(pct) + 1;
  const calculable = dpeConnu || manquants.length < 8;

  // ── Recommandation : le poste le plus rentable en premier ──
  let recommandation: string | null = null;
  if (form.isolation_combles === "Non")
    recommandation =
      "Commencez par isoler les combles : c'est le poste le moins cher et le plus rentable, jusqu'à 30 % des déperditions.";
  else if (form.fenetres === "Simple vitrage")
    recommandation =
      "Remplacer le simple vitrage est le levier suivant, autant pour le DPE que pour le confort ressenti à la visite.";
  else if (form.isolation_murs === "Aucune")
    recommandation =
      "L'isolation des murs est le chantier le plus lourd, mais celui qui fait gagner le plus de classes au DPE.";
  else if (CHAUFFAGES_PENALISANTS.includes(form.chauffage ?? ""))
    recommandation =
      "Remplacer le chauffage fioul ou électrique par une pompe à chaleur change l'étiquette et le budget de l'acheteur.";
  else if (form.dpe_date === "Avant juillet 2021")
    recommandation =
      "Faites refaire le DPE : celui d'avant juillet 2021 n'est plus opposable et sera exigé à la vente.";
  else if (forts.length >= 5)
    recommandation =
      "Le bien est bien positionné : mettez ces atouts en avant dans l'annonce, ils rassurent sur les charges à venir.";

  const mention =
    score >= 80 ? "Excellent" : score >= 60 ? "Moyen" : score >= 40 ? "Faible" : "Critique";
  const titre =
    score >= 80
      ? "Profil énergétique favorable"
      : score >= 60
        ? "Profil à optimiser"
        : score >= 40
          ? "Profil à renforcer"
          : "Profil énergétique défavorable";
  const description =
    score >= 80
      ? "Le bien se situe parmi les plus performants du marché : c'est un argument de vente à mettre en avant."
      : score >= 60
        ? "Certains critères peuvent ralentir la décision des acquéreurs."
        : score >= 40
          ? "Des travaux ciblés amélioreraient nettement la perception du bien à la vente."
          : "La performance énergétique va peser dans la négociation. Mieux vaut la documenter que la subir.";

  return {
    score,
    mention,
    titre,
    description,
    forts,
    ameliorer,
    manquants,
    impactMin,
    impactMax,
    calculable,
    recommandation,
  };
}
