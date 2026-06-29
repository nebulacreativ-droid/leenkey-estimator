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
  return (
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

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
    const surface = body.surface ?? 0;
    const acceptedTypes = TYPE_MAPPING[type] ?? ["Maison", "Appartement"];

    // Surface min/max : ±30% pour considérer comme comparable
    const surfaceMin = surface > 0 ? Math.round(surface * 0.7) : 0;
    const surfaceMax = surface > 0 ? Math.round(surface * 1.3) : 9999;

    // Appel API DVF cquest.org (gratuit, public, basé sur data.gouv.fr)
    // Documentation : https://github.com/cquest/dvf-api
    const url = `https://api.cquest.org/dvf?code_postal=${encodeURIComponent(
      codePostal
    )}`;

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

    // Filtrage : type, surface, valeur cohérente
    const filtered = mutations.filter((m) => {
      if (!m.valeur_fonciere || m.valeur_fonciere < 10000) return false;
      if (!m.surface_reelle_bati || m.surface_reelle_bati < 5) return false;
      if (
        surface > 0 &&
        (m.surface_reelle_bati < surfaceMin ||
          m.surface_reelle_bati > surfaceMax)
      )
        return false;
      if (!acceptedTypes.includes(m.type_local)) return false;
      return true;
    });

    // Conversion en format Comparable + tri par récence
    const comparables: Comparable[] = filtered
      .map((m) => ({
        date: m.date_mutation,
        prix: m.valeur_fonciere,
        surface: m.surface_reelle_bati,
        prixM2: Math.round(m.valeur_fonciere / m.surface_reelle_bati),
        pieces: m.nombre_pieces_principales ?? 0,
        type: m.type_local,
        adresse: [m.adresse_numero, m.adresse_nom_voie]
          .filter(Boolean)
          .join(" ")
          .trim(),
        ville: m.nom_commune ?? "",
        monthsAgo: monthsBetween(m.date_mutation),
      }))
      .filter((c) => c.monthsAgo <= 36) // garder seulement les 36 derniers mois max
      .sort((a, b) => a.monthsAgo - b.monthsAgo);

    // Pondération récence : poids = 1 / (1 + monthsAgo/12)
    // Une vente d'il y a 1 mois pèse 0.92, 12 mois → 0.5, 24 mois → 0.33
    let totalWeight = 0;
    let weightedPrixM2 = 0;
    comparables.forEach((c) => {
      const weight = 1 / (1 + c.monthsAgo / 12);
      totalWeight += weight;
      weightedPrixM2 += c.prixM2 * weight;
    });

    const prixM2Pondere =
      totalWeight > 0 ? Math.round(weightedPrixM2 / totalWeight) : 0;

    // Statistiques
    const tousPrixM2 = comparables.map((c) => c.prixM2).sort((a, b) => a - b);
    const median =
      tousPrixM2.length > 0
        ? tousPrixM2[Math.floor(tousPrixM2.length / 2)]
        : 0;
    const min = tousPrixM2[0] ?? 0;
    const max = tousPrixM2[tousPrixM2.length - 1] ?? 0;

    // Date la plus récente disponible (pour disclaimer transparent)
    const dateLaPlusRecente =
      comparables.length > 0 ? comparables[0].date : null;

    return res.status(200).json({
      available: comparables.length > 0,
      codePostal,
      type,
      surfaceFiltre: surface > 0 ? { min: surfaceMin, max: surfaceMax } : null,
      nbComparables: comparables.length,
      stats: {
        prixM2Pondere, // pondéré par récence — à utiliser pour l'estimation
        prixM2Median: median,
        prixM2Min: min,
        prixM2Max: max,
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
