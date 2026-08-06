/**
 * Options énergie partagées par les parcours.
 *
 * Le DPE est obligatoire à la vente pour tout bien bâti : logement, local
 * commercial ou bien d'exception. Seul le terrain y échappe. Ces listes vivent
 * hors des composants pour que les cinq parcours s'appuient sur les mêmes.
 */

export const CHAUFFAGE_OPTS = [
  "Gaz naturel",
  "Fioul",
  "Électrique",
  "Bois",
  "Pompe à chaleur",
  "Géothermie",
  "Réseau de chaleur urbain",
  "Autre",
];

export const CHAUFFAGE_MODES = ["Individuel", "Collectif", "Je ne sais pas"];
