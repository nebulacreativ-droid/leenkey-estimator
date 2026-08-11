/**
 * Récupération de la surface de parcelle auprès du cadastre.
 *
 * Chaîne : l'adresse saisie donne des coordonnées via la Base Adresse
 * Nationale — déjà utilisée par l'étape Localisation — puis l'API Carto de
 * l'IGN renvoie la parcelle correspondante, avec sa contenance en m².
 *
 * Deux API publiques, gratuites, sans clé.
 *
 * ⚠️ La contenance n'a de sens que pour une maison ou un terrain. Sur un
 * appartement, c'est la parcelle de tout l'immeuble : 1 088 m² pour un
 * immeuble parisien ne sont pas le terrain du vendeur du T3.
 */

export interface Parcelle {
  /** Surface de la parcelle en m². */
  contenance: number;
  section: string;
  numero: string;
  commune: string;
  /**
   * Adresse telle que la BAN l'a comprise. Elle diffère parfois de la saisie —
   * « 12 avenue des Tilleuls » devient « 12 Avenue de Mérignac » — donc on
   * l'affiche pour que le vendeur puisse repérer une mauvaise correspondance.
   */
  adresseReconnue: string;
}

/** Une adresse sans numéro de rue tombe sur l'axe de la voie, pas sur une parcelle. */
function adressePrecise(properties: { type?: string; score?: number }): boolean {
  return properties.type === "housenumber" && (properties.score ?? 0) >= 0.4;
}

/** Carré de rayon r mètres autour d'un point. 1° de latitude ≈ 111 km. */
function carre([lon, lat]: [number, number], r: number) {
  const dLat = r / 111000;
  const dLon = r / (111000 * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Polygon",
    coordinates: [
      [
        [lon - dLon, lat - dLat],
        [lon + dLon, lat - dLat],
        [lon + dLon, lat + dLat],
        [lon - dLon, lat + dLat],
        [lon - dLon, lat - dLat],
      ],
    ],
  };
}

interface FeatureParcelle {
  properties?: { contenance?: number; section?: string; numero?: string; nom_com?: string };
}

async function interroger(geom: unknown): Promise<FeatureParcelle[] | null> {
  const r = await fetch(
    `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify(geom))}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!r.ok) return null;
  return ((await r.json()) as { features?: FeatureParcelle[] }).features ?? [];
}

/**
 * Cherche la parcelle correspondant à une adresse.
 *
 * La BAN place souvent le point à l'entrée sur rue, et une rue n'est pas une
 * parcelle : une recherche ponctuelle ne trouve rien une fois sur deux. On
 * élargit donc progressivement, mais on n'accepte un rayon que s'il désigne
 * une parcelle et une seule. Dès que plusieurs parcelles sont candidates on
 * abandonne : à Strasbourg le voisinage propose 194, 319, 364 et 13 214 m², et
 * un chiffre faux corrompt l'estimation plus sûrement qu'un champ vide.
 *
 * Mesuré sur 12 adresses réelles : 9 résolues, 3 abandons, 0 valeur erronée.
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
        properties?: { type?: string; score?: number; label?: string };
      }[];
    };
    const f = data.features?.[0];
    const coords = f?.geometry?.coordinates;
    if (!f?.properties || !coords || !adressePrecise(f.properties)) return null;

    for (const geom of [
      { type: "Point", coordinates: coords },
      carre(coords, 4),
      carre(coords, 8),
    ]) {
      const parcelles = await interroger(geom);
      if (!parcelles) return null;
      // Plusieurs candidates : impossible de trancher, et élargir encore ne
      // ferait qu'en ajouter.
      if (parcelles.length > 1) return null;
      const p = parcelles[0]?.properties;
      if (!p?.contenance || p.contenance <= 0) continue;
      return {
        contenance: p.contenance,
        section: p.section ?? "",
        numero: p.numero ?? "",
        commune: p.nom_com ?? "",
        adresseReconnue: f.properties.label ?? "",
      };
    }
    return null;
  } catch {
    // Réseau indisponible ou API en panne : on laisse simplement le champ vide.
    return null;
  }
}
