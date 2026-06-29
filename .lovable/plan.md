# Dashboard d'estimation Leenkey

À la soumission du formulaire, remplacer l'écran "Demande envoyée" par un **dashboard d'estimation immédiat** affichant la valeur estimée du bien et des indicateurs clés, calculés localement à partir des réponses du formulaire (aucun backend pour l'instant).

## Nouveau composant `EstimationDashboard`

Remplace `Confirmation` dans `Wizard.tsx`. Reçoit `form`, `ref_`, `onRestart`.

### Sections (de haut en bas)

1. **Hero — Prix estimé**
   - Grande valeur centrale : `1 234 000 €` (formatée fr-FR)
   - Fourchette basse / haute : `1 110 000 € — 1 360 000 €` (±10%)
   - Prix au m² : `5 600 €/m²`
   - Badge confiance : "Fiabilité : élevée / moyenne / faible" selon complétude des données
   - Sous-titre : type + ville + surface

2. **KPI cards (grille 4 colonnes, responsive 2/1)**
   - Prix au m² vs moyenne ville (avec delta %)
   - Délai de vente estimé (ex. "45–60 jours") basé sur `delai` + état
   - Score d'attractivité /100 (DPE, état, prestations, extérieur)
   - Tension du marché local (faible/modérée/forte) — mocké par dept

3. **Récapitulatif du bien** (card 2 colonnes)
   - Type, adresse, surface, pièces, chambres, étage, DPE, état
   - Petit pill par prestation/extérieur

4. **Facteurs d'estimation** (barres horizontales)
   - Localisation, Surface, État général, Performance énergétique, Prestations, Extérieur
   - Chaque facteur : impact en % (+/-) sur le prix de base

5. **Recommandations** (3 cards)
   - Tirées de l'état/DPE/prestations : ex. "Améliorer le DPE (D→C) pourrait valoriser de ~3%"

6. **Prochaines étapes** (la liste actuelle déjà présente dans Confirmation, conservée)
   - Référence dossier, email de réception, contact conseiller

7. **CTA bas**
   - "Recevoir le rapport PDF par email"
   - "Être rappelé par un conseiller"
   - "Refaire une estimation" (= `onRestart`)

## Logique d'estimation (locale, simulée)

Fonction `computeEstimation(form)` dans un nouveau fichier `src/components/leenkey/estimation.ts` :

- **Prix au m² de base** : table mockée par département (fallback 4 000 €/m²), avec quelques villes connues (Paris 10 500, Lyon 5 200, Bordeaux 4 800, Marseille 3 600, etc.)
- **Multiplicateurs** :
  - Type : maison ×1.0, appartement ×1.05, terrain ×0.4, atypique ×1.1…
  - État : excellent ×1.08, bon ×1.0, moyen ×0.92, à rénover ×0.82
  - DPE : A/B ×1.05, C/D ×1.0, E ×0.96, F/G ×0.90
  - Étage élevé + dernier étage : +2%
  - Extérieur (jardin, terrasse, piscine) : +1 à +4% chacun
  - Prestations premium (cheminée, parking, cave…) : +0.5 à +1.5%
- **Score attractivité** : pondération des mêmes facteurs sur 100
- **Fiabilité** : nombre de champs renseignés / total → high/medium/low
- **Délai estimé** : selon tension marché + état + écart au prix de marché si `prix_souhaite`

Tout est déterministe et instantané — pas d'API.

## Modifications de fichiers

- **Créer** `src/components/leenkey/estimation.ts` (logique de calcul + types `EstimationResult`)
- **Créer** `src/components/leenkey/Dashboard.tsx` (composant `EstimationDashboard`)
- **Éditer** `src/components/leenkey/Wizard.tsx` :
  - Remplacer le rendu `<Confirmation .../>` par `<EstimationDashboard .../>`
  - Supprimer le composant `Confirmation` local (ou le garder mais non utilisé — on supprime)
  - Changer le label du bouton final : "Voir mon estimation →" au lieu de "Recevoir mon estimation gratuite →"

## Style

- Utiliser les tokens existants (`bg-primary`, `text-navy`, `text-sub`, `bg-sky`, `border-sky-mid`, `text-success`, etc.)
- Cards : `rounded-[16px] border-2 border-border bg-card p-6`
- Hero : grande typo `font-display` 5xl/6xl, légère animation `fade-up` déjà disponible dans `styles.css`
- Barres de facteurs : div avec largeur en % et `bg-primary` / `bg-success` / `bg-destructive` selon signe
- Aucune dépendance graphique externe ajoutée (pas de Recharts) — barres et KPI en pur CSS pour rester léger

## Hors scope (à confirmer ultérieurement)

- Génération PDF réelle, envoi email, persistence de l'estimation côté backend, intégration de vraies données marché (DVF, etc.). Les CTA pointent vers des actions cosmétiques pour l'instant.
