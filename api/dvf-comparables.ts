import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Endpoint qui interroge l'API DVF (Demandes de Valeurs Foncières) publique
 * pour récupérer les ventes immobilières comparables.
 *
 * Source : data.gouv.fr (données officielles DGFiP)
 * API utilisée : https://api.cquest.org/dvf
 *
 * ⚠️ IMPORTANT : ces données sont HISTORIQUES (publiées avec ~6 mois de délai).
 * Elles ne reflètent pas l'état du marché en temps réel mais donnent
 * une base solide d'analyse de tendance.
 */

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

function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
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
    commune: string;
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
    if (opts.commune && m.nom_commune && normaliser(m.nom_commune) !== opts.commune) return false;
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
    // Un code postal rural couvre souvent plusieurs communes, et en ville il
    // recouvre un arrondissement entier : on restreint dès qu'on connaît la commune.
    const commune = body.ville ? normaliser(String(body.ville)) : "";

    // Surface min/max : ±30% pour considérer comme comparable
    const surfaceMin = surface > 0 ? Math.round(surface * 0.7) : 0;
    const surfaceMax = surface > 0 ? Math.round(surface * 1.3) : 9999;

    // Appel API DVF cquest.org (gratuit, public, basé sur data.gouv.fr)
    // Documentation : https://github.com/cquest/dvf-api
    const url = `https://api.cquest.org/dvf?code_postal=${encodeURIComponent(codePostal)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    let mutations: DvfMutation[] = [];
    try {
      const dvfRes = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (!dvfRes.ok) {
        console.warn("DVF API non disponible:", dvfRes.status);
        return res.status(200).json({
          available: false,
          message: "Données DVF temporairement indisponibles",
          comparables: [],
        });
      }

      const data = (await dvfRes.json()) as { resultats?: DvfMutation[] };
      mutations = data.resultats ?? [];
    } catch (err) {
      clearTimeout(timeout);
      console.warn("Erreur appel DVF:", err);
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
    } = agregerMutations(mutations, { acceptedTypes, commune, surfaceMin, surfaceMax, surface });

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
