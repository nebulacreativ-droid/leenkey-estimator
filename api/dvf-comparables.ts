import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Comparables de vente issus de DVF (Demandes de Valeurs Foncières).
 *
 * Source : fichiers geo-dvf d'Etalab, dérivés des données DGFiP.
 * https://files.data.gouv.fr/geo-dvf/latest/csv/{année}/communes/{dép}/{insee}.csv
 *
 * L'endpoint interrogeait auparavant api.cquest.org, qui renvoie aujourd'hui
 * 502 sur toutes ses routes. Les fichiers officiels sont en outre bien plus
 * riches : ils exposent `id_mutation`, sans lequel une vente s'étalant sur
 * plusieurs lots ne peut pas être regroupée — et c'est le cas de 52 % des
 * mutations (mesuré sur Bordeaux 2025).
 *
 * ⚠️ Ces données sont HISTORIQUES, publiées avec environ six mois de délai.
 */

/** Millésimes tentés, du plus récent au plus ancien. Un 404 est normal en début d'année. */
function anneesCandidates(): number[] {
  const a = new Date().getFullYear();
  return [a, a - 1, a - 2];
}

/** En deçà, on élargit la recherche au millésime précédent. */
const MUTATIONS_SOUHAITEES = 8;

/**
 * Code INSEE de la commune à partir du code postal, pour les trois villes à
 * arrondissements. DVF les publie par arrondissement : Paris 11e est le
 * fichier 75111, et 75056 (Paris entier) n'existe pas.
 */
function inseeArrondissement(codePostal: string): string | null {
  const n = Number(codePostal);
  if (n >= 75001 && n <= 75020) return String(75100 + (n - 75000));
  if (n >= 69001 && n <= 69009) return String(69380 + (n - 69000));
  if (n >= 13001 && n <= 13016) return String(13200 + (n - 13000));
  return null;
}

/** Résout le code INSEE via la Base Adresse Nationale, déjà utilisée par le formulaire. */
async function resoudreInsee(codePostal: string, ville?: string): Promise<string | null> {
  const arr = inseeArrondissement(codePostal);
  if (arr) return arr;
  const url =
    "https://api-adresse.data.gouv.fr/search/?q=" +
    encodeURIComponent(ville || codePostal) +
    `&postcode=${encodeURIComponent(codePostal)}&type=municipality&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { properties?: { citycode?: string } }[];
    };
    return data.features?.[0]?.properties?.citycode ?? null;
  } catch {
    return null;
  }
}

/**
 * Charge un millésime pour une commune.
 *
 * Les fichiers n'utilisent aucun guillemet et comptent exactement 40 colonnes :
 * un découpage sur la virgule est sûr et évite d'embarquer un parseur CSV.
 */
async function chargerAnnee(insee: string, annee: number): Promise<DvfMutation[]> {
  const dep = insee.length === 5 && insee.startsWith("97") ? insee.slice(0, 3) : insee.slice(0, 2);
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${annee}/communes/${dep}/${insee}.csv`;
  let texte: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return []; // 404 attendu sur un millésime non encore publié
    texte = await res.text();
  } catch {
    return [];
  }

  const lignes = texte.split("\n");
  if (lignes.length < 2) return [];
  const cols = lignes[0].split(",");
  const idx = (nom: string) => cols.indexOf(nom);
  const iId = idx("id_mutation");
  const iDate = idx("date_mutation");
  const iNature = idx("nature_mutation");
  const iValeur = idx("valeur_fonciere");
  const iNum = idx("adresse_numero");
  const iVoie = idx("adresse_nom_voie");
  const iCp = idx("code_postal");
  const iCommune = idx("nom_commune");
  const iType = idx("type_local");
  const iSurface = idx("surface_reelle_bati");
  const iPieces = idx("nombre_pieces_principales");
  if (iId < 0 || iValeur < 0) return [];

  const out: DvfMutation[] = [];
  for (let i = 1; i < lignes.length; i++) {
    const c = lignes[i].split(",");
    if (c.length < cols.length) continue;
    out.push({
      id_mutation: c[iId],
      date_mutation: c[iDate],
      nature_mutation: c[iNature],
      valeur_fonciere: Number(c[iValeur]) || 0,
      type_local: c[iType],
      surface_reelle_bati: Number(c[iSurface]) || 0,
      nombre_pieces_principales: Number(c[iPieces]) || 0,
      code_postal: c[iCp],
      nom_commune: c[iCommune],
      adresse_numero: c[iNum],
      adresse_nom_voie: c[iVoie],
    });
  }
  return out;
}

