import type { LeenkeyForm } from "./types";
import { POSTES_TECHNIQUES, statsLocatives, totalCharges } from "./immeuble-calc";

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
  const connue = TENSION_DEPT[dept];
  if (connue) return connue;
  // La table ne couvre que 10 départements sur 101 : partout ailleurs elle
  // renvoyait "faible", y compris à Rennes, Montpellier ou Annecy. À défaut,
  // le niveau de prix est le meilleur indicateur disponible — un marché cher
  // est un marché où la demande excède l'offre.
  const prix = basePrixM2(form);
  if (prix >= 5000) return "forte";
  if (prix >= 3300) return "moderee";
  return "faible";
}

/**
 * Taux de capitalisation attendu par un investisseur, déduit du niveau de prix
 * local. Un marché cher est un marché à faible rendement : un immeuble se
 * négocie autour de 3,5 % à Paris et de 9 % en zone rurale.
 */
function tauxCapitalisation(prixM2: number): number {
  if (prixM2 >= 8000) return 0.035;
  if (prixM2 >= 6000) return 0.04;
  if (prixM2 >= 4500) return 0.0475;
  if (prixM2 >= 3500) return 0.055;
  if (prixM2 >= 2500) return 0.065;
  if (prixM2 >= 1500) return 0.075;
  return 0.09;
}

// "terrain" ne figure plus ici : il a son propre modèle (computeTerrainEstimation).
const TYPE_MULT: Record<string, number> = {
  maison: 1.0,
  appartement: 1.05,
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

/**
 * Poids de chaque prestation dans le prix.
 *
 * ⚠️ L'ancienne liste ne correspondait à presque rien : sur les 34 prestations
 * du formulaire, elle n'en reconnaissait que 3 (alarme, domotique, fibre).
 * "parking", "cave" et "ascenseur" sont dans `exterieur`, pas dans
 * `prestations`, et "cheminee" / "climatisation" n'existent nulle part. Une
 * page entière de questions ne pesait donc que +3 % au maximum : un bien avec
 * PAC, photovoltaïque, ITE, plancher chauffant et vue mer était valorisé comme
 * un bien nu.
 */
const PRESTATION_POIDS: Record<string, number> = {
  // Fort impact — équipements coûteux à installer
  pac: 0.015,
  photovoltaique: 0.015,
  ite: 0.015,
  plancher_chauffant: 0.012,
  clim_reversible: 0.012,
  vue_degagee: 0.015,
  ilot: 0.01,
  // Impact moyen
  cuisine_equipee: 0.008,
  sdb_renovee: 0.008,
  douche_italienne: 0.008,
  plan_pierre: 0.008,
  chaudiere_recente: 0.008,
  chauffe_eau_solaire: 0.008,
  double_vitrage: 0.008,
  parquet: 0.008,
  calme: 0.008,
  lumineux: 0.008,
  quartier_recherche: 0.008,
  immeuble_recent: 0.008,
  construction_recente: 0.008,
  residence_securisee: 0.008,
  // Impact faible — confort, sans effet structurel sur le prix
  volets_elec: 0.004,
  pergola: 0.004,
  carrelage_pierre: 0.004,
  moulures: 0.004,
  dressing: 0.004,
  placards: 0.004,
  cuisine_semi: 0.004,
  baignoire_ilot: 0.004,
  double_vasque: 0.004,
  poele_bois: 0.004,
  fibre: 0.004,
  domotique: 0.004,
  alarme: 0.004,
  portail_motorise: 0.004,
};
/** Plafond global : un bien tout équipé vaut ~12 % de plus qu'un bien nu, pas le double. */
const PRESTATION_CAP = 0.12;

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

/* ------------------------------------------------------------------ */
/* TERRAIN                                                             */
/* ------------------------------------------------------------------ */

/**
 * Prix moyen du m² de terrain à bâtir viabilisé, par département (€/m²).
 *
 * ⚠️ Ce sont des ordres de grandeur. Ils remplacent l'ancien calcul
 * (0,4 × prix du m² bâti), qui surévaluait les terrains d'un facteur 5 à 10 :
 * un terrain de 800 m² en zone à 3 500 €/m² bâti en ressortait à 1,1 M€.
 * À recalibrer sur les mutations DVF de nature « terrain à bâtir ».
 */
const PRIX_M2_TERRAIN: Record<string, number> = {
  "75": 1500,
  "92": 900,
  "94": 550,
  "93": 450,
  "78": 400,
  "91": 300,
  "95": 280,
  "77": 220,
  "06": 450,
  "83": 300,
  "13": 320,
  "84": 200,
  "04": 120,
  "05": 130,
  "69": 300,
  "74": 400,
  "73": 300,
  "38": 220,
  "01": 200,
  "42": 100,
  "07": 120,
  "26": 150,
  "33": 250,
  "40": 200,
  "64": 250,
  "24": 90,
  "47": 80,
  "31": 220,
  "34": 300,
  "30": 180,
  "66": 200,
  "11": 120,
  "81": 100,
  "82": 100,
  "32": 80,
  "65": 80,
  "09": 70,
  "12": 70,
  "46": 70,
  "48": 60,
  "44": 250,
  "85": 200,
  "35": 200,
  "56": 180,
  "29": 150,
  "22": 120,
  "49": 150,
  "53": 80,
  "72": 90,
  "41": 90,
  "45": 120,
  "37": 130,
  "36": 60,
  "18": 70,
  "28": 120,
  "59": 150,
  "62": 100,
  "80": 90,
  "02": 70,
  "60": 150,
  "67": 200,
  "68": 180,
  "57": 120,
  "54": 100,
  "88": 60,
  "55": 50,
  "08": 50,
  "51": 110,
  "10": 80,
  "52": 45,
  "21": 120,
  "71": 80,
  "58": 45,
  "89": 90,
  "39": 70,
  "25": 130,
  "70": 55,
  "90": 120,
  "63": 130,
  "03": 60,
  "15": 55,
  "43": 70,
  "87": 70,
  "19": 60,
  "23": 25,
  "16": 70,
  "17": 200,
  "79": 80,
  "86": 80,
  "14": 160,
  "50": 100,
  "61": 60,
  "27": 120,
  "76": 120,
  "2A": 350,
  "2B": 300,
  "971": 200,
  "972": 200,
  "973": 100,
  "974": 300,
  "976": 150,
};
const PRIX_M2_TERRAIN_DEFAUT = 70;

/** Nature du terrain : rapport au prix d'un terrain à bâtir équivalent. */
const NATURE_MULT: Record<string, { mult: number; label: string }> = {
  a_batir: { mult: 1, label: "Terrain à bâtir" },
  commercial: { mult: 0.85, label: "Terrain commercial / industriel" },
  loisirs: { mult: 0.15, label: "Terrain de loisirs" },
  non_constructible: { mult: 0.04, label: "Terrain non constructible" },
  agricole: { mult: 0.012, label: "Terrain agricole" },
  forestier: { mult: 0.008, label: "Terrain forestier" },
};

/**
 * Coût de raccordement d'un réseau manquant (€).
 * Déduit en montant fixe et non en pourcentage : viabiliser coûte le même prix
 * sur 300 m² que sur 3 000 m², alors qu'un pourcentage écraserait les petites
 * parcelles.
 */
const COUT_VIABILISATION: Record<string, { cout: number; label: string }> = {
  eau: { cout: 3000, label: "eau potable" },
  electricite: { cout: 3000, label: "électricité" },
  assainissement: { cout: 5000, label: "tout-à-l'égout" },
  gaz: { cout: 1500, label: "gaz" },
  fibre: { cout: 500, label: "fibre" },
};

const TOPO_MULT: Record<string, number> = {
  Plat: 1,
  "Pente légère": 0.95,
  "Forte pente": 0.82,
};

const VUE_BONUS: Record<string, number> = {
  Mer: 0.15,
  Montagne: 0.08,
  Dégagée: 0.05,
  Forêt: 0.03,
  Campagne: 0.02,
  Ville: 0,
};

const SITUATION_MULT: Record<string, number> = {
  "Centre-ville": 1.1,
  Lotissement: 1,
  Hameau: 0.85,
  "Zone isolée": 0.7,
};

const CONTRAINTE_MALUS: Record<string, { malus: number; label: string }> = {
  inondation: { malus: 0.15, label: "zone inondable" },
  ppr: { malus: 0.12, label: "PPR" },
  natura2000: { malus: 0.1, label: "Natura 2000" },
  servitudes: { malus: 0.07, label: "servitudes" },
  argiles: { malus: 0.05, label: "retrait-gonflement des argiles" },
  monuments: { malus: 0.05, label: "abords de monument historique" },
};

const POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  permis_existant: { bonus: 0.12, label: "permis accordé" },
  divisible: { bonus: 0.1, label: "divisible" },
  certificat_urbanisme: { bonus: 0.05, label: "certificat d'urbanisme" },
  libre_constructeur: { bonus: 0.04, label: "libre de constructeur" },
  borne: { bonus: 0.03, label: "borné" },
  etude_sol: { bonus: 0.03, label: "étude de sol" },
  projet_etudie: { bonus: 0.03, label: "projet étudié" },
};

