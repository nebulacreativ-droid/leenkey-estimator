export type BienType =
  | "maison"
  | "appartement"
  | "terrain"
  | "local_commercial"
  | "immeuble"
  | "atypique";

export type EtatGeneral = "excellent" | "bon" | "moyen" | "a_renover";

export type DpeLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "inconnu";

export interface LeenkeyForm {
  // 1
  type: BienType | null;

  // 2
  adresse: string;
  code_postal: string;
  ville: string;
  departement: string;

  // 3
  surface_habitable: number | null;
  surface_terrain: number | null;
  surface_annexes: number | null;
  surface_carrez: number | null;
  shob: number | null;

  // 4
  pieces: number | null;
  chambres: number | null;
  salles_bain: number | null;
  wc_separes: number | null;
  cuisine: string | null;
  etage: number | null;
  dernier_etage: boolean;
  nb_etages_batiment: number | null;
  niveaux: number | null;

  // ---- Parcours TERRAIN ----
  terrain_type: string | null; // à bâtir, agricole, loisirs, forestier, non constructible, commercial/industriel
  constructible: string | null; // Oui / Non / Je ne sais pas
  zonage_plu: string | null;
  emprise_sol: number | null; // %
  hauteur_autorisee: number | null; // m
  niveaux_autorises: number | null;
  facade: number | null; // m
  profondeur: number | null; // m
  viabilisation: string[]; // eau, electricite, gaz, assainissement, fibre
  topographie: string | null;
  orientation: string | null;
  vue: string[];
  distances: {
    ecoles: string | null;
    commerces: string | null;
    gare: string | null;
    bus: string | null;
    centre_ville: string | null;
  };
  situation_terrain: string | null; // lotissement, centre-ville, hameau, zone isolée
  contraintes_terrain: string[];
  potentiel_foncier: string[];

  // ---- Parcours LOCAL COMMERCIAL ----
  local_type: string | null; // boutique, bureau, restaurant…
  surface_totale: number | null;
  surface_vente: number | null;
  surface_reserve: number | null;
  local_config: string[]; // angle, traversant, plain_pied, plusieurs_niveaux
  local_equipements: string[]; // pmr, clim, extraction, rideau, vitrine_securisee
  longueur_vitrine: number | null; // m
  hauteur_plafond: number | null; // m
  nb_acces: number | null;
  environnement: string | null; // rue très commerçante, passante, secondaire…
  visibilite: string | null;
  flux_pieton: string | null;
  flux_auto: string | null;
  stationnement: string[];
  transports: string[];
  acces_livraison: string | null;
  local_occupation: string | null; // Libre / Occupé
  loyer_annuel: number | null; // € HT/HC
  charges_annuelles: number | null;
  taxe_fonciere: number | null;
  bail_duree_restante: string | null;
  bail_commercial_type: string | null;
  activite_actuelle: string | null;
  etat_electricite: string | null;
  etat_vitrine: string | null;
  local_commodites: string[]; // sanitaires, cuisine, fibre
  local_potentiel: string[];
  potentiel_transformation: string[];

  // 5
  exterieur: string[];

  // 6
  etat: EtatGeneral | null;

  // 7
  prestations: string[];

  // 8
  dpe: DpeLetter | null;
  ges: DpeLetter | null;
  chauffage: string | null;
  chauffage_mode: string | null; // individuel | collectif
  eau_chaude: string | null;
  annee_construction: string | null;
  derniere_renovation: string | null;

  // 9
  proprietaire: string | null;
  occupation: string | null;
  bail_expiration: string;
  bail_type: string | null;
  contraintes: string[];
  charges_copro: number | null;
  procedure_copro: string | null;

  // 10
  raison_vente: string | null;
  delai: string | null;
  estimation_prealable: string | null;
  prix_estime_prealable: number | null;
  satisfait_estimation: string | null;
  prix_souhaite_connu: string | null;
  prix_souhaite: number | null;
  acheteur_identifie: string | null;
  projet_achat_simultane: string | null;
  bien_achat_trouve: string | null;

  // 11
  photos: { name: string; size: number }[];
  documents: { name: string; size: number }[];

  // 12
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  source: string | null;
  disponibilites: string[];
  rgpd: boolean;
  newsletter: boolean;
  contact_conseiller: boolean;
}

export const initialForm: LeenkeyForm = {
  type: null,
  adresse: "",
  code_postal: "",
  ville: "",
  departement: "",
  surface_habitable: null,
  surface_terrain: null,
  surface_annexes: null,
  surface_carrez: null,
  shob: null,
  pieces: null,
  chambres: null,
  salles_bain: null,
  wc_separes: null,
  cuisine: null,
  etage: null,
  dernier_etage: false,
  nb_etages_batiment: null,
  niveaux: null,
  terrain_type: null,
  constructible: null,
  zonage_plu: null,
  emprise_sol: null,
  hauteur_autorisee: null,
  niveaux_autorises: null,
  facade: null,
  profondeur: null,
  viabilisation: [],
  topographie: null,
  orientation: null,
  vue: [],
  distances: {
    ecoles: null,
    commerces: null,
    gare: null,
    bus: null,
    centre_ville: null,
  },
  situation_terrain: null,
  contraintes_terrain: [],
  potentiel_foncier: [],
  local_type: null,
  surface_totale: null,
  surface_vente: null,
  surface_reserve: null,
  local_config: [],
  local_equipements: [],
  longueur_vitrine: null,
  hauteur_plafond: null,
  nb_acces: null,
  environnement: null,
  visibilite: null,
  flux_pieton: null,
  flux_auto: null,
  stationnement: [],
  transports: [],
  acces_livraison: null,
  local_occupation: null,
  loyer_annuel: null,
  charges_annuelles: null,
  taxe_fonciere: null,
  bail_duree_restante: null,
  bail_commercial_type: null,
  activite_actuelle: null,
  etat_electricite: null,
  etat_vitrine: null,
  local_commodites: [],
  local_potentiel: [],
  potentiel_transformation: [],
  exterieur: [],
  etat: null,
  prestations: [],
  dpe: null,
  ges: null,
  chauffage: null,
  chauffage_mode: null,
  eau_chaude: null,
  annee_construction: null,
  derniere_renovation: null,
  proprietaire: null,
  occupation: null,
  bail_expiration: "",
  bail_type: null,
  contraintes: [],
  charges_copro: null,
  procedure_copro: null,
  raison_vente: null,
  delai: null,
  estimation_prealable: null,
  prix_estime_prealable: null,
  satisfait_estimation: null,
  prix_souhaite_connu: null,
  prix_souhaite: null,
  acheteur_identifie: null,
  projet_achat_simultane: null,
  bien_achat_trouve: null,
  photos: [],
  documents: [],
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  source: null,
  disponibilites: [],
  rgpd: false,
  newsletter: false,
  contact_conseiller: false,
};
