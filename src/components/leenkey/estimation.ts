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

/**
 * Prix moyen du m² résidentiel par département (€/m²).
 *
 * ⚠️ Ordres de grandeur, à recalibrer sur DVF.
 *
 * La table précédente ne couvrait que 20 départements et renvoyait 3 500 €/m²
 * pour les 81 autres : un bien dans la Creuse (~950 €/m² réels) était calculé
 * sur une base 3,7 fois trop élevée, et un bien en Haute-Savoie sur une base
 * trop basse. C'était la première cause d'estimations très au-dessus ou
 * très en dessous du marché.
 */
const PRIX_DEPT: Record<string, number> = {
  "01": 2600,
  "02": 1300,
  "03": 1250,
  "04": 2300,
  "05": 2700,
  "06": 5500,
  "07": 1900,
  "08": 1100,
  "09": 1450,
  "10": 1700,
  "11": 1850,
  "12": 1450,
  "13": 3700,
  "14": 2500,
  "15": 1200,
  "16": 1500,
  "17": 2900,
  "18": 1300,
  "19": 1300,
  "21": 2400,
  "22": 2100,
  "23": 950,
  "24": 1700,
  "25": 2000,
  "26": 2400,
  "27": 1900,
  "28": 1900,
  "29": 2300,
  "30": 2400,
  "31": 3300,
  "32": 1600,
  "33": 3900,
  "34": 3300,
  "35": 3000,
  "36": 1100,
  "37": 2500,
  "38": 2700,
  "39": 1600,
  "40": 3000,
  "41": 1700,
  "42": 1700,
  "43": 1500,
  "44": 3600,
  "45": 2100,
  "46": 1600,
  "47": 1500,
  "48": 1350,
  "49": 2400,
  "50": 1800,
  "51": 2100,
  "52": 1000,
  "53": 1500,
  "54": 2000,
  "55": 1100,
  "56": 3000,
  "57": 2000,
  "58": 1100,
  "59": 2500,
  "60": 2300,
  "61": 1300,
  "62": 2000,
  "63": 2200,
  "64": 3300,
  "65": 1600,
  "66": 2400,
  "67": 3000,
  "68": 2500,
  "69": 4300,
  "70": 1200,
  "71": 1500,
  "72": 1800,
  "73": 3600,
  "74": 4800,
  "75": 9800,
  "76": 2300,
  "77": 3000,
  "78": 4400,
  "79": 1500,
  "80": 1800,
  "81": 1700,
  "82": 1700,
  "83": 4000,
  "84": 2600,
  "85": 2800,
  "86": 1700,
  "87": 1500,
  "88": 1300,
  "89": 1500,
  "90": 1700,
  "91": 3200,
  "92": 6800,
  "93": 3800,
  "94": 4700,
  "95": 3200,
  "2A": 3900,
  "2B": 3200,
  "971": 2400,
  "972": 2500,
  "973": 2200,
  "974": 2900,
  "976": 2000,
};
/** Repli quand le code postal est absent ou illisible. */
const PRIX_DEPT_DEFAUT = 1800;

/**
 * Paris par arrondissement : l'écart entre le 6e et le 19e dépasse 70 %,
 * une moyenne parisienne unique n'a aucun sens.
 */
