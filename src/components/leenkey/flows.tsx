import type { ReactNode } from "react";
import {
  Step1,
  Step10,
  Step11,
  Step12,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
  Step8,
  Step9,
  type P,
  type StepErrors,
} from "./steps";
import {
  TerrainStep1,
  TerrainStep2,
  TerrainStep3,
  TerrainStep4,
  TerrainStep5,
  TerrainStep6,
  TerrainStep7,
} from "./steps-terrain";
import type { BienType, LeenkeyForm } from "./types";

/**
 * Un parcours = la liste ordonnée des étapes pour un type de bien donné.
 *
 * Chaque type n'a ni le même nombre d'étapes ni les mêmes questions : un
 * terrain n'a pas de DPE ni de pièces, mais a de l'urbanisme et de la
 * viabilisation. Le libellé, le rendu et la validation d'une étape vivent donc
 * ensemble ici, plutôt que dispersés entre une constante de libellés, un switch
 * de rendu et un switch de validation qu'il fallait garder synchronisés.
 */
export interface FlowStep {
  label: string;
  render: (p: P) => ReactNode;
  /** Erreurs bloquant le passage à l'étape suivante. */
  validate?: (f: LeenkeyForm) => StepErrors;
}

/* ---------- Étapes communes à tous les types ---------- */

const CHOIX_TYPE: FlowStep = {
  label: "Votre bien",
  render: (p) => <Step1 {...p} />,
  validate: (f) => (f.type ? {} : { type: "Sélectionnez un type de bien" }),
};

const LOCALISATION: FlowStep = {
  label: "Localisation",
  render: (p) => <Step2 {...p} />,
  validate: (f) => (f.adresse ? {} : { adresse: "L'adresse est requise" }),
};

const PROJET: FlowStep = {
  label: "Votre projet",
  render: (p) => <Step10 {...p} />,
  validate: (f) => (f.delai ? {} : { delai: "Requis" }),
};

const DOCUMENTS: FlowStep = {
  label: "Vos documents",
  render: (p) => <Step11 {...p} />,
};

const COORDONNEES: FlowStep = {
  label: "Vos coordonnées",
  render: (p) => <Step12 {...p} errors={p.errors ?? {}} />,
  validate: (f) => {
    const e: StepErrors = {};
    if (!f.prenom) e.prenom = "Prénom requis";
    if (!f.nom) e.nom = "Nom requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Email invalide";
    if (!/^(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(f.telephone.replace(/\s/g, "")))
      e.telephone = "Numéro français invalide";
    if (!f.rgpd) e.rgpd = "Vous devez accepter pour continuer";
    return e;
  },
};

/* ---------- Parcours généraliste : maison, appartement, et types pas encore refondus ---------- */

const PARCOURS_STANDARD: FlowStep[] = [
  CHOIX_TYPE,
  LOCALISATION,
  {
    label: "Superficie",
    render: (p) => <Step3 {...p} />,
    validate: (f) => {
      const e: StepErrors = {};
      // Appartement : la loi Carrez est la surface de référence, l'habitable est optionnelle.
      if (f.type === "appartement") {
        if (!f.surface_carrez) e.surface_carrez = "Surface loi Carrez requise";
      } else if (!f.surface_habitable) {
        e.surface_habitable = "Surface requise";
      }
      if (f.type === "maison" && f.surface_terrain === null)
        e.surface_terrain = "Surface terrain requise (0 si aucun)";
      return e;
    },
  },
  {
    label: "Composition",
    render: (p) => <Step4 {...p} />,
    validate: (f) => {
      const e: StepErrors = {};
      if (!f.pieces) e.pieces = "Requis";
      if (f.chambres === null) e.chambres = "Requis";
      if (f.salles_bain === null) e.salles_bain = "Requis";
      if (!f.cuisine) e.cuisine = "Requis";
      if (f.type === "appartement" && f.etage === null) e.etage = "Requis";
      if (f.type === "maison" && !f.niveaux) e.niveaux = "Requis";
      return e;
    },
  },
  { label: "Extérieur", render: (p) => <Step5 {...p} /> },
  {
    label: "État général",
    render: (p) => <Step6 {...p} />,
    validate: (f) => (f.etat ? {} : { etat: "Sélectionnez un état" }),
  },
  { label: "Prestations", render: (p) => <Step7 {...p} /> },
  { label: "Énergie", render: (p) => <Step8 {...p} /> },
  {
    label: "Situation",
    render: (p) => <Step9 {...p} />,
    validate: (f) => {
      const e: StepErrors = {};
      if (!f.proprietaire) e.proprietaire = "Requis";
      if (!f.occupation) e.occupation = "Requis";
      return e;
    },
  },
  PROJET,
  DOCUMENTS,
  COORDONNEES,
];

/* ---------- Parcours terrain ---------- */

const PARCOURS_TERRAIN: FlowStep[] = [
  CHOIX_TYPE,
  LOCALISATION,
  {
    label: "Le terrain",
    render: (p) => <TerrainStep1 {...p} />,
    validate: (f) => {
      const e: StepErrors = {};
      if (!f.surface_terrain) e.surface_terrain = "Surface du terrain requise";
      if (!f.terrain_type) e.terrain_type = "Sélectionnez un type de terrain";
      return e;
    },
  },
  {
    label: "Urbanisme",
    render: (p) => <TerrainStep2 {...p} />,
    validate: (f) =>
      f.constructible ? {} : { constructible: "Indiquez si le terrain est constructible" },
  },
  { label: "Viabilisation", render: (p) => <TerrainStep3 {...p} /> },
  { label: "Caractéristiques", render: (p) => <TerrainStep4 {...p} /> },
  { label: "Environnement", render: (p) => <TerrainStep5 {...p} /> },
  { label: "Contraintes", render: (p) => <TerrainStep6 {...p} /> },
  { label: "Potentiel foncier", render: (p) => <TerrainStep7 {...p} /> },
  PROJET,
  DOCUMENTS,
  COORDONNEES,
];

const PARCOURS: Partial<Record<BienType, FlowStep[]>> = {
  terrain: PARCOURS_TERRAIN,
};

/** Parcours applicable au type sélectionné (généraliste par défaut). */
export function getFlow(type: BienType | null): FlowStep[] {
  return (type && PARCOURS[type]) || PARCOURS_STANDARD;
}
