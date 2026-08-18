# Leenkey — contexte projet

Plateforme PropTech française de vente immobilière sans agence, développée par Younes (Nebula Creativ) pour son client Cédric Da Cunha (SAS LEENKEY, RCS Évry 107 616 211). Sites : leenkey.fr (principal) et leenkey.com (redirigé).

## Stack

- **Front** : Vite + React 19 + TypeScript + TanStack Router (routes fichiers dans `src/routes/`)
- **Pages marketing** : fichiers HTML statiques dans `public/pages/` (landing, concept, investir, tarifs, faq — issus de Lovable, injectés via `src/components/site/HtmlPage.tsx`)
- **Estimateur** : wizard multi-étapes dans `src/components/leenkey/` — parcours dédiés par type de bien (maison/appartement dans `steps.tsx`, puis `steps-terrain.tsx`, `steps-local.tsx`, `steps-immeuble.tsx`, `steps-atypique.tsx`, orchestrés par `flows.tsx`)
- **Moteur d'estimation** : `src/components/leenkey/estimation.ts` (~3 300 lignes) — le moteur fait foi pour le chiffre, Claude ne rédige que l'analyse
- **API serverless** (`api/`) : `estimate.ts` (Claude + emails), `contact.ts` (formulaires → emails), `send-report.ts`, `dvf-comparables.ts` (fichiers officiels Etalab ; api.cquest.org est morte, ne pas y revenir)
- **Emails** : Resend, expéditeur `noreply@leenkey.fr` (domaine vérifié ; les DNS Resend vivent sur le compte IONOS de Cédric). Destinataire admin : `contact.leenkey@gmail.com`
- **Analytics** : GA4 `G-27N3E3WP2D` + GTM `GTM-MTRM36P4` + Vercel Analytics (`<Analytics/>` dans `src/main.tsx`)

## Déploiement

- **Vercel** : projet `leenkey-estimator-main`, team `nebula-creativ`. Auto-deploy actif : un push sur `main` déploie la prod en ~30 s. En secours seulement : `npx vercel deploy --prod --scope nebula-creativ --yes`
- Vérifier une mise en prod : `curl https://leenkey.fr/...` (cache désactivé sur `/pages/*` via vercel.json)
- Variables d'env Vercel : `ANTHROPIC_API_KEY`, `RESEND_API_KEY`

## Règles éditoriales (décisions client, ne pas régresser)

- Paiement **« à la souscription »** — jamais « au succès » ni « payé au succès »
- Voix **« nous »** — jamais « on » dans les textes Leenkey
- Réponse **« sous 48 h, 7 j/7 »** — jamais « ouvrées »
- Vocabulaire **« valorisation / analyse de valeur »** — éviter « estimation » seul dans le marketing (prudence loi Hoguet ; Leenkey n'est pas une agence)
- Pas de chiffres ou témoignages inventés sur le site (retirés en août 2026)
- Bleu de marque : `#1156FC` (pas le bleu Tailwind `#3B82F6`)

## Pièges connus

- Les `.html` de `public/pages/` embarquent leurs styles inline + `leenkey.css` (versionné `?v=N` — bump en cas de modif CSS pour casser le cache)
- Le JS d'accordéon/compteurs (`leenkey.js`) n'est pas chargé partout : préférer des valeurs statiques et FAQ dépliée là où il est absent
- `HtmlPage.tsx` intercepte les `<form>` des pages HTML et poste vers `/api/contact` avec `source` déduite de l'id du form ; le message de succès `.form-success` doit être un **sibling** du form, pas un enfant
- Dans `generatePDF.ts`, mesurer le texte avec la même taille de police que le rendu
- Le client (Younes) privilégie toujours la solution la plus simple — proposer le minimum d'abord