interface DvfMutation {
  date_mutation: string;
  valeur_fonciere: number;
  type_local: string;
  surface_reelle_bati: number;
  nombre_pieces_principales: number;
  code_postal: string;
  nom_commune: string;
  adresse_numero?: string;
  adresse_nom_voie?: string;
  id_mutation?: string;
  nature_mutation?: string;
}

/** Bornes de vraisemblance du prix au m² bâti en France. Au-delà, c'est une anomalie de saisie. */
const PRIX_M2_MIN = 200;
const PRIX_M2_MAX = 25000;

/** En dessous, la moyenne locale n'est pas assez robuste pour piloter une estimation. */
const MIN_MUTATIONS_FIABLE = 5;

/**
 * Identifiant d'une mutation.
 *
 * DVF publie une ligne par lot : la vente d'un appartement avec sa cave et son
 * parking produit trois lignes portant la MÊME valeur foncière. Sans
 * regroupement, la vente est comptée trois fois et la ligne « cave de 6 m² »
 * ressort à 60 000 €/m². C'est le premier piège de cette base.
 */
function cleMutation(m: DvfMutation): string {
  if (m.id_mutation) return m.id_mutation;
  return [
    m.date_mutation,
    m.valeur_fonciere,
    m.code_postal,
    m.adresse_numero ?? "",
    m.adresse_nom_voie ?? "",
  ].join("|");
}

/** Médiane pondérée : robuste aux valeurs extrêmes, contrairement à la moyenne. */
function medianePonderee(valeurs: { valeur: number; poids: number }[]): number {
  if (!valeurs.length) return 0;
  const tri = [...valeurs].sort((a, b) => a.valeur - b.valeur);
  const total = tri.reduce((s, v) => s + v.poids, 0);
  let cumul = 0;
  for (const v of tri) {
    cumul += v.poids;
    if (cumul >= total / 2) return v.valeur;
  }
  return tri[tri.length - 1].valeur;
}

/** Écarte les valeurs hors de [Q1 − 1,5 IQR ; Q3 + 1,5 IQR]. */
function sansAberrantes<T>(items: T[], valeur: (t: T) => number): T[] {
  if (items.length < 4) return items;
  const tri = [...items].map(valeur).sort((a, b) => a - b);
  const q = (p: number) => tri[Math.min(tri.length - 1, Math.floor(tri.length * p))];
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return items;
  const bas = q1 - 1.5 * iqr;
  const haut = q3 + 1.5 * iqr;
  return items.filter((t) => valeur(t) >= bas && valeur(t) <= haut);
}

interface Comparable {
  date: string;
  prix: number;
  prixM2: number;
  surface: number;
  pieces: number;
  type: string;
  adresse: string;
  ville: string;
  monthsAgo: number;
  /** Nombre de lots regroupés dans cette mutation. */
  nbLots: number;
}

/**
 * Transforme les lignes brutes DVF en comparables exploitables.
 *
 * Fonction pure, isolée du handler pour être testable sans appel réseau.
 * Les quatre étapes — filtrage, regroupement par mutation, rejet des
 * aberrantes, médiane pondérée — sont ce qui sépare une donnée publique brute
 * d'un prix de référence utilisable.
 */