const PRIX_PARIS: Record<string, number> = {
  "75001": 13500,
  "75002": 12000,
  "75003": 13000,
  "75004": 14000,
  "75005": 12500,
  "75006": 15500,
  "75007": 15000,
  "75008": 13000,
  "75009": 11000,
  "75010": 10000,
  "75011": 10500,
  "75012": 9800,
  "75013": 9500,
  "75014": 10500,
  "75015": 10500,
  "75016": 12000,
  "75017": 11000,
  "75018": 9500,
  "75019": 8500,
  "75020": 9000,
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
  const cp = (form.code_postal || "").trim();
  if (PRIX_PARIS[cp]) return PRIX_PARIS[cp];
  const v = normalize(form.ville || "");
  if (v && PRIX_VILLE[v]) return PRIX_VILLE[v];
  const source = (form.departement || cp).trim();
  // DOM : code à 3 chiffres (971xx…). Corse : 20xxx, sans distinction 2A/2B
  // dans le code postal.
  if (PRIX_DEPT[source.slice(0, 3)]) return PRIX_DEPT[source.slice(0, 3)];
  if (source.startsWith("20")) return PRIX_DEPT["2A"];
  return PRIX_DEPT[source.slice(0, 2)] ?? PRIX_DEPT_DEFAUT;
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
 * Largeur de la fourchette, indexée sur l'incertitude réelle.
 *
 * Elle était plafonnée à ±3 % en toutes circonstances, y compris avec une
 * fiabilité « faible ». Annoncer ±2 % sur un château sans devis de travaux ou
 * un terrain sans certificat d'urbanisme transformait tout écart normal de
 * marché en « votre estimation est fausse ».
 *
 * Trois choses déterminent l'incertitude :
 * - le type de bien : un appartement a des dizaines de comparables, un bien
 *   d'exception n'en a aucun ;
 * - la complétude du formulaire ;
 * - la présence d'un échantillon DVF exploitable, c'est-à-dire de vraies
 *   transactions à proximité.
 */
const FOURCHETTE_BASE: Record<string, Record<"elevee" | "moyenne" | "faible", number>> = {
  appartement: { elevee: 0.05, moyenne: 0.08, faible: 0.12 },
  maison: { elevee: 0.06, moyenne: 0.09, faible: 0.13 },
  immeuble: { elevee: 0.08, moyenne: 0.12, faible: 0.18 },
  terrain: { elevee: 0.1, moyenne: 0.15, faible: 0.2 },
  local_commercial: { elevee: 0.1, moyenne: 0.15, faible: 0.2 },
  atypique: { elevee: 0.12, moyenne: 0.18, faible: 0.25 },
};

function fourchette(opts: {
  type: string | null;
  fiabilite: "elevee" | "moyenne" | "faible";
  tension: "faible" | "moderee" | "forte";
  dvfExploitable: boolean;
}): number {
  const base = FOURCHETTE_BASE[opts.type ?? "maison"] ?? FOURCHETTE_BASE.maison;
  let pct = base[opts.fiabilite];
  // De vraies ventes à proximité resserrent la fourchette ; leur absence l'élargit.
  pct *= opts.dvfExploitable ? 0.85 : 1.1;
  // Un marché tendu se négocie peu : les prix de vente s'écartent moins du prix affiché.
  if (opts.tension === "forte") pct *= 0.9;
  else if (opts.tension === "faible") pct *= 1.05;
  return Math.min(0.3, Math.max(0.04, Math.round(pct * 1000) / 1000));
}

/**
 * Module un barème selon la taille déclarée, rapportée à une taille de
 * référence. Borné : une saisie farfelue ne doit pas emporter l'estimation.
 */
function facteurTaille(valeur: number, reference: number): number {
  return Math.max(0.5, Math.min(1.8, valeur / reference));
}

/**
 * Mélange le prix au m² issu de DVF avec la table de référence.
 *
 * DVF pèse 70 % car ce sont de vraies transactions, la table compensant le
 * délai de publication d'environ six mois. Mais un échantillon local peut
 * rester aberrant même après nettoyage — un code postal où seuls des biens
 * d'exception se sont vendus, par exemple. Au-delà d'un écart d'un facteur 2,5
 * dans un sens ou dans l'autre, on ne fait plus confiance à l'échantillon.
 */
function melangeAvecDvf(dvfPrixM2: number | null | undefined, prixTable: number): number {
  if (!dvfPrixM2 || dvfPrixM2 <= 0) return prixTable;
  const ratio = dvfPrixM2 / prixTable;
  if (ratio < 0.4 || ratio > 2.5) return prixTable;
  return Math.round(dvfPrixM2 * 0.7 + prixTable * 0.3);
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
  cuisine_equipee_electro: 0.01,
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
  cuisine_amenagee: 0.006,
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

  // DVF ne couvre pas les terrains : l'endpoint renvoie available:false.
  const dvfExploitable = false;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

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
  const baseResidentiel = melangeAvecDvf(dvfPrixM2, basePrixM2(form));
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

  // Le DPE pèse moins sur du commercial que sur du logement, mais il pèse : le
  // décret tertiaire impose des réductions de consommation aux surfaces de
  // plus de 1 000 m², et un local énergivore se reloue plus difficilement.
  const dpeLocal = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;
  const dpeMult = 1 + (dpeLocal.mult - 1) * 0.6;

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
    accesMult *
    dpeMult;

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
      label: "Performance énergétique",
      impact: Math.round((dpeMult - 1) * 100),
      detail: dpeLocal.label,
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

  const dvfExploitable = !!dvfPrixM2 && dvfPrixM2 > 0;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

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
  // À défaut de DPE lot par lot, le diagnostic collectif de l'immeuble vaut
  // indication pour l'ensemble du parc.
  const dpeGlobalPassoire = form.dpe === "F" || form.dpe === "G";
  const partPassoires = lotsAvecDpe.length
    ? passoires / lotsAvecDpe.length
    : dpeGlobalPassoire
      ? 1
      : 0;
  const dpeMult = 1 - partPassoires * 0.1;

  const prixM2Lot = melangeAvecDvf(dvfPrixM2, basePrixM2(form));

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
  if (!lotsAvecDpe.length && form.dpe && form.dpe !== "inconnu") {
    facteurs.push({
      label: "Performance énergétique",
      impact: Math.round((dpeMult - 1) * 100),
      detail: `DPE global de l'immeuble : ${form.dpe}${dpeGlobalPassoire ? " — location interdite pour les G depuis 2025" : ""}`,
    });
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

  const dvfExploitable = !!dvfPrixM2 && dvfPrixM2 > 0;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

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

/* ------------------------------------------------------------------ */
/* BIEN ATYPIQUE                                                       */
/* ------------------------------------------------------------------ */

/**
 * Rapport entre le prix du m² du bien et celui du résidentiel local.
 *
 * Un château se vend très en dessous du m² local (surfaces immenses, charges
 * lourdes, clientèle étroite) ; un loft ou une maison d'architecte au-dessus.
 */
const ATYPIQUE_TYPE_MULT: Record<string, { mult: number; label: string }> = {
  architecte: { mult: 1.25, label: "Maison d'architecte" },
  loft: { mult: 1.15, label: "Loft" },
  gite: { mult: 0.85, label: "Gîte / chambres d'hôtes" },
  autre: { mult: 0.85, label: "Bien atypique" },
  longere: { mult: 0.8, label: "Longère" },
  moulin: { mult: 0.7, label: "Moulin" },
  manoir: { mult: 0.65, label: "Manoir / demeure de caractère" },
  ferme: { mult: 0.6, label: "Corps de ferme" },
  religieux: { mult: 0.6, label: "Bâtiment religieux converti" },
  chateau: { mult: 0.45, label: "Château" },
  grange: { mult: 0.4, label: "Grange à réhabiliter" },
};

const CARACTERE_POIDS: Record<string, number> = {
  vue_exceptionnelle: 0.03,
  parc: 0.02,
  architecture_remarquable: 0.02,
  piscine: 0.015,
  etang: 0.015,
  grands_volumes: 0.012,
  hauteur_plafond: 0.012,
  jardin_remarquable: 0.012,
  riviere: 0.01,
  foret: 0.01,
  chapelle: 0.01,
  ecuries: 0.01,
  cheminees_monumentales: 0.01,
  escalier_honneur: 0.01,
  cave_voutee: 0.008,
  charpente_ancienne: 0.008,
  parquets_anciens: 0.008,
  pierre_taille: 0.008,
  colombages: 0.008,
  verriere: 0.008,
  orangerie: 0.008,
  logement_gardien: 0.008,
  spa: 0.008,
  cave_vin: 0.006,
  ascenseur: 0.006,
  domotique_hdg: 0.006,
  atelier: 0.006,
  pigeonnier: 0.006,
  tomettes: 0.005,
  terres_agricoles: 0.005,
  heliport: 0.005,
};
const CARACTERE_CAP = 0.2;

/**
 * Postes techniques d'un bien d'exception et coût relatif de leur reprise.
 * Source unique : le formulaire lit cette table pour construire ses questions,
 * de sorte qu'un poste renommé ne puisse pas rendre son malus inopérant.
 */
const ATYPIQUE_POSTE_MALUS: Record<string, number> = {
  "Structure / gros œuvre": 0.08,
  Toiture: 0.07,
  Façade: 0.05,
  "Réseaux (eau, électricité)": 0.04,
  Chauffage: 0.03,
  Isolation: 0.03,
  Menuiseries: 0.03,
};

export const POSTES_ATYPIQUE = Object.keys(ATYPIQUE_POSTE_MALUS);

const CADRE_MULT: Record<string, number> = {
  "Bord de mer": 1.12,
  "Centre-ville": 1.08,
  Montagne: 1.05,
  "Bourg / petite ville": 1.02,
  Village: 1,
  "Périphérie de ville": 1,
  "Pleine campagne": 0.95,
};

const ATYPIQUE_POTENTIEL_BONUS: Record<string, { bonus: number; label: string }> = {
  evenementiel: { bonus: 0.07, label: "événementiel" },
  gites: { bonus: 0.06, label: "création de gîtes" },
  division: { bonus: 0.06, label: "division possible" },
  chambres_hotes: { bonus: 0.05, label: "chambres d'hôtes" },
  rehabilitation: { bonus: 0.05, label: "réhabilitation de dépendances" },
  locatif_saisonnier: { bonus: 0.05, label: "location saisonnière" },
  equestre: { bonus: 0.04, label: "activité équestre" },
  changement_destination: { bonus: 0.03, label: "changement de destination" },
  exploitation_agricole: { bonus: 0.03, label: "exploitation agricole" },
};
const ATYPIQUE_POTENTIEL_CAP = 0.25;

const ATYPIQUE_CONTRAINTE_MALUS: Record<string, { malus: number; label: string }> = {
  risques_naturels: { malus: 0.06, label: "risques naturels" },
  contraintes_exploitation: { malus: 0.06, label: "contraintes d'exploitation" },
  abf: { malus: 0.05, label: "avis ABF obligatoire" },
  droit_passage: { malus: 0.04, label: "droit de passage" },
  natura2000: { malus: 0.04, label: "Natura 2000" },
  obligation_ouverture: { malus: 0.04, label: "obligation d'ouverture au public" },
  servitudes: { malus: 0.03, label: "servitudes" },
};

/**
 * Surface pondérée d'un bien d'exception.
 *
 * Au-delà d'une surface de résidence courante, chaque mètre carré
 * supplémentaire se vend beaucoup moins cher : il coûte à chauffer et à
 * entretenir sans élargir la clientèle. Sans ce palier, un château de 900 m²
 * ressortirait à neuf fois le prix d'une maison de 100 m².
 */
function surfacePondereeAtypique(surface: number): number {
  const palier1 = Math.min(surface, 200);
  const palier2 = Math.min(Math.max(surface - 200, 0), 300) * 0.55;
  const palier3 = Math.max(surface - 500, 0) * 0.3;
  return palier1 + palier2 + palier3;
}

function computeAtypiqueEstimation(form: LeenkeyForm, dvfPrixM2?: number | null): EstimationResult {
  const typeEntry = ATYPIQUE_TYPE_MULT[form.atypique_type ?? "autre"] ?? ATYPIQUE_TYPE_MULT.autre;
  const surface = form.surface_habitable || 0;
  const dependances = form.surface_dependances ?? 0;

  const baseResidentiel = melangeAvecDvf(dvfPrixM2, basePrixM2(form));
  const prixM2Marche = Math.round(baseResidentiel * typeEntry.mult);

  // ── Caractères exceptionnels ──
  let caractereSomme = 0;
  for (const c of form.caracteres_exceptionnels) {
    caractereSomme += CARACTERE_POIDS[c] ?? 0.005;
  }
  const caractereMult = 1 + Math.min(caractereSomme, CARACTERE_CAP);

  // ── État technique ──
  let travauxMalus = 0;
  const postesARefaire: string[] = [];
  for (const [poste, malus] of Object.entries(ATYPIQUE_POSTE_MALUS)) {
    if (form.travaux_recents.includes(poste)) continue;
    const etat = form.etat_technique[poste];
    if (etat === "À refaire") {
      travauxMalus += malus;
      postesARefaire.push(poste.toLowerCase());
    } else if (etat === "Moyen") {
      travauxMalus += malus / 2;
    }
  }
  travauxMalus = Math.min(travauxMalus, 0.3);
  // Quand le vendeur chiffre les travaux, ce montant fait foi : la décote au
  // pourcentage n'est plus là que pour le risque résiduel, sans quoi les
  // travaux seraient comptés deux fois.
  const budgetTravaux = form.travaux_budget ?? 0;
  const malusApplique = budgetTravaux > 0 ? travauxMalus / 2 : travauxMalus;
  const travauxMult = 1 - malusApplique;

  // Sur ce type de bien, un DPE défavorable est la norme et les acquéreurs
  // l'anticipent : l'effet est réel mais atténué par rapport à un logement
  // standard, où il surprend et fait fuir.
  const dpeAtypique = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;
  const dpeMult = 1 + (dpeAtypique.mult - 1) * 0.5;

  // ── Environnement ──
  const cadreMult = CADRE_MULT[form.cadre ?? "Village"] ?? 1;
  const envMult =
    1 +
    (NIVEAU_BONUS[form.calme ?? "Moyen"] ?? 0) +
    (NIVEAU_BONUS[form.qualite_paysagere ?? "Moyen"] ?? 0) +
    (NIVEAU_BONUS[form.attractivite_touristique ?? "Moyen"] ?? 0) * 0.5;

  // L'acquéreur d'un bien d'exception vient souvent de loin : le temps de
  // trajet depuis une grande ville ou une gare compte davantage qu'ailleurs.
  let accesMult = 1;
  if (form.distances.grande_ville === "< 10 min") accesMult += 0.05;
  else if (form.distances.grande_ville === "> 1 h") accesMult -= 0.08;
  if (form.distances.gare === "< 10 min") accesMult += 0.03;
  else if (form.distances.gare === "> 1 h") accesMult -= 0.03;

  // ── Potentiel et contraintes ──
  let potentielSomme = 0;
  const potentielLabels: string[] = [];
  for (const p of form.potentiel_atypique) {
    const e = ATYPIQUE_POTENTIEL_BONUS[p];
    if (e) {
      potentielSomme += e.bonus;
      potentielLabels.push(e.label);
    }
  }
  const potentielMult = 1 + Math.min(potentielSomme, ATYPIQUE_POTENTIEL_CAP);

  let contrainteSomme = 0;
  const contrainteLabels: string[] = [];
  for (const c of form.contraintes_atypique) {
    const e = ATYPIQUE_CONTRAINTE_MALUS[c];
    if (e) {
      contrainteSomme += e.malus;
      contrainteLabels.push(e.label);
    }
  }
  const contrainteMult = 1 - Math.min(contrainteSomme, 0.25);

  // Le classement Monument Historique ouvre des avantages fiscaux et du
  // prestige, mais restreint les travaux : l'effet net reste modeste.
  let classementMult = 1;
  if (form.classement.includes("monument_historique")) classementMult += 0.03;
  if (form.classement.includes("label_fondation")) classementMult += 0.01;

  const globalMult =
    caractereMult *
    travauxMult *
    cadreMult *
    envMult *
    accesMult *
    potentielMult *
    contrainteMult *
    classementMult *
    dpeMult;

  const prixM2 = Math.round(prixM2Marche * globalMult);

  // Bâti principal, avec paliers de surface.
  const valeurBati = prixM2 * surfacePondereeAtypique(surface);
  // Les dépendances sont du volume brut : une fraction du prix du bâti.
  const valeurDependances = prixM2 * 0.15 * dependances;
  // Le parc au-delà du jardin d'agrément se valorise en terre, pas en terrain
  // à bâtir : 25 hectares de bois ne valent pas 25 hectares de lotissement.
  const terrain = form.surface_terrain ?? 0;
  const valeurParc = Math.max(0, terrain - 2000) * basePrixM2Terrain(form) * 0.08;

  const valeurPatrimoniale = valeurBati + valeurDependances + valeurParc;

  // ── Exploitation existante ──
  // Un bien qui s'autofinance intéresse une clientèle d'exploitants, pas
  // seulement de résidents. On capitalise l'excédent à un taux élevé :
  // l'activité est plus risquée et moins liquide qu'un bail classique.
  const revenus = form.revenus_existants ?? 0;
  const coutAnnuel =
    (form.charges_atypique ?? 0) + (form.cout_entretien_annuel ?? 0) + (form.taxe_fonciere ?? 0);
  const excedent = revenus - coutAnnuel;
  const valeurExploitation = excedent > 0 ? excedent / 0.09 : 0;

  const valeurAvantTravaux =
    valeurExploitation > 0
      ? valeurPatrimoniale * 0.75 + valeurExploitation * 0.25
      : valeurPatrimoniale;

  const prixEstime = Math.max(0, Math.round((valeurAvantTravaux - budgetTravaux) / 1000) * 1000);
  const prixM2Final = surface > 0 ? Math.round(prixEstime / surface) : 0;
  const deltaMarche = Math.round(((prixM2Final - prixM2Marche) / prixM2Marche) * 100);

  const facteurs: FactorImpact[] = [
    {
      label: "Nature du bien",
      impact: Math.round((typeEntry.mult - 1) * 100),
      detail: `${typeEntry.label} · référence ${prixM2Marche.toLocaleString("fr-FR")} €/m²`,
    },
    {
      label: "Caractères exceptionnels",
      impact: Math.round((caractereMult - 1) * 100),
      detail: `${form.caracteres_exceptionnels.length} élément${form.caracteres_exceptionnels.length > 1 ? "s" : ""} d'exception déclaré${form.caracteres_exceptionnels.length > 1 ? "s" : ""}`,
    },
    {
      label: "État & travaux",
      impact: -Math.round(malusApplique * 100),
      detail: budgetTravaux
        ? `${budgetTravaux.toLocaleString("fr-FR")} € de travaux déduits directement${postesARefaire.length ? ` · à reprendre : ${postesARefaire.join(", ")}` : ""}`
        : postesARefaire.length
          ? `À reprendre : ${postesARefaire.join(", ")}`
          : "Aucun poste majeur à reprendre",
    },
    {
      label: "Cadre & environnement",
      impact: Math.round((cadreMult * envMult - 1) * 100),
      detail: form.cadre ?? "Cadre non renseigné",
    },
    {
      label: "Accessibilité",
      impact: Math.round((accesMult - 1) * 100),
      detail: form.distances.grande_ville
        ? `Grande ville à ${form.distances.grande_ville}`
        : "Non renseignée",
    },
    {
      label: "Potentiel d'exploitation",
      impact: Math.round((potentielMult - 1) * 100),
      detail: potentielLabels.length ? potentielLabels.join(", ") : "Usage résidentiel seul",
    },
    {
      label: "Contraintes",
      impact: -Math.round(Math.min(contrainteSomme, 0.25) * 100),
      detail: contrainteLabels.length ? contrainteLabels.join(", ") : "Aucune déclarée",
    },
    {
      label: "Performance énergétique",
      impact: Math.round((dpeMult - 1) * 100),
      detail: dpeAtypique.label,
    },
  ];

  if (surface > 200) {
    facteurs.push({
      label: "Effet de surface",
      impact: -Math.round((1 - surfacePondereeAtypique(surface) / surface) * 100),
      detail: `Au-delà de 200 m², chaque mètre carré supplémentaire se valorise moins : il coûte à entretenir sans élargir la clientèle`,
    });
  }
  if (valeurExploitation > 0) {
    facteurs.push({
      label: "Exploitation en place",
      impact: 0,
      detail: `${revenus.toLocaleString("fr-FR")} € de revenus − ${coutAnnuel.toLocaleString("fr-FR")} € de coûts = ${excedent.toLocaleString("fr-FR")} € d'excédent annuel — le bien s'autofinance, ce qui élargit nettement la clientèle`,
    });
  } else if (coutAnnuel > 0) {
    facteurs.push({
      label: "Coût de détention",
      impact: 0,
      detail: `${coutAnnuel.toLocaleString("fr-FR")} € par an d'entretien, taxe foncière et charges — un acquéreur l'intègre dans son budget`,
    });
  }

  const champsClés: Array<keyof LeenkeyForm> = [
    "adresse",
    "code_postal",
    "atypique_type",
    "surface_habitable",
    "annee_construction",
    "cadre",
  ];
  let complet = champsClés.filter((k) => {
    const v = form[k];
    return v !== null && v !== "" && v !== undefined;
  }).length;
  if (form.caracteres_exceptionnels.length) complet += 1;
  if (Object.keys(form.etat_technique).length) complet += 1;
  const fiabiliteScore = Math.round((complet / (champsClés.length + 2)) * 100);
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  const dvfExploitable = !!dvfPrixM2 && dvfPrixM2 > 0;
  const tensionMarche = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarche,
    dvfExploitable,
  });

  let score = 50;
  score += Math.round((caractereMult - 1) * 150);
  score += Math.round((potentielMult - 1) * 100);
  score -= Math.round(malusApplique * 120);
  score -= Math.round(Math.min(contrainteSomme, 0.25) * 80);
  if (excedent > 0) score += 8;
  score = Math.max(0, Math.min(100, score));

  // Un bien d'exception se vend lentement : la clientèle est nationale, voire
  // internationale, et se compte en dizaines d'acquéreurs, pas en centaines.
  let delaiBase: [number, number] = [180, 360];
  if (form.atypique_type === "chateau") delaiBase = [300, 540];
  else if (form.atypique_type === "loft" || form.atypique_type === "architecte")
    delaiBase = [90, 180];
  if (form.classement.includes("monument_historique"))
    delaiBase = [delaiBase[0] + 60, delaiBase[1] + 90];
  if (excedent > 0) delaiBase = [Math.round(delaiBase[0] * 0.8), Math.round(delaiBase[1] * 0.8)];

  const recommandations: Recommendation[] = [];
  if (postesARefaire.length && !budgetTravaux) {
    recommandations.push({
      title: "Chiffrer les travaux avant la mise en vente",
      description: `Des postes majeurs sont à reprendre (${postesARefaire.slice(0, 3).join(", ")}). Sans devis, l'acquéreur retiendra toujours l'hypothèse haute et la déduira de son offre.`,
      uplift: "+5 à 12%",
    });
  }
  if (!form.potentiel_atypique.length) {
    recommandations.push({
      title: "Faire étudier le potentiel d'exploitation",
      description:
        "Gîtes, chambres d'hôtes, événementiel : un bien capable de générer des revenus s'adresse à une clientèle bien plus large qu'une simple résidence secondaire.",
      uplift: "+8 à 15%",
    });
  }
  if (excedent <= 0 && coutAnnuel > 0) {
    recommandations.push({
      title: "Documenter le coût réel de détention",
      description: `Entretien, taxe foncière et charges représentent ${coutAnnuel.toLocaleString("fr-FR")} € par an. Un budget présenté et maîtrisé rassure ; un budget flou fait fuir.`,
    });
  }
  if (form.caracteres_exceptionnels.length < 5) {
    recommandations.push({
      title: "Faire réaliser un reportage photo professionnel",
      description:
        "Sur ce type de bien, la vente se joue sur l'émotion et une clientèle éloignée. Photos, drone et visite virtuelle ne sont pas un supplément, ce sont l'outil de vente principal.",
      uplift: "+3 à 8%",
    });
  }
  if (recommandations.length < 3) {
    recommandations.push({
      title: "Constituer le dossier historique et technique",
      description:
        "Plans, historique du bien, factures de travaux, diagnostics, arrêté de classement : sur un bien d'exception, le dossier fait partie du produit.",
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
  // Un bien d'exception n'a presque pas de comparables : caractères, état réel
  // et potentiel d'exploitation priment sur le prix au mètre carré.
  if (form.type === "atypique") return computeAtypiqueEstimation(form, dvfPrixM2);

  const surface = form.surface_habitable || form.surface_carrez || 60;

  const prixM2Table = basePrixM2(form);
  const prixM2Marche = melangeAvecDvf(dvfPrixM2, prixM2Table);

  // Multiplicateurs
  const typeMult = TYPE_MULT[form.type ?? "maison"] ?? 1;
  const etatEntry = ETAT_MULT[form.etat ?? "bon"] ?? ETAT_MULT.bon;
  const dpeEntry = DPE_MULT[form.dpe ?? "inconnu"] ?? DPE_MULT.inconnu;

  // Extérieur — les superficies saisies modulent le barème de base : une
  // terrasse de 6 m² et une de 40 m² ne valent pas la même chose.
  let extMult = 1;
  const extDetail: string[] = [];

  const ajouteExt = (cle: string, base: number, libelle: string, reference?: number) => {
    if (!form.exterieur.includes(cle)) return;
    const saisi = form.exterieur_details[cle];
    const facteur = reference && saisi && saisi > 0 ? facteurTaille(saisi, reference) : 1;
    extMult += base * facteur;
    extDetail.push(saisi && saisi > 0 ? `${libelle} ${saisi} m²` : libelle);
  };

  ajouteExt("jardin", 0.04, "jardin", 250);
  ajouteExt("terrasse", 0.03, "terrasse", 20);
  ajouteExt("balcon", 0.015, "balcon", 8);
  ajouteExt("piscine", 0.05, "piscine");
  ajouteExt("cave", 0.01, "cave", 12);
  ajouteExt("grenier", 0.01, "grenier", 25);
  ajouteExt("dependance", 0.02, "dépendance", 30);

  // Stationnement : chaque place compte, avec un rendement décroissant.
  for (const [cle, base, libelle] of [
    ["garage", 0.025, "garage"],
    ["box", 0.025, "box"],
    ["parking", 0.015, "parking"],
  ] as const) {
    if (!form.exterieur.includes(cle)) continue;
    const places = Math.max(1, Math.min(4, form.exterieur_details[cle] ?? 1));
    extMult += base * (1 + (places - 1) * 0.6);
    extDetail.push(places > 1 ? `${libelle} ${places} places` : libelle);
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

  // Depuis 2023, vendre un logement classé F ou G impose un audit énergétique.
  // Son absence ne décote pas le bien en soi : elle bloque la signature, et
  // l'acquéreur la traite comme un risque.
  const passoire = form.dpe === "F" || form.dpe === "G";
  const auditManquant = passoire && form.audit_energetique === "Non réalisé";
  const auditMult = auditManquant ? 0.98 : 1;

  const globalMult =
    typeMult * etatEntry.mult * dpeEntry.mult * extMult * prestMult * etageMult * auditMult;
  const prixM2 = Math.round(prixM2Marche * globalMult);
  // Les travaux chiffrés par le vendeur sont déduits tels quels : un devis vaut
  // mieux qu'un pourcentage, et évite de compter deux fois ce que le DPE traduit
  // déjà en décote.
  const budgetTravaux = form.travaux_energie_budget ?? 0;
  const prixEstime = Math.max(0, Math.round((prixM2 * surface - budgetTravaux) / 1000) * 1000);
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
  // Un DPE d'avant juillet 2021 relève de l'ancienne méthode : il n'est plus
  // opposable et sera refait avant la vente. Le multiplicateur DPE repose donc
  // sur une donnée incertaine — c'est la fiabilité qui en pâtit, pas le prix.
  const dpePerime = !!form.dpe && form.dpe !== "inconnu" && form.dpe_date === "Avant juillet 2021";
  const fiabiliteScore = Math.max(
    0,
    Math.round((complet / champsClés.length) * 100) - (dpePerime ? 15 : 0),
  );
  const fiabilite: EstimationResult["fiabilite"] =
    fiabiliteScore >= 80 ? "elevee" : fiabiliteScore >= 55 ? "moyenne" : "faible";

  const tensionMarcheTmp = tension(form);
  const rangePct = fourchette({
    type: form.type,
    fiabilite,
    tension: tensionMarcheTmp,
    dvfExploitable: !!dvfPrixM2 && dvfPrixM2 > 0,
  });

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