function basePrixM2Terrain(form: LeenkeyForm): number {
  const cp = (form.code_postal || form.departement || "").trim();
  // DOM : 3 chiffres (971xx…), Corse : 20xxx → 2A/2B, métropole : 2 chiffres.
  const dom = cp.slice(0, 3);
  if (PRIX_M2_TERRAIN[dom]) return PRIX_M2_TERRAIN[dom];
  if (cp.startsWith("20")) return PRIX_M2_TERRAIN["2A"];
  const dept = cp.slice(0, 2);
  return PRIX_M2_TERRAIN[dept] ?? PRIX_M2_TERRAIN_DEFAUT;
}

/**
 * Surface pondérée : au-delà de la taille d'un lot constructible courant, les
 * mètres carrés supplémentaires ne se vendent pas au même prix — c'est du
 * terrain d'agrément, pas de la constructibilité.
 */
function surfacePonderee(surface: number, nature: string): number {
  // Seuls les terrains constructibles subissent cette décote : elle traduit le
  // fait qu'au-delà d'un lot, le surplus n'est plus de la constructibilité mais
  // de l'agrément. Un terrain agricole, forestier ou non constructible se vend
  // à l'hectare, donc linéairement.
  if (nature !== "a_batir" && nature !== "commercial") return surface;
  const palier1 = Math.min(surface, 1000);
  const palier2 = Math.min(Math.max(surface - 1000, 0), 2000) * 0.3;
  const palier3 = Math.max(surface - 3000, 0) * 0.1;
  return palier1 + palier2 + palier3;
}