export function agregerMutations(
  mutations: DvfMutation[],
  opts: {
    acceptedTypes: string[];
    codePostal: string;
    surfaceMin: number;
    surfaceMax: number;
    surface: number;
  },
) {
  // 1. Lignes exploitables : vraie vente, du bon type, valeur et surface saines.
  const lignes = mutations.filter((m) => {
    if (!m.valeur_fonciere || m.valeur_fonciere < 10000) return false;
    if (!m.surface_reelle_bati || m.surface_reelle_bati < 5) return false;
    if (!opts.acceptedTypes.includes(m.type_local)) return false;
    // Échanges, expropriations et adjudications ne reflètent pas le marché.
    if (m.nature_mutation && m.nature_mutation !== "Vente") return false;
    // Un code postal peut couvrir plusieurs communes : on s'y limite si on la connaît.
    // Le fichier couvre déjà toute la commune ; certaines en ont plusieurs codes
    // postaux, on se limite à celui du bien quand la ligne le renseigne.
    if (opts.codePostal && m.code_postal && m.code_postal !== opts.codePostal) return false;
    return true;
  });

  // 2. Regroupement par mutation : la valeur foncière est celle de la vente
  // entière, elle se rapporte donc à la somme des surfaces vendues.
  const parMutation = new Map<string, DvfMutation[]>();
  for (const m of lignes) {
    const cle = cleMutation(m);
    const groupe = parMutation.get(cle);
    if (groupe) groupe.push(m);
    else parMutation.set(cle, [m]);
  }

  let comparables: Comparable[] = [];
  for (const groupe of parMutation.values()) {
    const surfaceTotale = groupe.reduce((s, m) => s + m.surface_reelle_bati, 0);
    if (surfaceTotale < 5) continue;
    const tete = groupe[0];
    const prixM2 = Math.round(tete.valeur_fonciere / surfaceTotale);
    if (prixM2 < PRIX_M2_MIN || prixM2 > PRIX_M2_MAX) continue;
    // Le filtre de surface porte sur la mutation entière, pas lot par lot.
    if (opts.surface > 0 && (surfaceTotale < opts.surfaceMin || surfaceTotale > opts.surfaceMax))
      continue;
    comparables.push({
      date: tete.date_mutation,
      prix: tete.valeur_fonciere,
      surface: surfaceTotale,
      prixM2,
      pieces: groupe.reduce((s, m) => s + (m.nombre_pieces_principales ?? 0), 0),
      type: tete.type_local,
      adresse: [tete.adresse_numero, tete.adresse_nom_voie].filter(Boolean).join(" ").trim(),
      ville: tete.nom_commune ?? "",
      monthsAgo: monthsBetween(tete.date_mutation),
      nbLots: groupe.length,
    });
  }

  const nbMutations = comparables.length;
  comparables = comparables.filter((c) => c.monthsAgo <= 36);

  // 3. Rejet des valeurs aberrantes : ventes entre proches, prix symboliques,
  // biens hors norme. Une seule suffisait à déplacer la moyenne.
  const nbAvantAberrantes = comparables.length;
  comparables = sansAberrantes(comparables, (c) => c.prixM2).sort(
    (a, b) => a.monthsAgo - b.monthsAgo,
  );
  const nbAberrantesEcartees = nbAvantAberrantes - comparables.length;

  // 4. Médiane pondérée par la récence plutôt que moyenne pondérée : une vente
  // atypique survivante ne peut plus tirer le résultat à elle seule.
  // Poids : 1 mois → 0,92 · 12 mois → 0,50 · 24 mois → 0,33.
  const prixM2Pondere = Math.round(
    medianePonderee(
      comparables.map((c) => ({ valeur: c.prixM2, poids: 1 / (1 + c.monthsAgo / 12) })),
    ),
  );

  const tous = comparables.map((c) => c.prixM2).sort((a, b) => a - b);
  return {
    comparables,
    prixM2Pondere,
    median: tous.length ? tous[Math.floor(tous.length / 2)] : 0,
    min: tous[0] ?? 0,
    max: tous[tous.length - 1] ?? 0,
    nbMutations,
    nbAberrantesEcartees,
    lignesRetenues: lignes.length,
  };
}

const TYPE_MAPPING: Record<string, string[]> = {
  maison: ["Maison"],
  appartement: ["Appartement"],
  studio: ["Appartement"],
  loft: ["Appartement", "Maison"],
  local_commercial: ["Local industriel. commercial ou assimilé"],
  immeuble: ["Maison", "Appartement"],
  atypique: ["Maison", "Appartement"],
};

