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
import type { P } from "./steps";
import type { LeenkeyForm } from "./types";

/* ------------------------------------------------------------------ */
/* Parcours dédié au type "terrain".                                   */
/* Le parcours généraliste (maison / appartement) ne s'y applique pas : */
/* pas de pièces, pas de DPE, pas de prestations — mais de l'urbanisme, */
/* de la viabilisation et du potentiel foncier, qui font le prix.       */
/* ------------------------------------------------------------------ */

/** Coche/décoche une valeur dans un champ tableau du formulaire. */
function toggleIn(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ============ ÉTAPE 1 — Le terrain ============ */

const TERRAIN_TYPES: { value: string; icon: string; label: string; desc: string }[] = [
  {
    value: "a_batir",
    icon: "🏗",
    label: "Terrain à bâtir",
    desc: "Constructible, destiné à recevoir une construction",
  },
  {
    value: "agricole",
    icon: "🌾",
    label: "Terrain agricole",
    desc: "Zone A du PLU, exploitation agricole",
  },
  {
    value: "loisirs",
    icon: "⛺",
    label: "Terrain de loisirs",
    desc: "Cabane, mobil-home, usage non permanent",
  },
  {
    value: "forestier",
    icon: "🌲",
    label: "Terrain forestier",
    desc: "Parcelle boisée, exploitation sylvicole",
  },
  {
    value: "non_constructible",
    icon: "🚫",
    label: "Terrain non constructible",
    desc: "Zone N du PLU, aucune construction autorisée",
  },
  {
    value: "commercial",
    icon: "🏭",
    label: "Commercial / industriel",
    desc: "Zone d'activité, entrepôt, artisanat",
  },
];

export function TerrainStep1({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Le terrain"
        title="Parlez-nous de votre terrain"
        subtitle="La surface et la nature du terrain déterminent l'essentiel de sa valeur."
      />
      <div className="space-y-6">
        <Field label="Surface du terrain" hint="m²" required error={errors?.surface_terrain}>
          <TextInput
            type="number"
            min={1}
            value={form.surface_terrain ?? ""}
            onChange={(e) =>
              set({ surface_terrain: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="800"
          />
        </Field>
        <Field label="Type de terrain" required error={errors?.terrain_type}>
          <div className="grid gap-3 sm:grid-cols-2">
            {TERRAIN_TYPES.map((o) => (
              <OptionCard
                key={o.value}
                selected={form.terrain_type === o.value}
                onClick={() => set({ terrain_type: o.value })}
                icon={o.icon}
                title={o.label}
                description={o.desc}
              />
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 2 — Urbanisme ============ */

const CONSTRUCTIBLE = ["Oui", "Non", "Je ne sais pas"];
const ZONAGES = [
  "U — zone urbaine",
  "AU — à urbaniser",
  "A — agricole",
  "N — naturelle",
  "Je ne sais pas",
];

export function TerrainStep2({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Urbanisme"
        title="Que permet le PLU sur votre terrain ?"
        subtitle="C'est le facteur numéro un du prix : un terrain constructible vaut plusieurs fois un terrain qui ne l'est pas."
      />
      <div className="space-y-6">
        <Field label="Le terrain est-il constructible ?" required error={errors?.constructible}>
          <PillGroup
            value={form.constructible}
            onChange={(v) => set({ constructible: v })}
            options={CONSTRUCTIBLE}
          />
        </Field>
        <Field label="Zonage PLU" hint="indiqué sur le certificat d'urbanisme ou en mairie">
          <PillGroup
            value={form.zonage_plu}
            onChange={(v) => set({ zonage_plu: v })}
            options={ZONAGES}
          />
        </Field>

        <SectionTitle>Droits à construire</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Emprise au sol autorisée" hint="% de la surface du terrain">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={form.emprise_sol ?? ""}
              onChange={(e) => set({ emprise_sol: e.target.value ? Number(e.target.value) : null })}
              placeholder="30"
            />
          </Field>
          <Field label="Hauteur autorisée" hint="mètres au faîtage">
            <TextInput
              type="number"
              min={0}
              value={form.hauteur_autorisee ?? ""}
              onChange={(e) =>
                set({ hauteur_autorisee: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="9"
            />
          </Field>
        </div>
        <Field label="Nombre de niveaux autorisés">
          <Stepper
            value={form.niveaux_autorises}
            onChange={(v) => set({ niveaux_autorises: v })}
            options={[1, 2, 3, 4, "5+"]}
          />
        </Field>

        <SectionTitle>Géométrie de la parcelle</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Façade sur rue" hint="mètres — une façade étroite limite le projet">
            <TextInput
              type="number"
              min={0}
              value={form.facade ?? ""}
              onChange={(e) => set({ facade: e.target.value ? Number(e.target.value) : null })}
              placeholder="20"
            />
          </Field>
          <Field label="Profondeur" hint="mètres">
            <TextInput
              type="number"
              min={0}
              value={form.profondeur ?? ""}
              onChange={(e) => set({ profondeur: e.target.value ? Number(e.target.value) : null })}
              placeholder="40"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 3 — Viabilisation ============ */

const RESEAUX: { v: string; i: string; l: string; d: string }[] = [
  { v: "eau", i: "💧", l: "Eau potable", d: "Raccordement au réseau d'eau" },
  { v: "electricite", i: "⚡", l: "Électricité", d: "Raccordement Enedis" },
  { v: "gaz", i: "🔥", l: "Gaz", d: "Raccordement au réseau de gaz de ville" },
  { v: "assainissement", i: "🚰", l: "Tout-à-l'égout", d: "Assainissement collectif" },
  { v: "fibre", i: "🌐", l: "Fibre optique", d: "Fibre disponible à la parcelle" },
];

export function TerrainStep3({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Viabilisation"
        title="Le terrain est-il viabilisé ?"
        subtitle="Sélectionnez les réseaux déjà raccordés. Viabiliser un terrain coûte généralement entre 5 000 et 15 000 € — cela se répercute directement sur le prix."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {RESEAUX.map((o) => (
          <ToggleCard
            key={o.v}
            selected={form.viabilisation.includes(o.v)}
            onClick={() => set({ viabilisation: toggleIn(form.viabilisation, o.v) })}
            icon={o.i}
            title={o.l}
            desc={o.d}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.viabilisation.length === 0}
          onChange={() => set({ viabilisation: [] })}
          className="h-4 w-4 accent-primary"
        />
        Aucun réseau raccordé — terrain non viabilisé
      </label>
    </div>
  );
}

/* ============ ÉTAPE 4 — Caractéristiques ============ */

const TOPOGRAPHIES = ["Plat", "Pente légère", "Forte pente"];
const ORIENTATIONS = [
  "Nord",
  "Nord-Est",
  "Est",
  "Sud-Est",
  "Sud",
  "Sud-Ouest",
  "Ouest",
  "Nord-Ouest",
];
const VUES = ["Dégagée", "Campagne", "Ville", "Forêt", "Mer", "Montagne"];

export function TerrainStep4({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Caractéristiques"
        title="À quoi ressemble le terrain ?"
        subtitle="Une forte pente peut renchérir le terrassement de plusieurs dizaines de milliers d'euros ; une belle vue fait l'inverse."
      />
      <div className="space-y-6">
        <Field label="Topographie">
          <PillGroup
            value={form.topographie}
            onChange={(v) => set({ topographie: v })}
            options={TOPOGRAPHIES}
          />
        </Field>
        <Field label="Orientation principale">
          <PillGroup
            value={form.orientation}
            onChange={(v) => set({ orientation: v })}
            options={ORIENTATIONS}
          />
        </Field>
        <Field label="Vue" hint="plusieurs choix possibles">
          <PillMulti
            values={form.vue}
            onToggle={(v) => set({ vue: toggleIn(form.vue, v) })}
            options={VUES}
          />
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 5 — Environnement ============ */

const PROXIMITE = ["< 5 min", "5–10 min", "10–20 min", "> 20 min"];
const DISTANCES: { key: keyof LeenkeyForm["distances"]; label: string }[] = [
  { key: "ecoles", label: "Écoles" },
  { key: "commerces", label: "Commerces" },
  { key: "gare", label: "Gare" },
  { key: "bus", label: "Arrêt de bus" },
  { key: "centre_ville", label: "Centre-ville" },
];
const SITUATIONS = ["Lotissement", "Centre-ville", "Hameau", "Zone isolée"];

export function TerrainStep5({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Environnement"
        title="Qu'y a-t-il autour du terrain ?"
        subtitle="L'accessibilité pèse lourd sur le nombre d'acheteurs potentiels."
      />
      <div className="space-y-6">
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
        <SectionTitle>Situation</SectionTitle>
        <Field label="Le terrain se situe en">
          <PillGroup
            value={form.situation_terrain}
            onChange={(v) => set({ situation_terrain: v })}
            options={SITUATIONS}
          />
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 6 — Contraintes ============ */

const CONTRAINTES: { v: string; i: string; l: string; d: string }[] = [
  {
    v: "inondation",
    i: "🌊",
    l: "Risque d'inondation",
    d: "Terrain en zone inondable connue",
  },
  {
    v: "argiles",
    i: "🧱",
    l: "Retrait-gonflement des argiles",
    d: "Impose une étude de sol G2 et des fondations renforcées",
  },
  {
    v: "servitudes",
    i: "📜",
    l: "Servitudes",
    d: "Droit de passage, réseau enterré, vue…",
  },
  {
    v: "natura2000",
    i: "🦋",
    l: "Natura 2000",
    d: "Zone de protection écologique européenne",
  },
  {
    v: "monuments",
    i: "🏛",
    l: "Abords de monument historique",
    d: "Avis de l'Architecte des Bâtiments de France requis",
  },
  {
    v: "ppr",
    i: "⚠️",
    l: "Plan de prévention des risques (PPR)",
    d: "Naturel, technologique ou minier",
  },
];

export function TerrainStep6({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Contraintes"
        title="Le terrain est-il soumis à des contraintes ?"
        subtitle="Mieux vaut les déclarer : elles ressortiront de toute façon à la vente, et les anticiper évite une renégociation."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {CONTRAINTES.map((o) => (
          <ToggleCard
            key={o.v}
            selected={form.contraintes_terrain.includes(o.v)}
            onClick={() => set({ contraintes_terrain: toggleIn(form.contraintes_terrain, o.v) })}
            icon={o.i}
            title={o.l}
            desc={o.d}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.contraintes_terrain.length === 0}
          onChange={() => set({ contraintes_terrain: [] })}
          className="h-4 w-4 accent-primary"
        />
        Aucune contrainte connue
      </label>
    </div>
  );
}

/* ============ ÉTAPE 7 — Potentiel foncier ============ */

const POTENTIEL: { v: string; i: string; l: string; d: string }[] = [
  {
    v: "divisible",
    i: "✂️",
    l: "Terrain divisible",
    d: "Deux lots valent souvent plus qu'un seul grand terrain",
  },
  {
    v: "libre_constructeur",
    i: "🔓",
    l: "Libre de constructeur",
    d: "L'acheteur choisit son constructeur — élargit la clientèle",
  },
  { v: "borne", i: "📐", l: "Terrain borné", d: "Bornage réalisé par un géomètre" },
  {
    v: "certificat_urbanisme",
    i: "📄",
    l: "Certificat d'urbanisme",
    d: "CU opérationnel en cours de validité",
  },
  {
    v: "etude_sol",
    i: "🔬",
    l: "Étude de sol réalisée",
    d: "Étude G1/G2 — obligatoire en zone argileuse",
  },
  {
    v: "permis_existant",
    i: "✅",
    l: "Permis de construire accordé",
    d: "Permis purgé de tout recours",
  },
  {
    v: "projet_etudie",
    i: "📐",
    l: "Projet architectural étudié",
    d: "Plans réalisés, prêts à déposer",
  },
];

export function TerrainStep7({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Potentiel foncier"
        title="Qu'avez-vous déjà préparé ?"
        subtitle="Chaque démarche déjà faite est du temps et du risque en moins pour l'acheteur — et se paie."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {POTENTIEL.map((o) => (
          <ToggleCard
            key={o.v}
            selected={form.potentiel_foncier.includes(o.v)}
            onClick={() => set({ potentiel_foncier: toggleIn(form.potentiel_foncier, o.v) })}
            icon={o.i}
            title={o.l}
            desc={o.d}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.potentiel_foncier.length === 0}
          onChange={() => set({ potentiel_foncier: [] })}
          className="h-4 w-4 accent-primary"
        />
        Aucune démarche engagée
      </label>
    </div>
  );
}
