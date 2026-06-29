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
  exterieur: [],
  etat: null,
  prestations: [],
  dpe: null,
  ges: null,
  chauffage: null,
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

export const STEP_LABELS = [
  "Votre bien",
  "Localisation",
  "Superficie",
  "Composition",
  "Extérieur",
  "État général",
  "Prestations",
  "Énergie",
  "Situation",
  "Votre projet",
  "Vos documents",
  "Vos coordonnées",
];
