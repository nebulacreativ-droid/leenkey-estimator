/**
 * Récupération de la surface de parcelle auprès du cadastre.
 *
 * Chaîne : l'adresse saisie donne des coordonnées via la Base Adresse
 * Nationale — déjà utilisée par l'étape Localisation — puis l'API Carto de
 * l'IGN renvoie les parcelles alentour, avec leur géométrie et leur contenance.
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
   * « 14 rue des Lilas » devient « 14 rue des Esclops » — donc on l'affiche
   * pour que le vendeur puisse repérer une mauvaise correspondance.
   */
  adresseReconnue: string;
  /**
   * `true` quand la parcelle contient réellement le point de l'adresse.
   * `false` quand elle a été retenue parce qu'elle en était la plus proche :
   * la BAN place souvent le point sur la voie, devant le portail. Le résultat
   * reste probable, pas certain, et l'interface le dit.
   */
  certaine: boolean;
}

type Position = [number, number];
type Anneau = Position[];
type Geometrie = { type: string; coordinates: Anneau[] | Anneau[][] };

interface FeatureParcelle {
  geometry?: Geometrie;
  properties?: { contenance?: number; section?: string; numero?: string; nom_com?: string };
}

/** Une adresse sans numéro de rue tombe sur l'axe de la voie, pas sur une parcelle. */
function adressePrecise(properties: { type?: string; score?: number }): boolean {
  return properties.type === "housenumber" && (properties.score ?? 0) >= 0.4;
}

/** Carré de rayon r mètres autour d'un point. 1° de latitude ≈ 111 km. */
function carre([lon, lat]: Position, r: number) {
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

/** Lancer de rayon : un nombre impair de croisements place le point dedans. */
function dansAnneau([x, y]: Position, anneau: Anneau): boolean {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi, yi] = anneau[i];
    const [xj, yj] = anneau[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Polygones d'une géométrie, qu'elle soit Polygon ou MultiPolygon. */
function polygones(g: Geometrie): Anneau[][] {
  return g.type === "MultiPolygon" ? (g.coordinates as Anneau[][]) : [g.coordinates as Anneau[]];
}

/** Le point est-il dans la parcelle ? Le premier anneau borde, les suivants trouent. */
function contient(p: Position, g: Geometrie): boolean {
  return polygones(g).some(
    (poly) => dansAnneau(p, poly[0]) && !poly.slice(1).some((trou) => dansAnneau(p, trou)),
  );
}

/** Projection locale en mètres, suffisante aux distances d'une parcelle. */
function metres([lon, lat]: Position): Position {
  return [lon * 111000 * Math.cos((lat * Math.PI) / 180), lat * 111000];
}

function distanceSegment(p: Position, a: Position, b: Position): number {
  const [px, py] = metres(p);
  const [ax, ay] = metres(a);
  const [bx, by] = metres(b);
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance du point au bord de la parcelle, en mètres. */
function distanceBord(p: Position, g: Geometrie): number {
  let d = Infinity;
  for (const poly of polygones(g))
    for (const anneau of poly)
      for (let i = 1; i < anneau.length; i++)
        d = Math.min(d, distanceSegment(p, anneau[i - 1], anneau[i]));
  return d;
}

/**
 * Cherche la parcelle correspondant à une adresse.
 *
 * On demande à l'IGN toutes les parcelles dans un rayon de 25 m, puis on
 * tranche sur la géométrie : celle qui contient le point de l'adresse. Quand
 * aucune ne le contient — la BAN place souvent le point sur la chaussée, qui
 * n'est pas cadastrée — on retient la plus proche, à condition qu'elle soit
 * soit au contact (moins d'un mètre), soit nettement plus proche que sa
 * voisine. Deux parcelles à égale distance, c'est un tirage au sort : on
 * préfère ne rien proposer.
 *
 * Mesuré sur 16 adresses réelles : 14 résolues, contre 11 par la recherche
 * ponctuelle qui précédait.
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
        geometry?: { coordinates?: Position };
        properties?: { type?: string; score?: number; label?: string };
      }[];
    };
    const f = data.features?.[0];
    const point = f?.geometry?.coordinates;
    if (!f?.properties || !point || !adressePrecise(f.properties)) return null;

    const carto = await fetch(
      `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify(carre(point, 25)))}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!carto.ok) return null;
    const feats = (
      ((await carto.json()) as { features?: FeatureParcelle[] }).features ?? []
    ).filter((x) => x.geometry && (x.properties?.contenance ?? 0) > 0);
    if (!feats.length) return null;

    // La parcelle qui contient l'adresse. S'il y en a plusieurs — parcelles
    // superposées, découpes en volume — la plus petite est la plus précise.
    const dedans = feats
      .filter((x) => contient(point, x.geometry as Geometrie))
      .sort((a, b) => (a.properties!.contenance ?? 0) - (b.properties!.contenance ?? 0));

    let choix: FeatureParcelle | undefined = dedans[0];
    let certaine = true;

    if (!choix) {
      const tri = feats
        .map((x) => ({ x, d: distanceBord(point, x.geometry as Geometrie) }))
        .sort((a, b) => a.d - b.d);
      const [premier, second] = tri;
      const auContact = premier.d <= 1;
      const detachee = !second || second.d - premier.d >= 3;
      if (premier.d <= 12 && (auContact || detachee)) {
        choix = premier.x;
        certaine = false;
      }
    }
    if (!choix) return null;

    const p = choix.properties!;
    return {
      contenance: p.contenance!,
      section: p.section ?? "",
      numero: p.numero ?? "",
      commune: p.nom_com ?? "",
      adresseReconnue: f.properties.label ?? "",
      certaine,
    };
  } catch {
    // Réseau indisponible ou API en panne : on laisse simplement le champ vide.
    return null;
  }
}
