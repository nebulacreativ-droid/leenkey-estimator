import type { LeenkeyForm } from "./types";

export interface FactorImpact {
  label: string;
  impact: number; // percentage points, e.g. +5 or -3
  detail: string;
}

export interface Recommendation {
  title: string;
  description: string;
  uplift?: string;
}

export interface EstimationResult {
  prixEstime: number;
  prixBas: number;
  prixHaut: number;
  prixM2: number;
  prixM2Marche: number;
  deltaMarche: number; // %
  surface: number;
  fiabilite: "elevee" | "moyenne" | "faible";
  fiabiliteScore: number; // 0-100
  scoreAttractivite: number; // 0-100
  delaiVente: string;
  tensionMarche: "faible" | "moderee" | "forte";
  facteurs: FactorImpact[];
  recommandations: Recommendation[];
}

// Prix moyen au m² mocké par dept (FR)
const PRIX_DEPT: Record<string, number> = {
  "75": 10500,
  "92": 8200,
  "93": 4200,
  "94": 5400,
  "78": 4600,
  "77": 3200,
  "91": 3400,
  "95": 3300,
  "69": 5200,
  "13": 3700,
  "33": 4800,
  "31": 3900,
  "44": 4200,
  "67": 3400,
  "59": 3100,
  "06": 5500,
  "34": 3500,
  "35": 3700,
  "76": 2700,
  "83": 4200,
  "06_nice": 5100,
};

const PRIX_VILLE: Record<string, number> = {
  paris: 10500,
  lyon: 5200,
  bordeaux: 4800,
  marseille: 3600,
  nice: 5100,
  toulouse: 3900,
  nantes: 4200,
  rennes: 3700,
  strasbourg: 3400,
  lille: 3200,
  montpellier: 3500,
  cannes: 6500,
  versailles: 7800,
  annecy: 5800,
  biarritz: 6900,
};

