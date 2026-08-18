import type { LeenkeyForm, Lot } from "./types";

/**
 * Calculs partagés du parcours immeuble.
 *
 * Isolés du fichier de composants pour que le moteur d'estimation puisse les
 * réutiliser sans dépendre de React.
 */

/** Typologies de lots, dans l'ordre d'affichage. */
export const TYPOLOGIES = [
  "Studio",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5+",
  "Local commercial",
  "Garage",
  "Parking",
  "Cave",
  "Box",
  "Grenier",
] as const;

/** Les annexes ne se louent pas comme un logement : pas de DPE ni de bail détaillé. */
export const ANNEXES = new Set(["Garage", "Parking", "Cave", "Box", "Grenier"]);

export const POSTES_TECHNIQUES = [
  "Toiture",
  "Façade",
  "Parties communes",
  "Électricité",
  "Plomberie",
  "Chauffage",
  "Colonnes (eau, gaz, évacuation)",
  "Isolation",
  "Fenêtres",
];

export const CHARGES_POSTES: { key: keyof LeenkeyForm; label: string; hint: string }[] = [
  { key: "charge_taxe_fonciere", label: "Taxe foncière", hint: "€ / an" },
  { key: "charge_assurance", label: "Assurance propriétaire non occupant", hint: "€ / an" },
  { key: "charge_entretien", label: "Entretien courant", hint: "€ / an" },
  { key: "charge_electricite_communs", label: "Électricité des communs", hint: "€ / an" },
  { key: "charge_eau", label: "Eau", hint: "€ / an" },
  { key: "charge_syndic", label: "Syndic / gestion", hint: "€ / an" },
  { key: "charge_maintenance", label: "Maintenance (ascenseur, chaudière…)", hint: "€ / an" },
  { key: "charge_autres", label: "Autres charges", hint: "€ / an" },
];

/**
 * Aligne la liste des lots sur le nombre saisi pour une typologie.
 * Les lots déjà renseignés sont conservés : on n'ajoute ou ne retire qu'à la fin.
 */
export function syncLots(lots: Lot[], typologie: string, count: number): Lot[] {
  const autres = lots.filter((l) => l.typologie !== typologie);
  const actuels = lots.filter((l) => l.typologie === typologie);
  let resultat: Lot[];
  if (count > actuels.length) {
    const ajouts: Lot[] = Array.from({ length: count - actuels.length }, (_, i) => ({
      id: `${typologie}-${actuels.length + i}`,
      typologie,
      surface: null,
      loyer_hc: null,
      charges: null,
      bail_debut: "",
      bail_duree_restante: null,
      dpe: null,
      statut: "libre" as const,
    }));
    resultat = [...actuels, ...ajouts];
  } else {
    resultat = actuels.slice(0, count);
  }
  // Tri sur l'ordre des typologies, pour un affichage cohérent.
  return [...autres, ...resultat].sort(
    (a, b) =>
      TYPOLOGIES.indexOf(a.typologie as (typeof TYPOLOGIES)[number]) -
      TYPOLOGIES.indexOf(b.typologie as (typeof TYPOLOGIES)[number]),
  );
}

/** Agrégats locatifs de l'immeuble. */
export function statsLocatives(lots: Lot[]) {
  const occupes = lots.filter((l) => l.statut === "occupe");
  const loyerMensuel = occupes.reduce((s, l) => s + (l.loyer_hc ?? 0), 0);
  const chargesMensuelles = occupes.reduce((s, l) => s + (l.charges ?? 0), 0);
  const surfaceLouee = occupes.reduce((s, l) => s + (l.surface ?? 0), 0);
  // Loyer de marché des lots vides, estimé au loyer au m² des lots occupés :
  // c'est le potentiel qu'un acquéreur valorisera.
  const loyerM2 = surfaceLouee ? loyerMensuel / surfaceLouee : 0;
  const vides = lots.filter((l) => l.statut === "libre");

  // Loyer attendu des lots vides. Le propriétaire peut le déclarer lot par lot —
  // son chiffre prime, il connaît son marché. À défaut on l'extrapole au loyer
  // au m² des lots occupés, ce qui suppose qu'il y en ait.
  const loyerVideDeclare = vides.reduce((s, l) => s + (l.loyer_hc ?? 0), 0);
  const loyerVideEstime = vides.reduce((s, l) => s + (l.loyer_hc ?? (l.surface ?? 0) * loyerM2), 0);

  // Quand rien n'est encore loué mais que des loyers attendus sont saisis sur
  // les lots libres, « Loyer moyen » et « Loyer au m² » affichaient 0 € / — :
  // le vendeur croyait ses saisies ignorées. On bascule alors ces deux tuiles
  // sur les loyers attendus, et surLoyersAttendus permet de l'étiqueter.
  // Affichage seulement : revenusAnnuels reste le revenu réellement perçu.
  const videsChiffres = vides.filter((l) => (l.loyer_hc ?? 0) > 0);
  const surLoyersAttendus = occupes.length === 0 && videsChiffres.length > 0;
  const baseLots = surLoyersAttendus ? videsChiffres : occupes;
  const baseMensuel = surLoyersAttendus ? loyerVideDeclare : loyerMensuel;
  const baseSurface = baseLots.reduce((s, l) => s + (l.surface ?? 0), 0);
  const loyerM2Affiche = baseSurface ? baseMensuel / baseSurface : 0;

  return {
    nbLots: lots.length,
    nbOccupes: occupes.length,
    revenusAnnuels: loyerMensuel * 12,
    chargesRecuperees: chargesMensuelles * 12,
    tauxOccupation: lots.length ? Math.round((occupes.length / lots.length) * 100) : 0,
    loyerMoyen: baseLots.length ? Math.round(baseMensuel / baseLots.length) : 0,
    loyerM2: Math.round(loyerM2Affiche * 10) / 10,
    /** true : loyerMoyen et loyerM2 reposent sur les loyers attendus des lots libres. */
    surLoyersAttendus,
    /** Revenu annuel supplémentaire si les lots vides étaient loués. */
    potentielVacance: Math.round(loyerVideEstime * 12),
    /** Part de ce potentiel que le propriétaire a chiffrée lui-même. */
    potentielDeclare: Math.round(loyerVideDeclare * 12),
    /** Loyers annuels de l'immeuble une fois plein. */
    revenusPotentiels: Math.round((loyerMensuel + loyerVideEstime) * 12),
  };
}

/** Total des charges annuelles à la charge du propriétaire. */
export function totalCharges(form: LeenkeyForm): number {
  return CHARGES_POSTES.reduce((s, c) => s + ((form[c.key] as number | null) ?? 0), 0);
}