function computeTerrainEstimation(form: LeenkeyForm): EstimationResult {
  const surface = form.surface_terrain || 0;
  const nature = form.terrain_type ?? "a_batir";
  const natureEntry = NATURE_MULT[nature] ?? NATURE_MULT.a_batir;
  const prixM2Marche = basePrixM2Terrain(form);

  const facteurs: FactorImpact[] = [];

  // Constructibilité déclarée — seulement si la nature ne la tranche pas déjà.
  let constructibleMult = 1;
  if (nature === "a_batir" || nature === "commercial") {
    if (form.constructible === "Non") constructibleMult = 0.15;
    else if (form.constructible === "Je ne sais pas") constructibleMult = 0.85;
  }

  const topoMult = TOPO_MULT[form.topographie ?? "Plat"] ?? 1;

  let vueMult = 1;
  const vueLabels: string[] = [];
  for (const v of form.vue) {
    const bonus = VUE_BONUS[v];
    if (bonus) {
      vueMult += bonus;
      if (bonus > 0) vueLabels.push(v.toLowerCase());
    }
  }

  const situationMult = SITUATION_MULT[form.situation_terrain ?? "Lotissement"] ?? 1;

  let contrainteMult = 1;
  const contrainteLabels: string[] = [];
  for (const c of form.contraintes_terrain) {
    const entry = CONTRAINTE_MALUS[c];
    if (entry) {
      contrainteMult -= entry.malus;
      contrainteLabels.push(entry.label);
    }
  }
  contrainteMult = Math.max(0.4, contrainteMult);

  let potentielMult = 1;
  const potentielLabels: string[] = [];
  for (const p of form.potentiel_foncier) {
    const entry = POTENTIEL_BONUS[p];
    if (entry) {
      potentielMult += entry.bonus;
      potentielLabels.push(entry.label);
    }
  }

  // Une façade trop étroite bride le projet constructible.
  let facadeMult = 1;
  if (form.facade && form.facade > 0 && form.facade < 8 && nature === "a_batir") {
    facadeMult = 0.92;
  }

  // Accessibilité : commerces et écoles à portée élargissent la clientèle.
  let accesMult = 1;
  const proches = [form.distances.commerces, form.distances.ecoles].filter(
    (d) => d === "< 5 min",
  ).length;
  const loin = [form.distances.commerces, form.distances.ecoles].filter(
    (d) => d === "> 20 min",
  ).length;
  accesMult += proches * 0.02 - loin * 0.04;

  const globalMult =
    natureEntry.mult *
    constructibleMult *
    topoMult *
    vueMult *
    situationMult *
    contrainteMult *
    potentielMult *
    facadeMult *
    accesMult;

  // Non arrondi : un terrain agricole vaut ~0,3 €/m², un arrondi à l'entier le
  // ramènerait à zéro.
  const prixM2Exact = prixM2Marche * globalMult;
  const valeurBrute = prixM2Exact * surfacePonderee(surface, nature);

  // Réseaux manquants : déduits au coût de raccordement (uniquement là où la
  // viabilisation a un sens — un terrain agricole ne se viabilise pas).
  let coutViabilisation = 0;
  const manquants: string[] = [];
  if (nature === "a_batir" || nature === "commercial") {
    for (const [key, entry] of Object.entries(COUT_VIABILISATION)) {
      if (!form.viabilisation.includes(key)) {
        coutViabilisation += entry.cout;
        manquants.push(entry.label);
      }
    }
  }

  // Arrondi au millier pour les valeurs courantes, à la centaine en dessous de
  // 10 000 € : arrondir au millier un terrain agricole à 4 200 € le déformerait.
  const brut = Math.max(0, valeurBrute - coutViabilisation);
  const pas = brut < 10000 ? 100 : 1000;
  const prixEstime = Math.round(brut / pas) * pas;

  // Sous 10 €/m² (agricole, forestier), l'entier ne suffit plus à rendre compte
  // de l'écart : on garde une décimale.
  const prixM2Brut = surface > 0 ? prixEstime / surface : 0;
  const prixM2Final = prixM2Brut >= 10 ? Math.round(prixM2Brut) : Math.round(prixM2Brut * 10) / 10;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  facteurs.push(
    {
      label: "Nature du terrain",
      impact: Math.round((natureEntry.mult - 1) * 100),
      detail: natureEntry.label,
    },
    {
      label: "Constructibilité",
      impact: Math.round((constructibleMult - 1) * 100),
      detail:
        form.constructible === "Oui"
          ? `Constructible${form.zonage_plu ? ` · ${form.zonage_plu}` : ""}`
          : form.constructible === "Non"
            ? "Non constructible"
            : "Constructibilité à confirmer en mairie",
    },
    {
      label: "Viabilisation",
      impact: 0,
      detail: manquants.length
        ? `${manquants.length} réseau${manquants.length > 1 ? "x" : ""} à raccorder (${manquants.join(", ")}) — ${coutViabilisation.toLocaleString("fr-FR")} € déduits`
        : "Terrain entièrement viabilisé",
    },
    {
      label: "Terrain & vue",
      impact: Math.round((topoMult * vueMult - 1) * 100),
      detail: [form.topographie, ...vueLabels].filter(Boolean).join(", ") || "Non renseigné",
    },
    {
      label: "Situation",
      impact: Math.round((situationMult * accesMult - 1) * 100),
      detail: form.situation_terrain ?? "Non renseignée",
    },
    {
      label: "Contraintes",
      impact: Math.round((contrainteMult - 1) * 100),
      detail: contrainteLabels.length ? contrainteLabels.join(", ") : "Aucune déclarée",
    },
    {
      label: "Potentiel foncier",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Aucune démarche engagée",
    },
  );

  // Fiabilité : complétude des champs qui pèsent réellement sur le prix.
  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "surface_terrain",
    "terrain_type",
    "constructible",
    "zonage_plu",
    "topographie",
    "situation_terrain",
  ];
  const complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  const fiabiliteScore = Math.round((complet / champsClés.length) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  let rangePct = 0.03;
  if (fiabilite === "elevee") rangePct = 0.02;
  else if (fiabilite === "moyenne") rangePct = 0.025;

  const tensionMarche = tension(form);
  if (tensionMarche === "forte") rangePct *= 0.85;
  rangePct = Math.min(rangePct, 0.03);

  // Score d'attractivité : constructibilité et viabilisation d'abord.
  let score = 40;
  if (form.constructible === "Oui") score += 25;
  score += Math.round((form.viabilisation.length / 5) * 15);
  score += Math.round((potentielMult - 1) * 100);
  score += Math.round((contrainteMult - 1) * 100);
  score += Math.round((vueMult - 1) * 100);
  score = Math.max(0, Math.min(100, score));

  let delaiBase: [number, number] = [90, 150];
  if (nature === "a_batir" && form.constructible === "Oui") delaiBase = [60, 100];
  if (nature === "agricole" || nature === "forestier") delaiBase = [120, 240];
  if (tensionMarche === "forte") delaiBase = [delaiBase[0] - 20, delaiBase[1] - 30];

  const recommandations: Recommendation[] = [];
  if (manquants.length) {
    recommandations.push({
      title: "Viabiliser avant la mise en vente",
      description: `Il manque : ${manquants.join(", ")}. Un terrain viabilisé se vend plus vite et se négocie moins.`,
      uplift: `+${coutViabilisation.toLocaleString("fr-FR")} € environ`,
    });
  }
  if (form.constructible === "Je ne sais pas") {
    recommandations.push({
      title: "Demander un certificat d'urbanisme",
      description:
        "Le CU est gratuit et s'obtient en mairie sous 1 à 2 mois. Sans lui, les acheteurs appliquent une décote de précaution.",
      uplift: "+10 à 15%",
    });
  }
  if (!form.potentiel_foncier.includes("borne")) {
    recommandations.push({
      title: "Faire borner le terrain",
      description:
        "Un bornage par géomètre lève l'incertitude sur les limites et évite les litiges — souvent exigé par l'acheteur.",
      uplift: "+2 à 4%",
    });
  }
  if (!form.potentiel_foncier.includes("divisible") && surface > 1200 && nature === "a_batir") {
    recommandations.push({
      title: "Étudier une division parcellaire",
      description:
        "Au-delà de 1 200 m², deux lots se vendent souvent mieux qu'un grand terrain unique.",
      uplift: "+10 à 20%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Réunir le dossier foncier",
      description:
        "Plan cadastral, CU, étude de sol et relevé de bornage : un dossier complet rassure et accélère la vente.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/* LOCAL COMMERCIAL                                                    */
/* ------------------------------------------------------------------ */

/**
 * Qualité de l'emplacement commercial.
 *
 * - `prixMult` : rapport entre le prix du m² commercial et celui du m²
 *   résidentiel du secteur. En pied d'artère n°1 le commercial dépasse le
 *   logement ; en zone artisanale il en vaut le tiers.
 * - `taux` : taux de capitalisation attendu par un investisseur. Plus
 *   l'emplacement est sûr, plus le taux est bas — donc le prix élevé.
 */
const EMPLACEMENT: Record<string, { prixMult: number; taux: number; label: string }> = {
  tres_commercante: { prixMult: 1.3, taux: 0.06, label: "Rue très commerçante" },
  passante: { prixMult: 0.95, taux: 0.07, label: "Rue passante" },
  secondaire: { prixMult: 0.7, taux: 0.085, label: "Rue secondaire" },
  residentielle: { prixMult: 0.6, taux: 0.09, label: "Zone résidentielle" },
  artisanale: { prixMult: 0.35, taux: 0.1, label: "Zone artisanale" },
};

/** Destination du local : liquidité et prix au m² relatifs. */
const LOCAL_TYPE_MULT: Record<string, { mult: number; label: string }> = {
  boutique: { mult: 1, label: "Boutique" },
  alimentaire: { mult: 1.05, label: "Commerce alimentaire" },
  restaurant: { mult: 1.02, label: "Restaurant" },
  bar: { mult: 1, label: "Bar" },
  coiffure: { mult: 0.95, label: "Salon de coiffure" },
  medical: { mult: 1.05, label: "Cabinet médical" },
  bureau: { mult: 0.9, label: "Bureau" },
  activite: { mult: 0.6, label: "Local d'activité" },
  entrepot: { mult: 0.45, label: "Entrepôt" },
  autre: { mult: 0.85, label: "Autre local" },
};

const NIVEAU_BONUS: Record<string, number> = {
  Excellent: 0.06,
  Bon: 0.02,
  Moyen: 0,
  Faible: -0.05,
};

const LOCAL_CONFIG_BONUS: Record<string, { bonus: number; label: string }> = {
  angle: { bonus: 0.12, label: "local d'angle" },
  traversant: { bonus: 0.05, label: "traversant" },
  plain_pied: { bonus: 0.04, label: "de plain-pied" },
  plusieurs_niveaux: { bonus: -0.03, label: "sur plusieurs niveaux" },
};

const LOCAL_POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  changement_destination: { bonus: 0.08, label: "changement de destination possible" },
  extraction_possible: { bonus: 0.05, label: "extraction réalisable" },
  divisible: { bonus: 0.05, label: "divisible" },
  terrasse: { bonus: 0.05, label: "terrasse" },
  pmr_conforme: { bonus: 0.04, label: "conforme PMR" },
  reunifiable: { bonus: 0.03, label: "réunifiable" },
  erp: { bonus: 0.02, label: "classé ERP" },
  enseigne: { bonus: 0.02, label: "enseigne autorisée" },
};

/** Un bail long sécurise le revenu : l'investisseur accepte un taux plus bas. */
const BAIL_TAUX_AJUST: Record<string, number> = {
  "Plus de 6 ans": -0.005,
  "3 à 6 ans": -0.0025,
  "1 à 3 ans": 0,
  "Moins d'un an": 0.005,
};

function computeLocalEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  const emplacement = EMPLACEMENT[form.environnement ?? "secondaire"] ?? EMPLACEMENT.secondaire;
  const typeEntry = LOCAL_TYPE_MULT[form.local_type ?? "boutique"] ?? LOCAL_TYPE_MULT.boutique;

  // Surface pondérée : la réserve ne vaut pas la surface de vente.
  const totale = form.surface_totale || 0;
  const vente = form.surface_vente ?? 0;
  const reserve = form.surface_reserve ?? 0;
  const surfacePonderee =
    vente + reserve > 0
      ? vente + reserve * 0.4 + Math.max(0, totale - vente - reserve) * 0.6
      : totale;

  // Base résidentielle du secteur, convertie en prix commercial.
  const baseResidentiel =
    dvfPrixM2 && dvfPrixM2 > 0
      ? Math.round(dvfPrixM2 * 0.7 + basePrixM2(form) * 0.3)
      : basePrixM2(form);
  const prixM2Marche = Math.round(baseResidentiel * emplacement.prixMult);

  const etatEntry = ETAT_MULT[form.etat ?? "bon"] ?? ETAT_MULT.bon;

  let configMult = 1;
  const configLabels: string[] = [];
  for (const c of form.local_config) {
    const e = LOCAL_CONFIG_BONUS[c];
    if (e) {
      configMult += e.bonus;
      configLabels.push(e.label);
    }
  }

  // Une vitrine large est le principal vecteur de chalandise d'une boutique.
  let vitrineMult = 1;
  if (form.longueur_vitrine) {
    if (form.longueur_vitrine >= 10) vitrineMult = 1.08;
    else if (form.longueur_vitrine >= 6) vitrineMult = 1.04;
    else if (form.longueur_vitrine < 3) vitrineMult = 0.94;
  }

  const fluxMult =
    1 +
    (NIVEAU_BONUS[form.visibilite ?? "Moyen"] ?? 0) +
    (NIVEAU_BONUS[form.flux_pieton ?? "Moyen"] ?? 0);

  let equipMult = 1;
  for (const e of form.local_equipements) {
    if (e === "extraction") equipMult += 0.04;
    else if (e === "pmr") equipMult += 0.03;
    else equipMult += 0.015;
  }

  let potentielMult = 1;
  const potentielLabels: string[] = [];
  for (const p of form.local_potentiel) {
    const e = LOCAL_POTENTIEL_BONUS[p];
    if (e) {
      potentielMult += e.bonus;
      potentielLabels.push(e.label);
    }
  }
  // Chaque usage supplémentaire élargit la clientèle d'acquéreurs.
  potentielMult += Math.min(form.potentiel_transformation.length * 0.015, 0.06);

  let accesMult = 1;
  if (form.stationnement.includes("Parking privé")) accesMult += 0.04;
  if (form.transports.length) accesMult += Math.min(form.transports.length * 0.015, 0.05);
  if (form.acces_livraison === "Impossible") accesMult -= 0.04;

  const globalMult =
    typeEntry.mult *
    etatEntry.mult *
    configMult *
    vitrineMult *
    fluxMult *
    equipMult *
    potentielMult *
    accesMult;

  // ── Méthode 1 : comparaison au m² ──
  const prixM2 = Math.round(prixM2Marche * globalMult);
  const valeurComparaison = prixM2 * surfacePonderee;

  // ── Méthode 2 : capitalisation du loyer ──
  // Un local loué se vend à un investisseur, qui raisonne en rendement et non
  // en prix au mètre carré.
  const loyer = form.loyer_annuel ?? 0;
  const occupe = form.local_occupation === "Occupé — bail en cours" && loyer > 0;
  let valeurRendement = 0;
  let taux = emplacement.taux;
  if (occupe) {
    taux += BAIL_TAUX_AJUST[form.bail_duree_restante ?? "1 à 3 ans"] ?? 0;
    if (form.etat === "a_renover") taux += 0.01;
    else if (form.etat === "excellent") taux -= 0.005;
    taux = Math.max(0.04, taux);
    // Revenu net : la taxe foncière reste à la charge du bailleur.
    const loyerNet = Math.max(0, loyer - (form.taxe_fonciere ?? 0));
    valeurRendement = loyerNet / taux;
  }

  // Local loué : le rendement prime (c'est ce que regarde l'acquéreur), la
  // comparaison sert de garde-fou. Local libre : comparaison seule.
  const valeur = occupe ? valeurRendement * 0.7 + valeurComparaison * 0.3 : valeurComparaison;

  const prixEstime = Math.max(0, Math.round(valeur / 1000) * 1000);
  const prixM2Final = totale > 0 ? Math.round(prixEstime / totale) : 0;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  const facteurs: FactorImpact[] = [
    {
      label: "Emplacement commercial",
      impact: Math.round((emplacement.prixMult - 1) * 100),
      detail: `${emplacement.label} · ${prixM2Marche.toLocaleString("fr-FR")} €/m² de référence`,
    },
    {
      label: "Destination",
      impact: Math.round((typeEntry.mult - 1) * 100),
      detail: typeEntry.label,
    },
    {
      label: "Configuration & vitrine",
      impact: Math.round((configMult * vitrineMult - 1) * 100),
      detail:
        [...configLabels, form.longueur_vitrine ? `vitrine de ${form.longueur_vitrine} m` : ""]
          .filter(Boolean)
          .join(", ") || "Configuration standard",
    },
    {
      label: "Flux & visibilité",
      impact: Math.round((fluxMult - 1) * 100),
      detail: `Visibilité ${(form.visibilite ?? "non renseignée").toLowerCase()} · flux piéton ${(form.flux_pieton ?? "non renseigné").toLowerCase()}`,
    },
    {
      label: "État & équipements",
      impact: Math.round((etatEntry.mult * equipMult - 1) * 100),
      detail: etatEntry.label,
    },
    {
      label: "Potentiel",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Aucun atout déclaré",
    },
  ];

  if (occupe) {
    facteurs.unshift({
      label: "Rendement locatif",
      impact: 0,
      detail: `${loyer.toLocaleString("fr-FR")} € de loyer annuel capitalisés à ${(taux * 100).toFixed(1)} % — soit ${(Math.round(valeurRendement / 1000) * 1000).toLocaleString("fr-FR")} € par la méthode du rendement`,
    });

    // Les deux méthodes doivent converger. Un écart marqué signifie que le
    // loyer en place est décalé du marché — c'est une information de
    // négociation, pas un détail à lisser en silence dans la moyenne.
    const ecart = (valeurRendement - valeurComparaison) / valeurComparaison;
    if (Math.abs(ecart) > 0.3) {
      facteurs.push({
        label: "Écart entre les deux méthodes",
        impact: Math.round(ecart * 100),
        detail:
          ecart < 0
            ? `Le loyer en place valorise le local ${Math.abs(Math.round(ecart * 100))} % sous sa valeur au m². Un loyer sous-évalué : à la révision ou au départ du locataire, le bien retrouve son potentiel.`
            : `Le loyer en place valorise le local ${Math.round(ecart * 100)} % au-dessus de sa valeur au m². Un acquéreur vérifiera que ce loyer est tenable dans la durée.`,
      });
    }
  }

  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "surface_totale",
    "local_type",
    "environnement",
    "etat",
    "local_occupation",
    "visibilite",
  ];
  const complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  const fiabiliteScore = Math.round((complet / champsClés.length) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  let rangePct = 0.03;
  if (fiabilite === "elevee") rangePct = 0.02;
  else if (fiabilite === "moyenne") rangePct = 0.025;
  const tensionMarche = tension(form);
  if (tensionMarche === "forte") rangePct *= 0.85;
  rangePct = Math.min(rangePct, 0.03);

  let score = 50;
  score += Math.round((emplacement.prixMult - 0.7) * 40);
  score += Math.round((fluxMult - 1) * 100);
  score += Math.round((potentielMult - 1) * 100);
  score += Math.round((etatEntry.mult - 1) * 100);
  if (occupe) score += 8;
  score = Math.max(0, Math.min(100, score));

  // Le commerce se vend plus lentement que le résidentiel.
  let delaiBase: [number, number] = [120, 210];
  if (emplacement.prixMult >= 1.3) delaiBase = [60, 120];
  else if (emplacement.prixMult >= 0.95) delaiBase = [90, 150];
  if (occupe) delaiBase = [delaiBase[0] - 20, delaiBase[1] - 30];
  if (form.etat === "a_renover") delaiBase = [delaiBase[0] + 30, delaiBase[1] + 60];

  const recommandations: Recommendation[] = [];
  if (!occupe) {
    recommandations.push({
      title: "Louer avant de vendre",
      description:
        "Un local occupé par un locataire solide se vend à un investisseur, sur la base du rendement — une clientèle plus large et plus rapide qu'un local vide.",
      uplift: "+5 à 15%",
    });
  }
  if (!form.local_equipements.includes("pmr")) {
    recommandations.push({
      title: "Mettre le local aux normes PMR",
      description:
        "L'accessibilité est obligatoire pour tout ERP. Sans elle, l'acheteur déduit le coût des travaux de son offre.",
      uplift: "+3 à 5%",
    });
  }
  if (!form.local_potentiel.includes("extraction_possible") && form.local_type !== "restaurant") {
    recommandations.push({
      title: "Faire vérifier la faisabilité d'une extraction",
      description:
        "Une extraction possible ouvre le local à la restauration, de loin la demande la plus forte du marché commercial.",
      uplift: "+5 à 10%",
    });
  }
  if (form.etat === "a_renover" || form.etat === "moyen") {
    recommandations.push({
      title: "Reprendre la devanture",
      description:
        "La vitrine est le premier élément vu par un repreneur. Une devanture refaite change la perception du local pour un budget limité.",
      uplift: "+3 à 6%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Réunir le dossier commercial",
      description:
        "Bail, quittances, taxe foncière, diagnostics et attestation ERP : un dossier complet est décisif pour un acquéreur investisseur.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface: totale,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/* IMMEUBLE                                                            */
/* ------------------------------------------------------------------ */

/** Décote appliquée à une vente en bloc : un immeuble entier vaut moins que la somme de ses lots. */
const DECOTE_BLOC = 0.22;

/** Coût relatif de la reprise de chaque poste technique. */
const POSTE_MALUS: Record<string, number> = {
  Toiture: 0.06,
  Façade: 0.05,
  Électricité: 0.04,
  "Parties communes": 0.02,
  Plomberie: 0.03,
  Chauffage: 0.03,
  "Colonnes (eau, gaz, évacuation)": 0.03,
  Isolation: 0.03,
  Fenêtres: 0.03,
};
const TRAVAUX_MALUS_MAX = 0.25;

const IMMEUBLE_POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  surelevation: { bonus: 0.1, label: "surélévation" },
  division: { bonus: 0.08, label: "division de lots" },
  nouveaux_lots: { bonus: 0.07, label: "création de lots" },
  construction_arriere: { bonus: 0.06, label: "construction en fond de parcelle" },
  combles: { bonus: 0.05, label: "combles aménageables" },
  extension: { bonus: 0.05, label: "extension" },
  changement_destination: { bonus: 0.04, label: "changement de destination" },
  commercial_transformable: { bonus: 0.04, label: "commercial transformable" },
  sous_sol: { bonus: 0.03, label: "sous-sol exploitable" },
};

function computeImmeubleEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  const stats = statsLocatives(form.lots);
  const charges = totalCharges(form);
  const revenuNet = stats.revenusAnnuels - charges;
  const surface = form.surface_totale_immeuble || form.surface_habitable_immeuble || 0;

  // ── Travaux : chaque poste à reprendre est une décote directe ──
  let travauxMalus = 0;
  const postesARefaire: string[] = [];
  for (const poste of POSTES_TECHNIQUES) {
    const etat = form.etat_technique[poste];
    const malus = POSTE_MALUS[poste] ?? 0.03;
    // Un poste repris récemment ne peut pas être compté comme à refaire.
    if (form.travaux_recents.includes(poste)) continue;
    if (etat === "À refaire") {
      travauxMalus += malus;
      postesARefaire.push(poste.toLowerCase());
    } else if (etat === "Moyen") {
      travauxMalus += malus / 2;
    }
  }
  travauxMalus = Math.min(travauxMalus, TRAVAUX_MALUS_MAX);
  const travauxMult = 1 - travauxMalus;

  // ── Potentiel de développement ──
  let potentielMult = 1;
  const potentielLabels: string[] = [];
  for (const p of form.potentiel_developpement) {
    const e = IMMEUBLE_POTENTIEL_BONUS[p];
    if (e) {
      potentielMult += e.bonus;
      potentielLabels.push(e.label);
    }
  }

  // ── DPE du parc : depuis 2025 un logement G ne peut plus être loué ──
  const lotsAvecDpe = form.lots.filter((l) => l.dpe && l.dpe !== "inconnu");
  const passoires = lotsAvecDpe.filter((l) => l.dpe === "F" || l.dpe === "G").length;
  const partPassoires = lotsAvecDpe.length ? passoires / lotsAvecDpe.length : 0;
  const dpeMult = 1 - partPassoires * 0.1;

  const prixM2Lot =
    dvfPrixM2 && dvfPrixM2 > 0
      ? Math.round(dvfPrixM2 * 0.7 + basePrixM2(form) * 0.3)
      : basePrixM2(form);

  // ── Méthode 1 : capitalisation du revenu net ──
  let taux = tauxCapitalisation(prixM2Lot);
  // La vacance est un risque : l'acquéreur exige un rendement plus élevé.
  if (stats.nbLots > 0 && stats.tauxOccupation < 80) {
    taux += ((80 - stats.tauxOccupation) / 100) * 0.02;
  }
  if (travauxMalus > 0.12) taux += 0.005;
  taux = Math.max(0.03, taux);
  const valeurRendement = revenuNet > 0 ? (revenuNet / taux) * potentielMult * dpeMult : 0;

  // ── Méthode 2 : valeur à la découpe, moins la décote de bloc ──
  const surfaceHab = form.surface_habitable_immeuble ?? 0;
  const surfaceCom = form.surface_commerciale ?? 0;
  const surfaceValorisee = surfaceHab + surfaceCom > 0 ? surfaceHab + surfaceCom * 0.95 : surface;
  const valeurDecoupe = surfaceValorisee * prixM2Lot;
  // Un immeuble vide ne produit rien pendant sa commercialisation, et la raison
  // de la vacance inquiète l'acquéreur : la valeur patrimoniale en tient compte
  // elle aussi, sans quoi vider un immeuble le rendrait gratuitement plus cher.
  const occupationMult = stats.nbLots ? 0.92 + 0.08 * (stats.tauxOccupation / 100) : 1;
  const valeurBloc =
    valeurDecoupe * (1 - DECOTE_BLOC) * travauxMult * potentielMult * dpeMult * occupationMult;

  // Un immeuble loué se vend à son rendement ; sans revenu, seule la valeur
  // patrimoniale existe.
  const loue = revenuNet > 0;
  const valeur = loue ? valeurRendement * 0.65 + valeurBloc * 0.35 : valeurBloc;

  const prixEstime = Math.max(0, Math.round(valeur / 1000) * 1000);
  const prixM2Final = surface > 0 ? Math.round(prixEstime / surface) : 0;
  const prixM2Marche = prixM2Lot;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  const facteurs: FactorImpact[] = [];
  if (loue) {
    facteurs.push({
      label: "Rendement locatif",
      impact: 0,
      detail: `${stats.revenusAnnuels.toLocaleString("fr-FR")} € de loyers − ${charges.toLocaleString("fr-FR")} € de charges = ${revenuNet.toLocaleString("fr-FR")} € nets, capitalisés à ${(taux * 100).toFixed(2)} %`,
    });
  } else {
    facteurs.push({
      label: "Rendement locatif",
      impact: 0,
      detail: "Aucun revenu net déclaré — l'immeuble est valorisé sur sa seule valeur patrimoniale",
    });
  }
  facteurs.push(
    {
      label: "Occupation",
      impact: Math.round((occupationMult - 1) * 100),
      detail: `${stats.nbOccupes}/${stats.nbLots} lots loués — ${stats.tauxOccupation} % d'occupation${
        stats.potentielVacance
          ? ` · ${stats.potentielVacance.toLocaleString("fr-FR")} € de loyers annuels à récupérer`
          : ""
      }`,
    },
    {
      label: "État technique",
      impact: -Math.round(travauxMalus * 100),
      detail: postesARefaire.length
        ? `À reprendre : ${postesARefaire.join(", ")}`
        : "Aucun poste majeur à reprendre",
    },
    {
      label: "Potentiel de développement",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Aucun potentiel déclaré",
    },
    {
      label: "Vente en bloc",
      impact: -Math.round(DECOTE_BLOC * 100),
      detail: `Un immeuble entier se négocie sous la somme de ses lots · valeur à la découpe estimée ${(Math.round(valeurDecoupe / 1000) * 1000).toLocaleString("fr-FR")} €`,
    },
  );
  // Les deux méthodes doivent converger. Un écart marqué signifie que les
  // loyers en place sont décalés du marché : c'est le principal levier de
  // négociation d'un immeuble de rapport, il doit être dit.
  if (loue && valeurBloc > 0) {
    const ecart = (valeurRendement - valeurBloc) / valeurBloc;
    if (Math.abs(ecart) > 0.3) {
      facteurs.push({
        label: "Loyers en place vs marché",
        impact: Math.round(ecart * 100),
        detail:
          ecart < 0
            ? `Les loyers actuels valorisent l'immeuble ${Math.abs(Math.round(ecart * 100))} % sous sa valeur patrimoniale : ils sont en dessous du marché. Les remettre à niveau au fil des relocations est le premier levier de valeur.`
            : `Les loyers actuels valorisent l'immeuble ${Math.round(ecart * 100)} % au-dessus de sa valeur patrimoniale. Un acquéreur vérifiera qu'ils sont tenables dans la durée.`,
      });
    }
  }
  if (lotsAvecDpe.length && passoires) {
    facteurs.push({
      label: "Performance énergétique du parc",
      impact: -Math.round(partPassoires * 10),
      detail: `${passoires} lot${passoires > 1 ? "s" : ""} en DPE F ou G sur ${lotsAvecDpe.length} renseignés — location interdite pour les G depuis 2025`,
    });
  }

  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "immeuble_type",
    "surface_totale_immeuble",
    "surface_habitable_immeuble",
    "charge_taxe_fonciere",
  ];
  let complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  if (form.lots.length) complet += 1;
  if (stats.revenusAnnuels > 0) complet += 1;
  const fiabiliteScore = Math.round((complet / (champsClés.length + 2)) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  let rangePct = 0.03;
  if (fiabilite === "elevee") rangePct = 0.02;
  else if (fiabilite === "moyenne") rangePct = 0.025;
  const tensionMarche = tension(form);
  if (tensionMarche === "forte") rangePct *= 0.85;
  rangePct = Math.min(rangePct, 0.03);

  let score = 45;
  score += Math.round((stats.tauxOccupation - 70) / 3);
  score -= Math.round(travauxMalus * 120);
  score += Math.round((potentielMult - 1) * 120);
  score -= Math.round(partPassoires * 15);
  score = Math.max(0, Math.min(100, score));

  let delaiBase: [number, number] = [120, 210];
  if (loue && stats.tauxOccupation >= 90) delaiBase = [75, 150];
  if (travauxMalus > 0.15) delaiBase = [delaiBase[0] + 30, delaiBase[1] + 60];

  const recommandations: Recommendation[] = [];
  if (stats.potentielVacance > 0) {
    recommandations.push({
      title: "Relouer les lots vacants avant la vente",
      description: `Les lots libres représentent ${stats.potentielVacance.toLocaleString("fr-FR")} € de loyers annuels. Un immeuble plein se vend sur un rendement constaté, pas sur une promesse.`,
      uplift: `+${(Math.round(((stats.potentielVacance / taux) * 0.65) / 1000) * 1000).toLocaleString("fr-FR")} € environ`,
    });
  }
  if (postesARefaire.length) {
    recommandations.push({
      title: `Chiffrer les travaux : ${postesARefaire.slice(0, 3).join(", ")}`,
      description:
        "Un devis d'entreprise vaut mieux qu'une estimation d'acquéreur : sans chiffrage, l'acheteur retient toujours l'hypothèse haute.",
      uplift: `+${Math.round(travauxMalus * 50)} % de la décote évitée`,
    });
  }
  if (passoires) {
    recommandations.push({
      title: "Traiter les lots en DPE F et G",
      description:
        "Les logements classés G ne sont plus louables depuis 2025, les F suivront. Un acquéreur déduit le coût de la rénovation, souvent plus large que son coût réel.",
      uplift: "+5 à 10%",
    });
  }
  if (!form.potentiel_developpement.length) {
    recommandations.push({
      title: "Faire étudier le potentiel du PLU",
      description:
        "Surélévation, division, combles : un potentiel documenté élargit la clientèle aux marchands de biens et fait monter les offres.",
      uplift: "+5 à 15%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Préparer le dossier investisseur",
      description:
        "Baux, quittances, taxe foncière, charges détaillées, DPE de chaque lot et diagnostics communs : c'est ce qu'un acquéreur demandera avant toute offre.",
    });
  }

  return {
    prixEstime,
    prixBas: Math.round((prixEstime * (1 - rangePct)) / 1000) * 1000,
    prixHaut: Math.round((prixEstime * (1 + rangePct)) / 1000) * 1000,
    prixM2: prixM2Final,
    prixM2Marche,
    deltaMarche,
    surface,
    fiabilite,
    fiabiliteScore,
    scoreAttractivite: score,
    delaiVente: `${delaiBase[0]}–${delaiBase[1]} jours`,
    tensionMarche,
    facteurs,
    recommandations: recommandations.slice(0, 3),
  };
}

export function computeEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  // Un terrain n'a ni surface habitable, ni DPE, ni prestations : il a son
  // propre modèle, fondé sur la constructibilité et la viabilisation.
  if (form.type === "terrain") return computeTerrainEstimation(form);
  // Un local commercial se valorise à l'emplacement et au rendement locatif.
  if (form.type === "local_commercial") return computeLocalEstimation(form, dvfPrixM2);
  // Un immeuble de rapport se valorise à son revenu net, lot par lot.
  if (form.type === "immeuble") return computeImmeubleEstimation(form, dvfPrixM2);

  const surface = form.surface_habitable || form.surface_carrez || 60;

  // Prix moyen marché = mix entre table statique et DVF (si dispo)
  // DVF a 70% de poids car ce sont de vraies données, mais on garde 30% de la table
  // (qui peut compenser le délai DVF en estimant la tendance actuelle).
  const prixM2Table = basePrixM2(form);
  const prixM2Marche =
    dvfPrixM2 && dvfPrixM2 > 0 ? Math.round(dvfPrixM2 * 0.7 + prixM2Table * 0.3) : prixM2Table;

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
  let prestSomme = 0;
  let prestCount = 0;
  for (const p of form.prestations) {
    const poids = PRESTATION_POIDS[p];
    if (poids) {
      prestSomme += poids;
      prestCount += 1;
    }
  }
  const prestMult = 1 + Math.min(prestSomme, PRESTATION_CAP);

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
  if (fiabilite === "elevee")
    rangePct = 0.02; // ±2%
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
      detail: prestCount
        ? `${prestCount} prestation${prestCount > 1 ? "s" : ""} premium`
        : "Standard",
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
      description:
        "Diagnostics à jour, factures de travaux, taxe foncière : un dossier complet rassure les acheteurs.",
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