const TENSION_DEPT: Record<string, "faible" | "moderee" | "forte"> = {
  "75": "forte",
  "92": "forte",
  "69": "forte",
  "33": "forte",
  "06": "forte",
  "13": "moderee",
  "31": "moderee",
  "44": "moderee",
  "59": "moderee",
  "67": "moderee",
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function basePrixM2(form: LeenkeyForm): number {
  const v = normalize(form.ville || "");
  if (v && PRIX_VILLE[v]) return PRIX_VILLE[v];
  const dept = (form.departement || form.code_postal || "").slice(0, 2);
  if (PRIX_DEPT[dept]) return PRIX_DEPT[dept];
  return 3500;
}

function tension(form: LeenkeyForm): "faible" | "moderee" | "forte" {
  const dept = (form.departement || form.code_postal || "").slice(0, 2);
  return TENSION_DEPT[dept] ?? "faible";
}

const TYPE_MULT: Record<string, number> = {
  maison: 1.0,
  appartement: 1.05,
  terrain: 0.4,
  local_commercial: 0.85,
  immeuble: 0.95,
  atypique: 1.1,
};

const ETAT_MULT: Record<string, { mult: number; label: string }> = {
  excellent: { mult: 1.08, label: "Excellent état" },
  bon: { mult: 1.0, label: "Bon état" },
  moyen: { mult: 0.93, label: "État moyen" },
  a_renover: { mult: 0.82, label: "À rénover" },
};

const DPE_MULT: Record<string, { mult: number; label: string }> = {
  A: { mult: 1.06, label: "DPE A — très performant" },
  B: { mult: 1.04, label: "DPE B — performant" },
  C: { mult: 1.01, label: "DPE C — correct" },
  D: { mult: 1.0, label: "DPE D — moyen" },
  E: { mult: 0.96, label: "DPE E — passoire modérée" },
  F: { mult: 0.91, label: "DPE F — passoire énergétique" },
  G: { mult: 0.87, label: "DPE G — passoire énergétique" },
  inconnu: { mult: 0.98, label: "DPE non renseigné" },
};

export function computeEstimation(
  form: LeenkeyForm,
  dvfPrixM2?: number | null,
): EstimationResult {
  const surface =
    form.surface_habitable ||
    form.surface_carrez ||
    (form.type === "terrain" ? form.surface_terrain || 0 : 0) ||
    60;

  // Prix moyen marché = mix entre table statique et DVF (si dispo)
  // DVF a 70% de poids car ce sont de vraies données, mais on garde 30% de la table
  // (qui peut compenser le délai DVF en estimant la tendance actuelle).
  const prixM2Table = basePrixM2(form);
  const prixM2Marche =
    dvfPrixM2 && dvfPrixM2 > 0
      ? Math.round(dvfPrixM2 * 0.7 + prixM2Table * 0.3)
      : prixM2Table;

  // Multiplicateurs
  const typeMult = TYPE_MULT[form.type ?? "maison"] ?? 1;
  const etatEntry = ETAT_MULT[form.etat ?? "bon"] ?? ETAT_MULT.bon;
  const dpeEntry = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;

  // Extérieur
  let extMult = 1;
  const extDetail: string[] = [];
  if (form.exterieur.includes("jardin")) {
    extMult += 0.04;
    extDetail.push("jardin");
  }
  if (form.exterieur.includes("terrasse")) {
    extMult += 0.03;
    extDetail.push("terrasse");
  }
  if (form.exterieur.includes("balcon")) {
    extMult += 0.015;
    extDetail.push("balcon");
  }
  if (form.exterieur.includes("piscine")) {
    extMult += 0.05;
    extDetail.push("piscine");
  }
  if (form.exterieur.includes("garage")) {
    extMult += 0.02;
    extDetail.push("garage");
  }

  // Prestations
  let prestMult = 1;
  const prestPremium = [
    "cheminee",
    "parking",
    "cave",
    "ascenseur",
    "climatisation",
    "alarme",
    "domotique",
    "fibre",
  ];
  let prestCount = 0;
  for (const p of form.prestations) {
    if (prestPremium.includes(p)) {
      prestMult += 0.01;
      prestCount += 1;
    }
  }

  // Étage / dernier étage
  let etageMult = 1;
  if (form.type === "appartement") {
    if (form.dernier_etage) etageMult += 0.02;
    if ((form.etage ?? 0) >= 3) etageMult += 0.01;
    if ((form.etage ?? 0) === 0) etageMult -= 0.02;
  }

  const globalMult = typeMult * etatEntry.mult * dpeEntry.mult * extMult * prestMult * etageMult;
  const prixM2 = Math.round(prixM2Marche * globalMult);
  const prixEstime = Math.round((prixM2 * surface) / 1000) * 1000;
  const deltaMarche = Math.round(((prixM2 - prixM2Marche) / prixM2Marche) * 100);

  // Score attractivité
  let score = 50;
  score += (etatEntry.mult - 1) * 200;
  score += (dpeEntry.mult - 1) * 200;
  score += (extMult - 1) * 200;
  score += Math.min(prestCount * 3, 15);
  if (form.type === "appartement" && form.dernier_etage) score += 4;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Fiabilité (complétude) — calculée AVANT la fourchette pour ajuster sa largeur
  const champsClés: Array<keyof LeenkeyForm> = [
    "type",
    "adresse",
    "code_postal",
    "ville",
    "surface_habitable",
    "pieces",
    "chambres",
    "etat",
    "dpe",
    "chauffage",
    "annee_construction",
  ];
  const complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  const fiabiliteScore = Math.round((complet / champsClés.length) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  // Fourchette précise — max ±3% en toute circonstance
  // Plus la fiabilité est haute → fourchette resserrée
  let rangePct = 0.03; // plafond : ±3%
  if (fiabilite === "elevee") rangePct = 0.02; // ±2%
  else if (fiabilite === "moyenne") rangePct = 0.025; // ±2,5%

  // Tension marché peut RESSERRER mais jamais élargir au-dessus de 3%
  const tensionMarcheTmp = tension(form);
  if (tensionMarcheTmp === "forte") rangePct *= 0.85;
  // (marché faible n'élargit plus la fourchette pour respecter le plafond 3%)

  // Garantie absolue du plafond
  rangePct = Math.min(rangePct, 0.03);

  const prixBas = Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000;
  const prixHaut = Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000;

  // Tension marché
  const tensionMarche = tensionMarcheTmp;

  // Délai
  let delaiBase: [number, number] = [60, 90];
  if (tensionMarche === "forte") delaiBase = [30, 50];
  else if (tensionMarche === "moderee") delaiBase = [45, 70];
  if (form.etat === "a_renover") delaiBase = [delaiBase[0] + 20, delaiBase[1] + 30];
  if (form.prix_souhaite && form.prix_souhaite > prixEstime * 1.1) {
    delaiBase = [delaiBase[0] + 15, delaiBase[1] + 25];
  }
  const delaiVente = `${delaiBase[0]}–${delaiBase[1]} jours`;

  // Facteurs
  const facteurs: FactorImpact[] = [
    {
      label: "Localisation",
      impact: deltaMarche === 0 ? 0 : Math.round(deltaMarche / 2),
      detail: `${form.ville || "Zone"} · ${prixM2Marche.toLocaleString("fr-FR")} €/m² moyen`,
    },
    {
      label: "État général",
      impact: Math.round((etatEntry.mult - 1) * 100),
      detail: etatEntry.label,
    },
    {
      label: "Performance énergétique",
      impact: Math.round((dpeEntry.mult - 1) * 100),
      detail: dpeEntry.label,
    },
    {
      label: "Extérieur",
      impact: Math.round((extMult - 1) * 100),
      detail: extDetail.length ? extDetail.join(", ") : "Aucun extérieur renseigné",
    },
    {
      label: "Prestations",
      impact: Math.round((prestMult - 1) * 100),
      detail: prestCount ? `${prestCount} prestation${prestCount > 1 ? "s" : ""} premium` : "Standard",
    },
  ];
  if (form.type === "appartement") {
    facteurs.push({
      label: "Étage & exposition",
      impact: Math.round((etageMult - 1) * 100),
      detail: form.dernier_etage ? "Dernier étage" : `Étage ${form.etage ?? "?"}`,
    });
  }

  // Recommandations
  const recommandations: Recommendation[] = [];
  if (form.dpe && ["E", "F", "G"].includes(form.dpe)) {
    recommandations.push({
      title: "Améliorer la performance énergétique",
      description: `Passer d'un DPE ${form.dpe} à un DPE C/D pourrait revaloriser votre bien.`,
      uplift: "+5 à 10%",
    });
  }
  if (form.etat === "a_renover" || form.etat === "moyen") {
    recommandations.push({
      title: "Rafraîchir avant mise en vente",
      description: "Peinture, sols et cuisine refaits accélèrent fortement la vente.",
      uplift: "+3 à 7%",
    });
  }
  if (!form.exterieur.length && form.type === "appartement") {
    recommandations.push({
      title: "Mettre en valeur les atouts manquants",
      description: "Soignez la luminosité et le home staging pour compenser l'absence d'extérieur.",
    });
  }
  if (form.prix_souhaite && form.prix_souhaite > prixEstime * 1.08) {
    recommandations.push({
      title: "Ajuster le prix de mise en vente",
      description: `Votre prix souhaité (${form.prix_souhaite.toLocaleString(
        "fr-FR",
      )} €) est au-dessus du marché. Un prix proche de l'estimation accélère la vente.`,
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Préparer un dossier de vente complet",
      description: "Diagnostics à jour, factures de travaux, taxe foncière : un dossier complet rassure les acheteurs.",
    });
  }

  return {
    prixEstime,
    prixBas,
    prixHaut,
    prixM2,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

export function formatEUR(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