function monthsBetween(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body as {
      codePostal?: string;
      ville?: string;
      codeInsee?: string;
      type?: string;
      surface?: number;
    };

    if (!body.codePostal) {
      return res.status(400).json({ error: "codePostal requis" });
    }

    const codePostal = String(body.codePostal).trim();
    const type = body.type ?? "maison";

    // Un terrain n'a pas de surface bâtie : les mutations DVF exploitées ici
    // (filtrées sur surface_reelle_bati) ne le concernent pas. Sans ce garde-fou,
    // le terrain récupérait les comparables Maison/Appartement du code postal et
    // se retrouvait valorisé au prix du m² bâti.
    if (type === "terrain") {
      return res.status(200).json({
        available: false,
        message: "Comparables DVF non disponibles pour les terrains",
        comparables: [],
      });
    }
    const surface = body.surface ?? 0;
    const acceptedTypes = TYPE_MAPPING[type] ?? ["Maison", "Appartement"];

    // Surface min/max : ±30% pour considérer comme comparable
    const surfaceMin = surface > 0 ? Math.round(surface * 0.7) : 0;
    const surfaceMax = surface > 0 ? Math.round(surface * 1.3) : 9999;

    // Les fichiers geo-dvf sont publiés par commune : il faut son code INSEE.
    const insee = body.codeInsee || (await resoudreInsee(codePostal, body.ville));
    if (!insee) {
      return res.status(200).json({
        available: false,
        message: "Commune non identifiée",
        comparables: [],
      });
    }

    // On part du millésime le plus récent et on remonte tant que l'échantillon
    // est trop mince pour être exploitable. Inutile de télécharger trois ans de
    // données là où une seule année suffit.
    let mutations: DvfMutation[] = [];
    const anneesChargees: number[] = [];
    for (const annee of anneesCandidates()) {
      const lot = await chargerAnnee(insee, annee);
      if (!lot.length) continue;
      mutations = mutations.concat(lot);
      anneesChargees.push(annee);
      const apercu = agregerMutations(mutations, {
        acceptedTypes,
        codePostal,
        surfaceMin,
        surfaceMax,
        surface,
      });
      if (apercu.comparables.length >= MUTATIONS_SOUHAITEES) break;
    }

    if (!mutations.length) {
      return res.status(200).json({
        available: false,
        message: "Données DVF temporairement indisponibles",
        comparables: [],
      });
    }

    const {
      comparables,
      prixM2Pondere,
      median,
      min,
      max,
      nbMutations,
      nbAberrantesEcartees,
      lignesRetenues,
    } = agregerMutations(mutations, { acceptedTypes, codePostal, surfaceMin, surfaceMax, surface });

    const dateLaPlusRecente = comparables.length > 0 ? comparables[0].date : null;

    return res.status(200).json({
      available: comparables.length > 0,
      codePostal,
      commune: body.ville ?? null,
      type,
      surfaceFiltre: surface > 0 ? { min: surfaceMin, max: surfaceMax } : null,
      nbComparables: comparables.length,
      stats: {
        prixM2Pondere, // médiane pondérée par récence — sert à l'estimation
        prixM2Median: median,
        prixM2Min: min,
        prixM2Max: max,
        /** En dessous de 5 mutations, l'échantillon ne doit pas piloter l'estimation. */
        fiable: comparables.length >= MIN_MUTATIONS_FIABLE,
      },
      annees: anneesChargees,
      nettoyage: {
        lignesBrutes: mutations.length,
        lignesRetenues,
        mutations: nbMutations,
        aberrantesEcartees: nbAberrantesEcartees,
      },
      dateLaPlusRecente,
      dateGenerationDonnees: new Date().toISOString(),
      // On garde seulement les 6 comparables les plus récents pour l'affichage
      comparables: comparables.slice(0, 6),
      disclaimer:
        "Données officielles DVF (data.gouv.fr / DGFiP). Les transactions sont publiées avec un délai d'environ 6 mois. Les prix peuvent avoir évolué depuis.",
    });
  } catch (error) {
    console.error("Erreur DVF handler:", error);
    return res.status(500).json({ error: "Erreur interne", available: false });
  }
}
