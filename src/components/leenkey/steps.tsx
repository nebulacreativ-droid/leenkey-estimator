import { useEffect, useRef, useState } from "react";
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
import type { BienType, DpeLetter, EtatGeneral, LeenkeyForm } from "./types";
import { cn } from "@/lib/utils";
import { chercherParcelle, type Parcelle } from "./cadastre";
import {
  ANNEES_CONSTRUCTION,
  AUDIT_OPTS,
  BOIS_TYPES,
  CHAUDIERE_GAZ_TYPES,
  CHAUFFAGE_MODES,
  CHAUFFAGE_OPTS,
  DPE_DATES,
  EAU_CHAUDE_MODES,
  EAU_CHAUDE_OPTS,
  EQUIPEMENTS_ENERGIE,
  FENETRES_OPTS,
  ISOLATION_COMBLES,
  ISOLATION_MURS,
  PAC_TYPES,
  RENOVATIONS,
  VENTILATION_OPTS,
} from "./energie";
import { ProfilEnergetiquePanel } from "./ProfilEnergetiquePanel";

type SetForm = (patch: Partial<LeenkeyForm>) => void;
export type StepErrors = Partial<Record<keyof LeenkeyForm, string>>;
export interface P {
  form: LeenkeyForm;
  set: SetForm;
  errors?: StepErrors;
}

/** Affiche un message d'erreur stylé sous une zone (radio cards, etc.) */
function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-destructive">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </p>
  );
}

const TOTAL = 12;

/* ============ STEP 1 — Type ============ */
const BIEN_OPTIONS: { value: BienType; icon: string; label: string; desc: string }[] = [
  { value: "maison", icon: "🏠", label: "Maison", desc: "Individuelle, mitoyenne, de ville" },
  { value: "appartement", icon: "🏢", label: "Appartement", desc: "Du studio au penthouse" },
  { value: "terrain", icon: "🏗", label: "Terrain", desc: "Constructible, agricole, loisirs" },
  {
    value: "local_commercial",
    icon: "🏬",
    label: "Local commercial",
    desc: "Boutique, bureau, atelier",
  },
  { value: "immeuble", icon: "🏘", label: "Immeuble", desc: "Immeuble de rapport complet" },
  {
    value: "atypique",
    icon: "🏖",
    label: "Bien atypique",
    desc: "Loft, château, corps de ferme...",
  },
];

export function Step1({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        step={1}
        total={TOTAL}
        label="Votre bien"
        title="Quel type de bien souhaitez-vous vendre ?"
        subtitle="Sélectionnez la catégorie qui correspond le mieux à votre bien."
      />
      <div className={cn("lk-field", errors?.type && "lk-field-error")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {BIEN_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              selected={form.type === o.value}
              onClick={() => set({ type: o.value })}
              icon={o.icon}
              title={o.label}
              description={o.desc}
            />
          ))}
        </div>
        <ErrorMsg msg={errors?.type} />
      </div>
    </div>
  );
}

/* ============ STEP 2 — Localisation ============ */
interface AdrFeature {
  properties: {
    label: string;
    postcode: string;
    city: string;
    context: string;
  };
}

