import { createContext } from "react";

/**
 * Position de l'étape dans le parcours courant.
 *
 * Le parcours dépend du type de bien (une maison et un terrain n'ont ni le même
 * nombre d'étapes ni le même ordre), donc le numéro affiché vient du wizard et
 * non d'une constante figée dans chaque composant d'étape.
 */
export const StepPositionContext = createContext<{ step: number; total: number } | null>(null);
