/**
 * Récupération de la surface de parcelle auprès du cadastre.
 *
 * Chaîne : l'adresse saisie donne des coordonnées via la Base Adresse
 * Nationale — déjà utilisée par l'étape Localisation — puis l'API Carto de
 * l'IGN renvoie la parcelle qui contient ce point, avec sa contenance en m².
 *
 * Deux API publiques, gratuites, sans clé.
 *
 * ⚠️ La contenance n'a de sens que pour une maison ou un terrain. Sur un
 * appartement, c'est la parcelle de tout l'immeuble : 1 132 m² pour un
 * immeuble parisien ne sont pas le terrain du vendeur du T3.
 */

export interface Parcelle {
  /** Surface de la parcelle en m². */
  contenance: number;
  section: string;
  numero: string;
  commune: string;
}

/** Une adresse sans numéro de rue tombe sur l'axe de la voie, pas sur une parcelle. */
function adressePrecise(properties: { type?: string; score?: number }): boolean {
  return properties.type === "housenumber" && (properties.score ?? 0) >= 0.4;
}

/**
 * Cherche la parcelle correspondant à une adresse.
 * Renvoie null dès que le résultat ne serait pas fiable, plutôt qu'une valeur
 * approximative : un chiffre faux est pire qu'un champ vide.
 */
export async function chercherParcelle(adresse: string): Promise<Parcelle | null> {
  if (!adresse || adresse.trim().length < 8) return null;

  try {
    const ban = await fetch(
      `https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(adresse)}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!ban.ok) return null;
    const data = (await ban.json()) as {
      features?: {
        geometry?: { coordinates?: [number, number] };
        properties?: { type?: string; score?: number };
      }[];
    };
    const f = data.features?.[0];
    const coords = f?.geometry?.coordinates;
    if (!f?.properties || !coords || !adressePrecise(f.properties)) return null;

    const geom = JSON.stringify({ type: "Point", coordinates: coords });
    const carto = await fetch(
      `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(geom)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!carto.ok) return null;
    const parcelles = (await carto.json()) as {
      features?: {
        properties?: {
          contenance?: number;
          section?: string;
          numero?: string;
          nom_com?: string;
        };
      }[];
    };
    const p = parcelles.features?.[0]?.properties;
    if (!p?.contenance || p.contenance <= 0) return null;

    return {
      contenance: p.contenance,
      section: p.section ?? "",
      numero: p.numero ?? "",
      commune: p.nom_com ?? "",
    };
  } catch {
    // Réseau indisponible ou API en panne : on laisse simplement le champ vide.
    return null;
  }
}