export function Step2({ form, set, errors }: P) {
  const [query, setQuery] = useState(form.adresse);
  const [results, setResults] = useState<AdrFeature[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 3 || query === form.adresse) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`)
        .then((r) => r.json())
        .then((d) => {
          setResults(d.features ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 300);
  }, [query, form.adresse]);

  const pick = (f: AdrFeature) => {
    const dep = f.properties.context.split(",")[0]?.trim() ?? "";
    set({
      adresse: f.properties.label,
      code_postal: f.properties.postcode,
      ville: f.properties.city,
      departement: dep,
    });
    setQuery(f.properties.label);
    setOpen(false);
  };

  return (
    <div className="space-y-8">
      <StepHeader
        step={2}
        total={TOTAL}
        label="Localisation"
        title="Où se situe votre bien ?"
        subtitle="L'adresse nous permet d'analyser le marché local pour affiner votre rapport de valorisation."
      />
      <div className="space-y-5">
        <Field label="Adresse" required error={errors?.adresse}>
          <div className="relative">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="12 rue des Lilas, 75011 Paris"
              autoComplete="off"
            />
            {open && results.length > 0 && (
              <ul className="absolute z-10 mt-2 max-h-72 w-full overflow-auto rounded-[12px] border-2 border-border bg-card shadow-lg">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(r)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-sky"
                    >
                      <span className="font-medium text-navy">{r.properties.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code postal">
            <TextInput
              value={form.code_postal}
              onChange={(e) => set({ code_postal: e.target.value })}
              placeholder="75011"
            />
          </Field>
          <Field label="Ville">
            <TextInput
              value={form.ville}
              onChange={(e) => set({ ville: e.target.value })}
              placeholder="Paris"
            />
          </Field>
          <Field label="Département">
            <TextInput value={form.departement} disabled placeholder="—" />
          </Field>
        </div>

        <p className="flex items-start gap-2 rounded-[10px] bg-sky/60 p-4 text-sm text-sub">
          <span>🔒</span>
          <span>
            Votre adresse est utilisée uniquement pour calculer votre rapport de valorisation. Elle
            ne sera jamais partagée sans votre accord explicite.
          </span>
        </p>
      </div>
    </div>
  );
}

/* ============ STEP 3 — Surface ============ */
export function Step3({ form, set, errors }: P) {
  const t = form.type;
  const [parcelle, setParcelle] = useState<Parcelle | null>(null);

  // La contenance cadastrale ne vaut que pour un bien posé sur sa propre
  // parcelle. Sur un appartement, c'est le terrain de tout l'immeuble.
  const cadastrable = t === "maison" || t === "terrain";
  useEffect(() => {
    if (!cadastrable || !form.adresse) {
      setParcelle(null);
      return;
    }
    let annule = false;
    chercherParcelle(form.adresse).then((p) => {
      if (!annule) setParcelle(p);
    });
    return () => {
      annule = true;
    };
  }, [cadastrable, form.adresse]);

  const isAppart = t === "appartement";
  const showHabitable = t !== "terrain";
  const showTerrain = t === "maison" || t === "terrain";
  const showCarrez = isAppart;
  const showShob = t === "terrain" || t === "local_commercial";

  // Pour un appartement, la surface de référence est la loi Carrez (la seule
  // opposable lors de la vente) : elle passe en champ principal requis et la
  // surface habitable devient secondaire.
  const habitableField = showHabitable && (
    <Field
      key="habitable"
      label="Surface habitable"
      hint={isAppart ? "m² — optionnel, si différente de la loi Carrez" : "m²"}
      required={!isAppart}
      error={errors?.surface_habitable}
    >
      <div className="space-y-3">
        <TextInput
          type="number"
          min={9}
          max={2000}
          value={form.surface_habitable ?? ""}
          onChange={(e) =>
            set({ surface_habitable: e.target.value ? Number(e.target.value) : null })
          }
          placeholder="65"
        />
        <input
          type="range"
          min={9}
          max={500}
          value={form.surface_habitable ?? 9}
          onChange={(e) => set({ surface_habitable: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
    </Field>
  );

  const carrezField = showCarrez && (
    <Field
      key="carrez"
      label="Surface loi Carrez"
      hint="surface officielle hors espaces sous 1m80 (m²)"
      required
      error={errors?.surface_carrez}
    >
      <TextInput
        type="number"
        min={0}
        value={form.surface_carrez ?? ""}
        onChange={(e) => set({ surface_carrez: e.target.value ? Number(e.target.value) : null })}
        placeholder="63"
      />
    </Field>
  );

  return (
    <div className="space-y-8">
      <StepHeader
        step={3}
        total={TOTAL}
        label="Superficie"
        title="Quelle est la superficie de votre bien ?"
      />
      <div className="grid gap-6 md:grid-cols-2">
        {isAppart ? [carrezField, habitableField] : habitableField}
        {showTerrain && (
          <Field
            label="Surface du terrain"
            hint="m² — 0 si pas de jardin"
            required
            error={errors?.surface_terrain}
          >
            <TextInput
              type="number"
              min={0}
              value={form.surface_terrain ?? ""}
              onChange={(e) =>
                set({ surface_terrain: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="350"
            />
            {parcelle && (
              <div className="mt-2 text-xs text-sub">
                <p className="flex flex-wrap items-center gap-2">
                  <span>
                    {/* Une parcelle retenue parce qu'elle était la plus proche
                        reste probable, pas certaine : le dire évite qu'un
                        chiffre voisin passe pour une donnée officielle. */}
                    {parcelle.certaine ? "Cadastre" : "Cadastre, parcelle la plus proche"} :{" "}
                    {parcelle.section} {parcelle.numero} —{" "}
                    <strong className="text-navy">
                      {parcelle.contenance.toLocaleString("fr-FR")} m²
                    </strong>
                  </span>
                  {form.surface_terrain !== parcelle.contenance && (
                    <button
                      type="button"
                      onClick={() => set({ surface_terrain: parcelle.contenance })}
                      className="rounded-full border-2 border-primary/40 px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                    >
                      Utiliser cette valeur
                    </button>
                  )}
                </p>
                {/* L'adresse trouvée n'est pas toujours celle saisie : la BAN
                    rapproche « 14 rue des Lilas » de « 14 rue des Esclops ».
                    L'afficher permet de repérer la mauvaise correspondance. */}
                {parcelle.adresseReconnue && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    D'après l'adresse {parcelle.adresseReconnue}
                  </p>
                )}
              </div>
            )}
          </Field>
        )}
        {/* Pas de « surface des annexes » ici : cave, grenier et dépendance sont
            demandés un par un, avec leur surface, à l'étape extérieur. */}
        {showShob && (
          <Field label="SHOB / Surface plancher" hint="m²">
            <TextInput
              type="number"
              min={0}
              value={form.shob ?? ""}
              onChange={(e) => set({ shob: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        )}
      </div>
    </div>
  );
}

/* ============ STEP 4 — Composition ============ */
// « Américaine » retiré : doublon fonctionnel de « Ouverte ».
const CUISINES = ["Ouverte", "Fermée", "Semi-ouverte"];

export function Step4({ form, set, errors }: P) {
  const isAppart = form.type === "appartement";
  const isMaison = form.type === "maison";

  return (
    <div className="space-y-8">
      <StepHeader
        step={4}
        total={TOTAL}
        label="Composition"
        title="Comment est composé votre bien ?"
      />
      <div className="space-y-6">
        <Field
          label="Nombre de pièces principales"
          hint="salon, séjour, chambres — hors cuisine et SDB"
          required
          error={errors?.pieces}
        >
          <Stepper
            value={form.pieces}
            onChange={(v) => set({ pieces: v })}
            options={[1, 2, 3, 4, 5, 6, 7, "8+"]}
          />
        </Field>
        <Field label="Nombre de chambres" required error={errors?.chambres}>
          <Stepper
            value={form.chambres}
            onChange={(v) => set({ chambres: v })}
            options={[0, 1, 2, 3, 4, 5, "6+"]}
          />
        </Field>
        <Field
          label="Nombre de salles de bain"
          hint="salle d'eau avec douche incluse"
          required
          error={errors?.salles_bain}
        >
          <Stepper
            value={form.salles_bain}
            onChange={(v) => set({ salles_bain: v })}
            options={[0, 1, 2, 3, "4+"]}
          />
        </Field>
        <Field label="Nombre de WC séparés">
          <Stepper
            value={form.wc_separes}
            onChange={(v) => set({ wc_separes: v })}
            options={[0, 1, 2, "3+"]}
          />
        </Field>
        <Field label="Cuisine" required error={errors?.cuisine}>
          <div className="grid gap-3 sm:grid-cols-4">
            {CUISINES.map((c) => (
              <OptionCard
                key={c}
                compact
                selected={form.cuisine === c}
                onClick={() => set({ cuisine: c })}
                title={c}
              />
            ))}
          </div>
        </Field>

        {isAppart && (
          <>
            <Field label="Étage du bien" required error={errors?.etage}>
              <Stepper
                value={form.etage}
                onChange={(v) => set({ etage: v })}
                options={["RDC", 1, 2, 3, 4, 5, 6, 7, 8, 9, "10+"]}
              />
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-sub">
                <input
                  type="checkbox"
                  checked={form.dernier_etage}
                  onChange={(e) => set({ dernier_etage: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Dernier étage
              </label>
            </Field>
            <Field label="Nombre d'étages dans le bâtiment">
              <Stepper
                value={form.nb_etages_batiment}
                onChange={(v) => set({ nb_etages_batiment: v })}
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "11+"]}
              />
            </Field>
          </>
        )}

        {isMaison && (
          <Field
            label="Nombre de niveaux"
            hint="plain-pied = 1 niveau"
            required
            error={errors?.niveaux}
          >
            <Stepper
              value={form.niveaux}
              onChange={(v) => set({ niveaux: v })}
              options={[1, 2, 3, "4+"]}
            />
          </Field>
        )}
      </div>
    </div>
  );
}

/* ============ STEP 5 — Extérieur ============ */
/**
 * Éléments extérieurs.
 *
 * Les listes sont propres au type de bien : un appartement n'a ni terrain
 * attenant ni dépendance, une maison n'a ni ascenseur ni gardien. Seuls quatre
 * éléments sont réellement communs.
 *
 * `champ` ouvre une saisie complémentaire quand la case est cochée : la
 * superficie en m², ou le nombre de places de stationnement. Une terrasse de
 * 6 m² et une de 40 m² ne valent pas la même chose.
 */
type ExtItem = { v: string; i: string; l: string; champ?: "surface" | "places" };

const EXT_BASE: ExtItem[] = [
  { v: "balcon", i: "🌿", l: "Balcon", champ: "surface" },
  { v: "terrasse", i: "☀️", l: "Terrasse", champ: "surface" },
  { v: "jardin", i: "🌳", l: "Jardin privatif", champ: "surface" },
  { v: "parking", i: "🅿️", l: "Parking", champ: "places" },
];

// En copropriété, l'emplacement fermé s'appelle un box, pas un garage.
const EXT_APPART: ExtItem[] = [
  { v: "box", i: "🚗", l: "Box", champ: "places" },
  { v: "cave", i: "🏠", l: "Cave", champ: "surface" },
  { v: "ascenseur", i: "🛗", l: "Ascenseur" },
  { v: "gardien", i: "👮", l: "Gardien / Concierge" },
  { v: "digicode", i: "🔐", l: "Digicode / Interphone" },
  { v: "salle_sport_residence", i: "🏋️", l: "Salle de sport résidence" },
  { v: "piscine_residence", i: "🌊", l: "Piscine de résidence" },
];

// « Espace vert aménagé » et « Panneau solaire » ont été retirés : doublons de
// « Jardin privatif » et des panneaux photovoltaïques de l'étape Prestations.
const EXT_MAISON: ExtItem[] = [
  { v: "piscine", i: "🏊", l: "Piscine", champ: "surface" },
  { v: "garage", i: "🚗", l: "Garage fermé", champ: "places" },
  { v: "cave", i: "🏠", l: "Cave / Sous-sol", champ: "surface" },
  { v: "grenier", i: "📦", l: "Grenier / Combles", champ: "surface" },
  { v: "dependance", i: "🏡", l: "Dépendance / Annexe", champ: "surface" },
  { v: "terrain_attenant", i: "🌲", l: "Terrain attenant", champ: "surface" },
  { v: "cloture", i: "🏡", l: "Clôture / Portail" },
  { v: "abri_jardin", i: "🏗", l: "Abri de jardin / Pool house" },
  { v: "arrosage_auto", i: "🚿", l: "Arrosage automatique" },
];
export function Step5({ form, set }: P) {
  const toggle = (v: string) => {
    const has = form.exterieur.includes(v);
    // En décochant, on oublie aussi la valeur saisie : la garder ferait
    // réapparaître un chiffre fantôme si l'utilisateur recoche plus tard.
    const details = { ...form.exterieur_details };
    if (has) delete details[v];
    set({
      exterieur: has ? form.exterieur.filter((x) => x !== v) : [...form.exterieur, v],
      exterieur_details: details,
    });
  };

  const majDetail = (v: string, valeur: string) =>
    set({
      exterieur_details: {
        ...form.exterieur_details,
        [v]: valeur ? Number(valeur) : null,
      },
    });

  const items = [
    ...EXT_BASE,
    ...(form.type === "appartement" ? EXT_APPART : []),
    ...(form.type === "maison" ? EXT_MAISON : []),
  ];

  return (
    <div className="space-y-8">
      <StepHeader
        step={5}
        total={TOTAL}
        label="Extérieur"
        title="Votre bien dispose-t-il de ces éléments ?"
        subtitle="Sélectionnez tout ce qui correspond, puis précisez la superficie ou le nombre de places."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => {
          const coche = form.exterieur.includes(o.v);
          return (
            <div key={o.v}>
              <ToggleCard selected={coche} onClick={() => toggle(o.v)} icon={o.i} title={o.l} />
              {coche && o.champ && (
                <div className="mt-2 flex items-center gap-2 pl-1">
                  <label htmlFor={`ext-${o.v}`} className="shrink-0 text-xs font-medium text-sub">
                    {o.champ === "surface" ? "Superficie" : "Nombre de places"}
                  </label>
                  <TextInput
                    id={`ext-${o.v}`}
                    type="number"
                    min={0}
                    value={form.exterieur_details[o.v] ?? ""}
                    onChange={(e) => majDetail(o.v, e.target.value)}
                    placeholder={o.champ === "surface" ? "m²" : "1"}
                    className="h-10 text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.exterieur.includes("aucun")}
          onChange={() =>
            set(
              form.exterieur.includes("aucun")
                ? { exterieur: [], exterieur_details: {} }
                : { exterieur: ["aucun"], exterieur_details: {} },
            )
          }
          className="h-4 w-4 accent-primary"
        />
        Aucun de ces éléments
      </label>
    </div>
  );
}

/* ============ STEP 6 — État ============ */
const ETATS: { v: EtatGeneral; i: string; t: string; d: string }[] = [
  {
    v: "excellent",
    i: "✨",
    t: "Excellent état / Neuf ou rénové récemment",
    d: "Travaux de rénovation complète réalisés il y a moins de 5 ans, ou construction neuve. Aucun travaux nécessaires, livré clé en main.",
  },
  {
    v: "bon",
    i: "👍",
    t: "Bon état général",
    d: "Bien entretenu, quelques travaux de rafraîchissement possibles (peinture, revêtements) mais habitable et fonctionnel tel quel.",
  },
  {
    v: "moyen",
    i: "🔧",
    t: "État moyen — travaux à prévoir",
    d: "Des travaux de rénovation sont nécessaires (cuisine, salle de bain, isolation) mais la structure est saine. À estimer avant achat.",
  },
  {
    v: "a_renover",
    i: "🏚",
    t: "À rénover entièrement",
    d: "Travaux importants requis : structure, électricité, plomberie, isolation. Bien à fort potentiel pour investisseur ou acheteur averti.",
  },
];

export function Step6({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        step={6}
        total={TOTAL}
        label="État général"
        title="Dans quel état se trouve votre bien ?"
        subtitle="Soyez honnête — une estimation juste est plus utile qu'une estimation optimiste."
      />
      <div className={cn("lk-field", errors?.etat && "lk-field-error")}>
        <div className="space-y-3">
          {ETATS.map((e) => (
            <OptionCard
              key={e.v}
              selected={form.etat === e.v}
              onClick={() => set({ etat: e.v })}
              icon={e.i}
              title={e.t}
              description={e.d}
            />
          ))}
        </div>
        <ErrorMsg msg={errors?.etat} />
      </div>
    </div>
  );
}

/* ============ STEP 7 — Prestations ============ */
/** `only` restreint une prestation à certains types de bien (absent = tous). */
const PRESTATIONS: {
  section: string;
  items: { v: string; l: string; only?: BienType[] }[];
}[] = [
  {
    section: "🏗 Structure & confort",
    items: [
      { v: "double_vitrage", l: "Double ou triple vitrage" },
      { v: "volets_elec", l: "Volets roulants électriques" },
      { v: "pergola", l: "Stores extérieurs / Pergola bioclimatique" },
      { v: "parquet", l: "Parquet massif ou contrecollé" },
      { v: "carrelage_pierre", l: "Carrelage grand format / Pierre naturelle" },
      { v: "moulures", l: "Faux plafonds / Moulures / Décoration haut de gamme" },
      { v: "dressing", l: "Dressing ou rangements intégrés" },
      { v: "placards", l: "Placards intégrés" },
    ],
  },
  {
    section: "🍳 Cuisine",
    items: [
      { v: "cuisine_amenagee", l: "Cuisine aménagée (meublée)" },
      { v: "cuisine_equipee_electro", l: "Cuisine équipée (électroménager)" },
      { v: "plan_pierre", l: "Plan de travail en pierre (marbre, granit, quartz)" },
      { v: "ilot", l: "Îlot central" },
    ],
  },
  {
    section: "🛁 Salle de bain",
    items: [
      { v: "sdb_renovee", l: "Salle de bain rénovée (moins de 5 ans)" },
      { v: "baignoire_ilot", l: "Baignoire îlot / balnéothérapie" },
      { v: "douche_italienne", l: "Douche à l'italienne" },
      { v: "double_vasque", l: "Double vasque / meuble suspendu" },
    ],
  },
  {
    section: "🌐 Connectivité & domotique",
    items: [
      { v: "fibre", l: "Fibre optique disponible" },
      { v: "domotique", l: "Domotique connectée" },
      { v: "alarme", l: "Alarme / Système de sécurité" },
      { v: "portail_motorise", l: "Portail / Portillon motorisé" },
    ],
  },
  {
    section: "🎨 Standing & vue",
    items: [
      { v: "vue_degagee", l: "Vue dégagée / Vue mer / Vue monument" },
      { v: "lumineux", l: "Lumineux / Exposition Sud ou Ouest" },
      { v: "calme", l: "Calme / Pas de vis-à-vis" },
      // Notions propres à la copropriété : elles n'ont pas de sens sur une maison.
      { v: "immeuble_recent", l: "Immeuble récent (< 15 ans)", only: ["appartement", "immeuble"] },
      { v: "residence_securisee", l: "Résidence sécurisée / Fermée", only: ["appartement"] },
      { v: "construction_recente", l: "Construction récente (< 15 ans)", only: ["maison"] },
      { v: "quartier_recherche", l: "Quartier recherché / Secteur prisé" },
    ],
  },
];

export function Step7({ form, set }: P) {
  const toggle = (v: string) => {
    const has = form.prestations.includes(v);
    set({
      prestations: has ? form.prestations.filter((x) => x !== v) : [...form.prestations, v],
    });
  };
  return (
    <div className="space-y-8">
      <StepHeader
        step={7}
        total={TOTAL}
        label="Prestations"
        title="Quels équipements et prestations votre bien inclut-il ?"
        subtitle="Ces éléments influencent significativement la valeur de votre bien."
      />
      <div className="space-y-2">
        {PRESTATIONS.map((s) => (
          <div key={s.section}>
            <SectionTitle>{s.section}</SectionTitle>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {s.items
                .filter((it) => !it.only || (form.type && it.only.includes(form.type)))
                .map((it) => (
                  <ToggleCard
                    key={it.v}
                    selected={form.prestations.includes(it.v)}
                    onClick={() => toggle(it.v)}
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

/* ============ STEP 8 — Énergie ============ */
const DPE_LETTERS: { v: DpeLetter; bg: string }[] = [
  { v: "A", bg: "#319834" },
  { v: "B", bg: "#56B947" },
  { v: "C", bg: "#A5CD3A" },
  { v: "D", bg: "#F8E81C" },
  { v: "E", bg: "#F3B632" },
  { v: "F", bg: "#EE7A2F" },
  { v: "G", bg: "#E52D27" },
];

export function DpeRow({
  value,
  onChange,
}: {
  value: DpeLetter | null;
  onChange: (v: DpeLetter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DPE_LETTERS.map((d) => (
        <button
          key={d.v}
          type="button"
          onClick={() => onChange(d.v)}
          style={{ backgroundColor: d.bg }}
          className={cn(
            "h-12 w-12 rounded-[10px] font-display text-lg font-bold text-white transition",
            value === d.v ? "scale-110 ring-4 ring-primary/40" : "opacity-70 hover:opacity-100",
          )}
        >
          {d.v}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange("inconnu")}
        className={cn(
          "h-12 rounded-[10px] border-2 px-4 font-display text-sm font-semibold transition",
          value === "inconnu"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-navy hover:border-primary/60",
        )}
      >
        Je ne sais pas
      </button>
    </div>
  );
}

export function Step8({ form, set }: P) {
  const passoire = form.dpe === "F" || form.dpe === "G";
  const bascule = (liste: string[], v: string) =>
    liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];

  return (
    <div className="space-y-8">
      <StepHeader
        step={8}
        total={TOTAL}
        label="Énergie"
        title="Connaissez-vous le DPE de votre bien ?"
        subtitle="Le Diagnostic de Performance Énergétique a un impact direct sur la valeur et la vente de votre bien. Les réponses ci-dessous permettent de construire votre profil énergétique."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 space-y-6 lg:order-1">
          <Field label="Étiquette énergie (DPE)">
            <DpeRow value={form.dpe} onChange={(v) => set({ dpe: v })} />
          </Field>
          <Field label="Étiquette GES">
            <DpeRow value={form.ges} onChange={(v) => set({ ges: v })} />
          </Field>
          <Field label="Date du DPE">
            <PillGroup
              value={form.dpe_date}
              onChange={(v) => set({ dpe_date: v })}
              options={DPE_DATES}
            />
          </Field>
          {passoire && (
            <Field
              label="Audit énergétique réalisé ?"
              hint="obligatoire depuis 2023 pour vendre un logement classé F ou G"
            >
              <PillGroup
                value={form.audit_energetique}
                onChange={(v) => set({ audit_energetique: v })}
                options={AUDIT_OPTS}
              />
            </Field>
          )}

          <SectionTitle>Chauffage et eau chaude</SectionTitle>
          <Field label="Type de chauffage principal">
            <PillGroup
              value={form.chauffage}
              onChange={(v) => set({ chauffage: v })}
              options={CHAUFFAGE_OPTS}
            />
          </Field>
          {/* Précisions ouvertes seulement quand elles ont un sens. */}
          {form.chauffage === "Pompe à chaleur" && (
            <Field label="Quel type de pompe à chaleur ?">
              <PillGroup
                value={form.pac_type}
                onChange={(v) => set({ pac_type: v })}
                options={PAC_TYPES}
              />
            </Field>
          )}
          {form.chauffage === "Gaz naturel" && (
            <Field label="Quel type de chaudière gaz ?">
              <PillGroup
                value={form.chaudiere_gaz_type}
                onChange={(v) => set({ chaudiere_gaz_type: v })}
                options={CHAUDIERE_GAZ_TYPES}
              />
            </Field>
          )}
          {form.chauffage === "Bois" && (
            <Field label="Quel équipement bois ?">
              <PillGroup
                value={form.bois_type}
                onChange={(v) => set({ bois_type: v })}
                options={BOIS_TYPES}
              />
            </Field>
          )}
          <Field label="Chauffage individuel ou collectif ?">
            <PillGroup
              value={form.chauffage_mode}
              onChange={(v) => set({ chauffage_mode: v })}
              options={CHAUFFAGE_MODES}
            />
          </Field>
          <Field label="Production d'eau chaude">
            <PillGroup
              value={form.eau_chaude}
              onChange={(v) => set({ eau_chaude: v })}
              options={EAU_CHAUDE_OPTS}
            />
          </Field>
          <Field label="Eau chaude individuelle ou collective ?">
            <PillGroup
              value={form.eau_chaude_mode}
              onChange={(v) => set({ eau_chaude_mode: v })}
              options={EAU_CHAUDE_MODES}
            />
          </Field>

          <SectionTitle>Isolation et ventilation</SectionTitle>
          <Field label="Les combles sont-ils isolés ?">
            <PillGroup
              value={form.isolation_combles}
              onChange={(v) => set({ isolation_combles: v })}
              options={ISOLATION_COMBLES}
            />
          </Field>
          <Field label="Les murs sont-ils isolés ?">
            <PillGroup
              value={form.isolation_murs}
              onChange={(v) => set({ isolation_murs: v })}
              options={ISOLATION_MURS}
            />
          </Field>
          <Field label="Fenêtres">
            <PillGroup
              value={form.fenetres}
              onChange={(v) => set({ fenetres: v })}
              options={FENETRES_OPTS}
            />
          </Field>
          <Field label="Ventilation">
            <PillGroup
              value={form.ventilation}
              onChange={(v) => set({ ventilation: v })}
              options={VENTILATION_OPTS}
            />
          </Field>

          <SectionTitle>Équipements et travaux</SectionTitle>
          <Field label="Équipements énergétiques présents" hint="plusieurs choix possibles">
            <PillMulti
              values={form.equipements_energie}
              onToggle={(v) => set({ equipements_energie: bascule(form.equipements_energie, v) })}
              options={EQUIPEMENTS_ENERGIE}
            />
          </Field>
          <SectionTitle>Contexte du bien</SectionTitle>
          <Field label="Année de construction estimée">
            <PillGroup
              value={form.annee_construction}
              onChange={(v) => set({ annee_construction: v })}
              options={ANNEES_CONSTRUCTION}
            />
          </Field>
          <Field label="Dernière rénovation énergétique">
            <PillGroup
              value={form.derniere_renovation}
              onChange={(v) => set({ derniere_renovation: v })}
              options={RENOVATIONS}
            />
          </Field>

          <p className="flex items-start gap-3 rounded-[12px] border-2 border-sky-mid bg-sky/50 p-4 text-sm text-navy">
            <span>💡</span>
            <span>
              Depuis 2025, les logements classés G ne peuvent plus être mis en location. Un DPE
              défavorable impacte directement le nombre d'acheteurs potentiels et votre prix de
              vente. Leenkey peut vous orienter vers des aides à la rénovation.
            </span>
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <ProfilEnergetiquePanel form={form} />
        </div>
      </div>
    </div>
  );
}

/* ============ STEP 9 — Situation ============ */
const PROPRIETAIRES = [
  "Unique propriétaire",
  "Co-propriétaire (couple, famille)",
  "En indivision (succession, divorce)",
  "Nu-propriétaire (avec usufruit)",
  "Bailleur (bien en location)",
];
const OCCUPATIONS = [
  "Vide / Libre immédiatement",
  "Occupé par le propriétaire",
  "Occupé par un locataire (bail en cours)",
  "Occupé par un locataire (bail expirant prochainement)",
  "Résidence secondaire",
];
const BAIL_TYPES = ["Location vide", "Location meublée", "Bail mobilité", "Autre"];
const CONTRAINTES = [
  "Hypothèque ou crédit immobilier en cours",
  "Droit de préemption urbain",
  "Monument historique / Secteur sauvegardé",
  "Bien en viager",
  "Bien en démembrement (usufruit / nue-propriété)",
  "Litige en cours (copropriété, voisinage)",
];

export function Step9({ form, set, errors }: P) {
  const isLoc = form.occupation?.startsWith("Occupé par un locataire") ?? false;
  const toggleContrainte = (c: string) => {
    if (c === "aucune") {
      set({ contraintes: form.contraintes.includes("aucune") ? [] : ["aucune"] });
      return;
    }
    const next = form.contraintes.filter((x) => x !== "aucune");
    set({
      contraintes: next.includes(c) ? next.filter((x) => x !== c) : [...next, c],
    });
  };

  return (
    <div className="space-y-8">
      <StepHeader
        step={9}
        total={TOTAL}
        label="Situation"
        title="Quelques questions sur la situation de votre bien."
      />
      <div className="space-y-6">
        <Field label="Vous êtes…" required error={errors?.proprietaire}>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROPRIETAIRES.map((p) => (
              <OptionCard
                key={p}
                compact
                selected={form.proprietaire === p}
                onClick={() => set({ proprietaire: p })}
                title={p}
              />
            ))}
          </div>
        </Field>
        <Field label="Votre bien est actuellement…" required error={errors?.occupation}>
          <div className="grid gap-3 sm:grid-cols-2">
            {OCCUPATIONS.map((p) => (
              <OptionCard
                key={p}
                compact
                selected={form.occupation === p}
                onClick={() => set({ occupation: p })}
                title={p}
              />
            ))}
          </div>
        </Field>

        {isLoc && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date d'expiration du bail">
              <TextInput
                type="date"
                value={form.bail_expiration}
                onChange={(e) => set({ bail_expiration: e.target.value })}
              />
            </Field>
            <Field label="Type de bail">
              <PillGroup
                value={form.bail_type}
                onChange={(v) => set({ bail_type: v })}
                options={BAIL_TYPES}
              />
            </Field>
          </div>
        )}

        <Field label="Contraintes particulières">
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTRAINTES.map((c) => (
              <ToggleCard
                key={c}
                selected={form.contraintes.includes(c)}
                onClick={() => toggleContrainte(c)}
                title={c}
              />
            ))}
            <ToggleCard
              selected={form.contraintes.includes("aucune")}
              onClick={() => toggleContrainte("aucune")}
              title="Aucune contrainte particulière"
            />
          </div>
        </Field>

        {form.type === "appartement" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Charges de copropriété mensuelles (€)">
              <TextInput
                type="number"
                min={0}
                value={form.charges_copro ?? ""}
                onChange={(e) =>
                  set({ charges_copro: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="180"
              />
            </Field>
            <Field label="Procédure en cours en copropriété ?">
              <PillGroup
                value={form.procedure_copro}
                onChange={(v) => set({ procedure_copro: v })}
                options={["Oui", "Non", "Je ne sais pas"]}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ STEP 10 — Projet ============ */
const RAISONS = [
  { v: "achat_autre_bien", i: "🔄", l: "Achat d'un autre bien" },
  { v: "mutation_pro", i: "💼", l: "Mutation professionnelle" },
  { v: "investissement", i: "💰", l: "Investissement / Libération de capital" },
  { v: "separation", i: "👨‍👩‍👧", l: "Séparation / Divorce" },
  { v: "succession", i: "⚖️", l: "Succession / Héritage" },
  { v: "demenagement", i: "📍", l: "Déménagement personnel" },
  { v: "retraite", i: "🏖", l: "Passage à la retraite" },
  { v: "financier", i: "💼", l: "Raisons financières" },
  { v: "autre", i: "✏️", l: "Autre" },
];
const DELAIS = [
  { v: "moins_3_mois", i: "🔥", l: "Le plus tôt possible", d: "Moins de 3 mois" },
  { v: "6_mois", i: "📅", l: "Dans les 6 mois", d: "" },
  { v: "1_an", i: "🗓", l: "Dans l'année", d: "" },
  { v: "indecis", i: "🤔", l: "Je ne suis pas encore décidé", d: "" },
];
const ESTIMATIONS = [
  "Non, c'est ma première estimation",
  "Oui, par une agence immobilière",
  "Oui, par un notaire",
  "Oui, par un autre outil en ligne",
  "Oui, par plusieurs sources",
];

export function Step10({ form, set, errors }: P) {
  const hasEst = form.estimation_prealable && !form.estimation_prealable.startsWith("Non");
  return (
    <div className="space-y-8">
      <StepHeader
        step={10}
        total={TOTAL}
        label="Votre projet"
        title="Parlez-nous de votre projet de vente."
      />
      <div className="space-y-6">
        <Field label="Pourquoi vendez-vous ?" hint="optionnel mais recommandé">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RAISONS.map((r) => (
              <OptionCard
                key={r.v}
                compact
                selected={form.raison_vente === r.v}
                onClick={() => set({ raison_vente: r.v })}
                icon={r.i}
                title={r.l}
              />
            ))}
          </div>
        </Field>
        <Field label="Dans quel délai souhaitez-vous vendre ?" required error={errors?.delai}>
          <div className="grid gap-3 sm:grid-cols-2">
            {DELAIS.map((d) => (
              <OptionCard
                key={d.v}
                selected={form.delai === d.v}
                onClick={() => set({ delai: d.v })}
                icon={d.i}
                title={d.l}
                description={d.d || undefined}
              />
            ))}
          </div>
        </Field>
        <Field label="Avez-vous déjà fait estimer votre bien ?">
          <PillGroup
            value={form.estimation_prealable}
            onChange={(v) => set({ estimation_prealable: v })}
            options={ESTIMATIONS}
          />
        </Field>
        {hasEst && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quel était le prix estimé ? (€)">
              <TextInput
                type="number"
                min={0}
                value={form.prix_estime_prealable ?? ""}
                onChange={(e) =>
                  set({
                    prix_estime_prealable: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="350000"
              />
            </Field>
            <Field label="Étiez-vous satisfait de cette estimation ?">
              <PillGroup
                value={form.satisfait_estimation}
                onChange={(v) => set({ satisfait_estimation: v })}
                options={["Oui", "Non", "Incertain"]}
              />
            </Field>
          </div>
        )}
        <Field label="Avez-vous une idée du prix souhaité ?">
          <PillGroup
            value={form.prix_souhaite_connu}
            onChange={(v) => set({ prix_souhaite_connu: v })}
            options={["Oui", "Non, je m'appuie sur votre rapport de valorisation"]}
          />
        </Field>
        {form.prix_souhaite_connu === "Oui" && (
          <Field label="Prix souhaité (€)">
            <TextInput
              type="number"
              min={0}
              value={form.prix_souhaite ?? ""}
              onChange={(e) =>
                set({ prix_souhaite: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="380000"
            />
          </Field>
        )}
        <Field label="Avez-vous un acheteur potentiel identifié ?">
          <PillGroup
            value={form.acheteur_identifie}
            onChange={(v) => set({ acheteur_identifie: v })}
            options={["Oui", "Non"]}
          />
        </Field>
        <Field label="Projet d'achat simultané (achat-revente) ?">
          <PillGroup
            value={form.projet_achat_simultane}
            onChange={(v) => set({ projet_achat_simultane: v })}
            options={["Oui", "Non"]}
          />
        </Field>
        {form.projet_achat_simultane === "Oui" && (
          <Field label="Avez-vous trouvé le bien à acheter ?">
            <PillGroup
              value={form.bien_achat_trouve}
              onChange={(v) => set({ bien_achat_trouve: v })}
              options={["Oui", "Non", "En cours de recherche"]}
            />
          </Field>
        )}
      </div>
    </div>
  );
}

/* ============ STEP 11 — Photos ============ */
function FileDrop({
  label,
  hint,
  accept,
  files,
  onAdd,
  onRemove,
}: {
  label: string;
  hint: string;
  accept: string;
  files: { name: string; size: number }[];
  onAdd: (f: { name: string; size: number }[]) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <SectionTitle>{label}</SectionTitle>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border bg-sky/40 p-8 text-center transition hover:border-primary/60 hover:bg-sky/70">
        <span className="text-3xl">📎</span>
        <span className="font-display text-sm font-semibold text-navy">
          Glissez vos fichiers ou cliquez pour parcourir
        </span>
        <span className="text-xs text-sub">{hint}</span>
        <input
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const newF = Array.from(e.target.files ?? []).map((f) => ({
              name: f.name,
              size: f.size,
            }));
            onAdd(newF);
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-[10px] border-2 border-border bg-card px-4 py-2 text-sm"
            >
              <span className="truncate text-navy">📄 {f.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Step11({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        step={11}
        total={TOTAL}
        label="Vos documents"
        title="Des documents pour affiner votre rapport de valorisation ?"
        subtitle="Cette étape est facultative mais améliore la précision de votre rapport de valorisation."
      />
      <div className="space-y-6">
        <FileDrop
          label="Photos du bien"
          hint="JPG, PNG, HEIC · max 20 photos · 10 Mo / photo · Salon, cuisine, chambres, extérieurs"
          accept="image/*,.heic"
          files={form.photos}
          onAdd={(f) => set({ photos: [...form.photos, ...f].slice(0, 20) })}
          onRemove={(i) => set({ photos: form.photos.filter((_, idx) => idx !== i) })}
        />
        <FileDrop
          label="Documents"
          hint="Plan, DPE, taxe foncière, surface Carrez, charges (PDF, JPG)"
          accept=".pdf,image/*"
          files={form.documents}
          onAdd={(f) => set({ documents: [...form.documents, ...f] })}
          onRemove={(i) => set({ documents: form.documents.filter((_, idx) => idx !== i) })}
        />
        <p className="rounded-[12px] border-2 border-sky-mid bg-sky/50 p-4 text-sm text-navy">
          🔒 Ces documents sont traités de façon confidentielle et ne sont utilisés que pour
          améliorer la précision de votre rapport de valorisation. Aucun document ne sera partagé
          sans votre accord.
        </p>
      </div>
    </div>
  );
}

/* ============ STEP 12 — Contact ============ */
const SOURCES = [
  "Google / Recherche internet",
  "Réseaux sociaux",
  "Bouche-à-oreille / Recommandation",
  "Article de presse / Blog",
  "Publicité en ligne",
  "Autre",
];
const DISPOS = [
  { v: "matin", l: "Matin (8h–12h)" },
  { v: "dejeuner", l: "Déjeuner (12h–14h)" },
  { v: "apres_midi", l: "Après-midi (14h–17h)" },
  { v: "soir", l: "Soir (17h–19h)" },
  { v: "peu_importe", l: "Peu importe" },
];

export function Step12({
  form,
  set,
  errors,
}: P & { errors: Partial<Record<keyof LeenkeyForm, string>> }) {
  const toggleDispo = (v: string) => {
    const has = form.disponibilites.includes(v);
    set({
      disponibilites: has
        ? form.disponibilites.filter((x) => x !== v)
        : [...form.disponibilites, v],
    });
  };
  return (
    <div className="space-y-8">
      <StepHeader
        step={12}
        total={TOTAL}
        label="Vos coordonnées"
        title="Où envoyer votre rapport de valorisation ?"
        subtitle="Votre rapport de valorisation personnalisée est prête. Entrez vos coordonnées pour la recevoir gratuitement et sans engagement."
      />
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required error={errors.prenom}>
            <TextInput
              value={form.prenom}
              onChange={(e) => set({ prenom: e.target.value })}
              placeholder="Marie"
            />
          </Field>
          <Field label="Nom" required error={errors.nom}>
            <TextInput
              value={form.nom}
              onChange={(e) => set({ nom: e.target.value })}
              placeholder="Dupont"
            />
          </Field>
        </div>
        <Field label="Email" required error={errors.email}>
          <TextInput
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="marie.dupont@email.com"
          />
        </Field>
        <Field
          label="Téléphone"
          required
          hint="pour être contacté par votre conseiller dédié"
          error={errors.telephone}
        >
          <TextInput
            type="tel"
            value={form.telephone}
            onChange={(e) => set({ telephone: e.target.value })}
            placeholder="06 12 34 56 78"
          />
        </Field>
        <Field label="Comment avez-vous connu Leenkey ?">
          <PillGroup value={form.source} onChange={(v) => set({ source: v })} options={SOURCES} />
        </Field>
        <Field label="Disponibilités pour un appel">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DISPOS.map((d) => (
              <ToggleCard
                key={d.v}
                selected={form.disponibilites.includes(d.v)}
                onClick={() => toggleDispo(d.v)}
                title={d.l}
              />
            ))}
          </div>
        </Field>

        <div className="space-y-4 rounded-[14px] border-2 border-border bg-sky/30 p-5">
          {/* Case 1 — RGPD obligatoire */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 text-sm transition-colors",
              errors.rgpd && "lk-field-error rounded-md p-2 -m-2",
            )}
          >
            <input
              type="checkbox"
              checked={form.rgpd}
              onChange={(e) => set({ rgpd: e.target.checked })}
              className={cn(
                "mt-1 h-5 w-5 accent-primary",
                errors.rgpd && "ring-2 ring-destructive ring-offset-1 rounded",
              )}
            />
            <span className="text-sub">
              <span className="font-semibold text-navy">
                J'accepte que Leenkey utilise mes données personnelles
              </span>{" "}
              pour traiter ma demande de valorisation et me transmettre mon rapport personnalisé,
              conformément à la{" "}
              <a className="text-primary underline" href="#" onClick={(e) => e.preventDefault()}>
                politique de confidentialité
              </a>
              . <span className="text-destructive">*</span>
            </span>
          </label>
          {errors.rgpd && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive -mt-2 ml-8">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.rgpd}
            </p>
          )}

          {/* Case 2 — Opt-in contact téléphonique */}
          <label className="flex cursor-pointer items-start gap-3 text-sm border-t border-border/60 pt-4">
            <input
              type="checkbox"
              checked={form.contact_conseiller}
              onChange={(e) => set({ contact_conseiller: e.target.checked })}
              className="mt-1 h-5 w-5 accent-primary"
            />
            <span className="text-sub">
              <span className="font-semibold text-navy">
                Je souhaite être contacté par téléphone par un conseiller Leenkey
              </span>{" "}
              pour échanger sur mon projet de vente et découvrir les services proposés (offres
              Accompagné et Sérénité).
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
