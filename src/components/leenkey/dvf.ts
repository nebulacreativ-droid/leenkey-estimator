/**
 * Données renvoyées par /api/dvf-comparables et règle d'exploitation.
 *
 * Séparé des composants pour que le wizard, le dashboard et le PDF partagent la
 * même définition — et surtout la même règle de fiabilité.
 */

export interface DvfComparable {
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
  nbLots?: number;
}

export interface DvfResult {
  available: boolean;
  codePostal: string;
  nbComparables: number;
  stats: {
    prixM2Pondere: number;
    prixM2Median: number;
    prixM2Min: number;
    prixM2Max: number;
    /** Faux quand l'échantillon est trop mince pour piloter l'estimation. */
    fiable?: boolean;
  };
  nettoyage?: {
    lignesBrutes: number;
    lignesRetenues: number;
    mutations: number;
    aberrantesEcartees: number;
  };
  dateLaPlusRecente: string | null;
  comparables: DvfComparable[];
  disclaimer: string;
}

/**
 * Prix au m² issu de DVF, seulement s'il est exploitable.
 *
 * En dessous de 5 mutations, l'échantillon local n'est pas assez robuste : une
 * seule vente pilotait auparavant 70 % du prix de référence.
 */
export function prixM2Dvf(dvf: DvfResult | null | undefined): number | null {
  if (!dvf?.available || dvf.stats.fiable === false) return null;
  return dvf.stats.prixM2Pondere || null;
}
