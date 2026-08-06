import {
  Field,
  OptionCard,
  PillGroup,
  PillMulti,
  SectionTitle,
  StepHeader,
  Stepper,
  TextInput,
  ToggleCard,
} from "./ui";
import { DpeRow, type P } from "./steps";
import { CHAUFFAGE_OPTS } from "./energie";
import type { LeenkeyForm } from "./types";
import { POSTES_ATYPIQUE } from "./estimation";

/* ------------------------------------------------------------------ */
/* Parcours dédié au type "atypique".                                  */
/* Un château, un loft ou un corps de ferme n'ont presque aucun         */
/* comparable : ce sont les caractères exceptionnels, l'état réel et le */
/* potentiel d'exploitation qui font le prix.                          */
/* ------------------------------------------------------------------ */

function toggleIn(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ============ ÉTAPE 1 — Identification ============ */

const ATYPIQUE_TYPES: { value: string; icon: string; label: string; desc: string }[] = [
  { value: "chateau", icon: "🏰", label: "Château", desc: "Demeure historique, parc, dépendances" },
  { value: "manoir", icon: "🏛", label: "Manoir / Demeure de caractère", desc: "Maison de maître" },
  {
    value: "ferme",
    icon: "🚜",
    label: "Corps de ferme",
    desc: "Bâtiments agricoles réhabilités ou à réhabiliter",
  },
  { value: "longere", icon: "🏡", label: "Longère", desc: "Bâtisse traditionnelle en longueur" },
  { value: "moulin", icon: "🌊", label: "Moulin", desc: "Avec cours d'eau ou bief" },
  { value: "loft", icon: "🧱", label: "Loft", desc: "Ancien local industriel converti" },
  {
    value: "architecte",
    icon: "📐",
    label: "Maison d'architecte",
    desc: "Création contemporaine signée",
  },
  {
    value: "gite",
    icon: "🛏",
    label: "Gîte / Chambres d'hôtes",
    desc: "Bien déjà exploité en hébergement",
  },
  { value: "grange", icon: "🏚", label: "Grange à réhabiliter", desc: "Volume brut, tout à faire" },
  {
    value: "religieux",
    icon: "⛪",
    label: "Bâtiment religieux converti",
    desc: "Chapelle, presbytère, couvent",
  },
  { value: "autre", icon: "✨", label: "Autre bien atypique", desc: "Péniche, troglodyte, phare…" },
];

const CLASSEMENTS: { v: string; i: string; l: string; d: string }[] = [
  {
    v: "monument_historique",
    i: "🏛",
    l: "Monument Historique",
    d: "Classé ou inscrit — avantages fiscaux, mais travaux encadrés",
  },
  { v: "site_protege", i: "🌿", l: "Site protégé", d: "Site classé ou inscrit" },
  {
    v: "secteur_sauvegarde",
    i: "🗺",
    l: "Secteur sauvegardé",
    d: "Périmètre patrimonial remarquable",
  },
  {
    v: "label_fondation",
    i: "🎖",
    l: "Label Fondation du patrimoine",
    d: "Ouvre droit à des déductions",
  },
];

const ANNEES = ["Avant 1500", "1500-1700", "1700-1850", "1850-1945", "1945-1990", "Après 1990"];

export function AtypiqueStep1({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Le bien"
        title="De quel bien s'agit-il ?"
        subtitle="Les biens atypiques n'ont presque pas de comparables : plus votre description est précise, plus l'estimation le sera."
      />
      <div className="space-y-6">
        <Field label="Type de bien" required error={errors?.atypique_type}>
          <div className="grid gap-3 sm:grid-cols-2">
            {ATYPIQUE_TYPES.map((o) => (
              <OptionCard
                key={o.value}
                selected={form.atypique_type === o.value}
                onClick={() => set({ atypique_type: o.value })}
                icon={o.icon}
                title={o.label}
                description={o.desc}
              />
            ))}
          </div>
        </Field>

        <Field label="Époque de construction">
          <PillGroup
            value={form.annee_construction}
            onChange={(v) => set({ annee_construction: v })}
            options={ANNEES}
          />
        </Field>

        <SectionTitle>Surfaces et bâtiments</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Surface habitable" hint="m²" required error={errors?.surface_habitable}>
            <TextInput
              type="number"
              min={1}
              value={form.surface_habitable ?? ""}
              onChange={(e) =>
                set({ surface_habitable: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="450"
            />
          </Field>
          <Field label="Surface des dépendances" hint="m² — granges, écuries, ateliers">
            <TextInput
              type="number"
              min={0}
              value={form.surface_dependances ?? ""}
              onChange={(e) =>
                set({ surface_dependances: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="300"
            />
          </Field>
          <Field label="Surface du terrain" hint="m²">
            <TextInput
              type="number"
              min={0}
              value={form.surface_terrain ?? ""}
              onChange={(e) =>
                set({ surface_terrain: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="25000"
            />
          </Field>
          <Field label="Nombre de bâtiments">
            <Stepper
              value={form.nb_batiments}
              onChange={(v) => set({ nb_batiments: v })}
              options={[1, 2, 3, 4, 5, "6+"]}
            />
          </Field>
        </div>

        <SectionTitle>Classement</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {CLASSEMENTS.map((o) => (
            <ToggleCard
              key={o.v}
              selected={form.classement.includes(o.v)}
              onClick={() => set({ classement: toggleIn(form.classement, o.v) })}
              icon={o.i}
              title={o.l}
              desc={o.d}
            />
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
          <input
            type="checkbox"
            checked={form.classement.length === 0}
            onChange={() => set({ classement: [] })}
            className="h-4 w-4 accent-primary"
          />
          Aucun classement
        </label>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 2 — Caractères exceptionnels ============ */

const CARACTERES: { section: string; items: { v: string; l: string }[] }[] = [
  {
    section: "🏛 Architecture & matériaux",
    items: [
      { v: "architecture_remarquable", l: "Architecture remarquable ou signée" },
      { v: "pierre_taille", l: "Pierre de taille" },
      { v: "colombages", l: "Colombages / pans de bois" },
      { v: "charpente_ancienne", l: "Charpente ancienne apparente" },
      { v: "parquets_anciens", l: "Parquets et boiseries d'origine" },
      { v: "cheminees_monumentales", l: "Cheminées monumentales" },
      { v: "escalier_honneur", l: "Escalier d'honneur" },
      { v: "tomettes", l: "Tomettes, terres cuites anciennes" },
    ],
  },
  {
    section: "📐 Volumes",
    items: [
      { v: "hauteur_plafond", l: "Hauteur sous plafond exceptionnelle (> 3,5 m)" },
      { v: "grands_volumes", l: "Très grands volumes ouverts" },
      { v: "verriere", l: "Verrière / grandes ouvertures" },
      { v: "cave_voutee", l: "Cave voûtée" },
    ],
  },
  {
    section: "🌳 Extérieurs & terres",
    items: [
      { v: "parc", l: "Parc arboré" },
      { v: "jardin_remarquable", l: "Jardin dessiné ou remarquable" },
      { v: "piscine", l: "Piscine" },
      { v: "etang", l: "Étang ou plan d'eau" },
      { v: "riviere", l: "Rivière / cours d'eau" },
      { v: "foret", l: "Bois ou forêt" },
      { v: "terres_agricoles", l: "Terres agricoles" },
      { v: "vue_exceptionnelle", l: "Vue exceptionnelle" },
    ],
  },
  {
    section: "🏚 Dépendances",
    items: [
      { v: "ecuries", l: "Écuries / boxes" },
      { v: "chapelle", l: "Chapelle" },
      { v: "orangerie", l: "Orangerie / serre" },
      { v: "pigeonnier", l: "Pigeonnier / tour" },
      { v: "atelier", l: "Atelier" },
      { v: "logement_gardien", l: "Logement de gardien" },
    ],
  },
  {
    section: "✨ Prestations",
    items: [
      { v: "ascenseur", l: "Ascenseur" },
      { v: "domotique_hdg", l: "Domotique haut de gamme" },
      { v: "spa", l: "Spa / hammam / salle de sport" },
      { v: "cave_vin", l: "Cave à vin aménagée" },
      { v: "heliport", l: "Héliport / grand parking" },
    ],
  },
];

export function AtypiqueStep2({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Caractères exceptionnels"
        title="Qu'est-ce qui rend ce bien unique ?"
        subtitle="C'est précisément ce qui échappe au prix au mètre carré — et ce qui fait la différence à la vente."
      />
      <div className="space-y-2">
        {CARACTERES.map((s) => (
          <div key={s.section}>
            <SectionTitle>{s.section}</SectionTitle>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {s.items.map((it) => (
                <ToggleCard
                  key={it.v}
                  selected={form.caracteres_exceptionnels.includes(it.v)}
                  onClick={() =>
                    set({
                      caracteres_exceptionnels: toggleIn(form.caracteres_exceptionnels, it.v),
                    })
                  }
                  title={it.l}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ ÉTAPE 3 — État général ============ */

const ETATS_POSTE = ["Bon", "Moyen", "À refaire"];

export function AtypiqueStep3({ form, set }: P) {
  const majPoste = (poste: string, valeur: string) =>
    set({ etat_technique: { ...form.etat_technique, [poste]: valeur } });

  return (
    <div className="space-y-8">
      <StepHeader
        label="État général"
        title="Dans quel état se trouve le bien ?"
        subtitle="Sur ce type de bien, l'état pèse plus lourd que partout ailleurs : une toiture de château se chiffre en centaines de milliers d'euros."
      />
      <div className="space-y-5">
        {POSTES_ATYPIQUE.map((poste) => (
          <Field key={poste} label={poste}>
            <PillGroup
              value={form.etat_technique[poste] ?? null}
              onChange={(v) => majPoste(poste, v)}
              options={ETATS_POSTE}
            />
          </Field>
        ))}
      </div>

      <SectionTitle>Diagnostic de performance énergétique</SectionTitle>
      <p className="text-sm text-sub">
        Obligatoire à la vente. Sur ce type de bien, il est souvent défavorable — les acquéreurs le
        savent et l'intègrent : mieux vaut l'afficher que le laisser deviner.
      </p>
      <Field label="Étiquette énergie (DPE)">
        <DpeRow value={form.dpe} onChange={(v) => set({ dpe: v })} />
      </Field>
      <Field label="Étiquette GES">
        <DpeRow value={form.ges} onChange={(v) => set({ ges: v })} />
      </Field>
      <Field label="Type de chauffage principal">
        <PillGroup
          value={form.chauffage}
          onChange={(v) => set({ chauffage: v })}
          options={CHAUFFAGE_OPTS}
        />
      </Field>

      <SectionTitle>Travaux récents</SectionTitle>
      <Field label="Postes repris depuis moins de 10 ans" hint="plusieurs choix possibles">
        <PillMulti
          values={form.travaux_recents}
          onToggle={(v) => set({ travaux_recents: toggleIn(form.travaux_recents, v) })}
          options={POSTES_ATYPIQUE}
        />
      </Field>

      <SectionTitle>Travaux restants</SectionTitle>
      <Field
        label="Budget estimé des travaux à prévoir"
        hint="€ — même approximatif, c'est le premier chiffre que demandera l'acquéreur"
      >
        <TextInput
          type="number"
          min={0}
          value={form.travaux_budget ?? ""}
          onChange={(e) => set({ travaux_budget: e.target.value ? Number(e.target.value) : null })}
          placeholder="150000"
        />
      </Field>
    </div>
  );
}

/* ============ ÉTAPE 4 — Environnement ============ */

const CADRES = [
  "Pleine campagne",
  "Village",
  "Bourg / petite ville",
  "Périphérie de ville",
  "Centre-ville",
  "Bord de mer",
  "Montagne",
];
const NIVEAUX = ["Excellent", "Bon", "Moyen", "Faible"];
const PROXIMITE = ["< 10 min", "10–30 min", "30–60 min", "> 1 h"];
const DISTANCES: { key: keyof LeenkeyForm["distances"]; label: string }[] = [
  { key: "grande_ville", label: "Grande ville" },
  { key: "gare", label: "Gare" },
  { key: "aeroport", label: "Aéroport" },
  { key: "commerces", label: "Commerces" },
  { key: "ecoles", label: "Écoles" },
];

export function AtypiqueStep4({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Environnement"
        title="Dans quel cadre se trouve le bien ?"
        subtitle="Sur un bien d'exception, l'acquéreur vient souvent de loin : l'accessibilité et le cadre pèsent autant que le bien lui-même."
      />
      <div className="space-y-6">
        <Field label="Cadre">
          <PillGroup value={form.cadre} onChange={(v) => set({ cadre: v })} options={CADRES} />
        </Field>
        <Field label="Calme">
          <PillGroup value={form.calme} onChange={(v) => set({ calme: v })} options={NIVEAUX} />
        </Field>
        <Field label="Qualité paysagère">
          <PillGroup
            value={form.qualite_paysagere}
            onChange={(v) => set({ qualite_paysagere: v })}
            options={NIVEAUX}
          />
        </Field>
        <Field
          label="Attractivité touristique du secteur"
          hint="elle conditionne le potentiel d'exploitation en hébergement"
        >
          <PillGroup
            value={form.attractivite_touristique}
            onChange={(v) => set({ attractivite_touristique: v })}
            options={NIVEAUX}
          />
        </Field>

        <SectionTitle>Temps de trajet</SectionTitle>
        {DISTANCES.map((d) => (
          <Field key={d.key} label={d.label}>
            <PillGroup
              value={form.distances[d.key]}
              onChange={(v) => set({ distances: { ...form.distances, [d.key]: v } })}
              options={PROXIMITE}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

/* ============ ÉTAPE 5 — Potentiel ============ */

const POTENTIEL: { v: string; i: string; l: string; d: string }[] = [
  { v: "gites", i: "🛏", l: "Création de gîtes", d: "Les dépendances deviennent des hébergements" },
  {
    v: "chambres_hotes",
    i: "🍳",
    l: "Chambres d'hôtes",
    d: "Exploitation en direct par le propriétaire",
  },
  {
    v: "evenementiel",
    i: "🎉",
    l: "Événementiel",
    d: "Mariages, séminaires — très rentable si le cadre s'y prête",
  },
  { v: "equestre", i: "🐎", l: "Activité équestre", d: "Écuries, carrière, prairies" },
  {
    v: "division",
    i: "✂️",
    l: "Division possible",
    d: "Plusieurs logements dans le bâti existant",
  },
  {
    v: "rehabilitation",
    i: "🔨",
    l: "Réhabilitation de dépendances",
    d: "Surface habitable à gagner",
  },
  {
    v: "changement_destination",
    i: "🔄",
    l: "Changement de destination",
    d: "Autorisé par le PLU",
  },
  {
    v: "locatif_saisonnier",
    i: "📅",
    l: "Location saisonnière",
    d: "Rendement fort en secteur touristique",
  },
  {
    v: "exploitation_agricole",
    i: "🌾",
    l: "Exploitation agricole ou viticole",
    d: "Terres exploitables",
  },
];

export function AtypiqueStep5({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Potentiel"
        title="Que peut-on faire de ce bien ?"
        subtitle="Un bien d'exception qui peut générer des revenus s'adresse à une clientèle bien plus large qu'une simple résidence."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {POTENTIEL.map((o) => (
          <ToggleCard
            key={o.v}
            selected={form.potentiel_atypique.includes(o.v)}
            onClick={() => set({ potentiel_atypique: toggleIn(form.potentiel_atypique, o.v) })}
            icon={o.i}
            title={o.l}
            desc={o.d}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.potentiel_atypique.length === 0}
          onChange={() => set({ potentiel_atypique: [] })}
          className="h-4 w-4 accent-primary"
        />
        Usage strictement résidentiel
      </label>
    </div>
  );
}

/* ============ ÉTAPE 6 — Contraintes ============ */

const CONTRAINTES: { v: string; i: string; l: string; d: string }[] = [
  {
    v: "abf",
    i: "🏛",
    l: "Avis des Architectes des Bâtiments de France",
    d: "Tous les travaux extérieurs sont soumis à validation",
  },
  {
    v: "obligation_ouverture",
    i: "🎟",
    l: "Obligation d'ouverture au public",
    d: "Contrepartie de certains dispositifs fiscaux",
  },
  { v: "servitudes", i: "📜", l: "Servitudes", d: "Droit de passage, réseau, mitoyenneté" },
  {
    v: "droit_passage",
    i: "🚧",
    l: "Droit de passage sur la propriété",
    d: "Traversée par un tiers",
  },
  { v: "natura2000", i: "🦋", l: "Natura 2000", d: "Zone de protection écologique" },
  {
    v: "risques_naturels",
    i: "⚠️",
    l: "Risques naturels",
    d: "Inondation, mouvement de terrain, incendie",
  },
  {
    v: "contraintes_exploitation",
    i: "🚜",
    l: "Contraintes d'exploitation",
    d: "Bail rural, bail à ferme, exploitation en cours",
  },
];

export function AtypiqueStep6({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Contraintes"
        title="Quelles contraintes pèsent sur le bien ?"
        subtitle="Sur un bien d'exception elles sont fréquentes. Les déclarer évite qu'elles ressortent au moment de la signature."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {CONTRAINTES.map((o) => (
          <ToggleCard
            key={o.v}
            selected={form.contraintes_atypique.includes(o.v)}
            onClick={() => set({ contraintes_atypique: toggleIn(form.contraintes_atypique, o.v) })}
            icon={o.i}
            title={o.l}
            desc={o.d}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.contraintes_atypique.length === 0}
          onChange={() => set({ contraintes_atypique: [] })}
          className="h-4 w-4 accent-primary"
        />
        Aucune contrainte connue
      </label>
    </div>
  );
}

/* ============ ÉTAPE 7 — Données financières ============ */

export function AtypiqueStep7({ form, set }: P) {
  const revenus = form.revenus_existants ?? 0;
  const charges =
    (form.charges_atypique ?? 0) + (form.cout_entretien_annuel ?? 0) + (form.taxe_fonciere ?? 0);
  const net = revenus - charges;

  return (
    <div className="space-y-8">
      <StepHeader
        label="Données financières"
        title="Que coûte et que rapporte le bien ?"
        subtitle="Un bien d'exception qui s'autofinance change complètement de catégorie aux yeux d'un acquéreur."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Coût d'entretien annuel" hint="€ / an — hors travaux exceptionnels">
          <TextInput
            type="number"
            min={0}
            value={form.cout_entretien_annuel ?? ""}
            onChange={(e) =>
              set({ cout_entretien_annuel: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="12000"
          />
        </Field>
        <Field label="Taxe foncière" hint="€ / an">
          <TextInput
            type="number"
            min={0}
            value={form.taxe_fonciere ?? ""}
            onChange={(e) => set({ taxe_fonciere: e.target.value ? Number(e.target.value) : null })}
            placeholder="6000"
          />
        </Field>
        <Field
          label="Revenus existants"
          hint="€ / an — gîtes, location saisonnière, événementiel, fermage"
        >
          <TextInput
            type="number"
            min={0}
            value={form.revenus_existants ?? ""}
            onChange={(e) =>
              set({ revenus_existants: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="35000"
          />
        </Field>
        <Field label="Autres charges annuelles" hint="€ / an — assurance, personnel, énergie">
          <TextInput
            type="number"
            min={0}
            value={form.charges_atypique ?? ""}
            onChange={(e) =>
              set({ charges_atypique: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="8000"
          />
        </Field>
      </div>

      {(revenus > 0 || charges > 0) && (
        <div className="rounded-[14px] border-2 border-sky-mid bg-sky/40 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sub">Revenus</div>
              <div className="mt-1 font-display text-xl font-bold text-navy">
                {revenus.toLocaleString("fr-FR")} €
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sub">
                Coût annuel
              </div>
              <div className="mt-1 font-display text-xl font-bold text-navy">
                −{charges.toLocaleString("fr-FR")} €
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                {net >= 0 ? "Excédent" : "Coût net de détention"}
              </div>
              <div
                className={
                  "mt-1 font-display text-xl font-bold " +
                  (net >= 0 ? "text-success" : "text-destructive")
                }
              >
                {net.toLocaleString("fr-FR")} €
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
