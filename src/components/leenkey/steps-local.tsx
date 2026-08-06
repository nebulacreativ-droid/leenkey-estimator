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
import type { EtatGeneral } from "./types";

/* ------------------------------------------------------------------ */
/* Parcours dédié au type "local_commercial".                          */
/* Un local ne se valorise pas comme un logement : ce sont l'emplace-  */
/* ment commercial, le flux et le rendement locatif qui font le prix,  */
/* pas le nombre de chambres.                                          */
/* ------------------------------------------------------------------ */

function toggleIn(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ============ ÉTAPE 1 — Identification ============ */

const LOCAL_TYPES: { value: string; icon: string; label: string; desc: string }[] = [
  { value: "boutique", icon: "🛍", label: "Boutique", desc: "Commerce de détail avec vitrine" },
  { value: "bureau", icon: "💼", label: "Bureau", desc: "Tertiaire, profession libérale" },
  { value: "restaurant", icon: "🍽", label: "Restaurant", desc: "Avec extraction et cuisine" },
  { value: "bar", icon: "🍸", label: "Bar", desc: "Débit de boissons, licence IV" },
  { value: "coiffure", icon: "💇", label: "Salon de coiffure", desc: "Ou institut de beauté" },
  { value: "medical", icon: "🩺", label: "Cabinet médical", desc: "Médical ou paramédical" },
  { value: "activite", icon: "🔧", label: "Local d'activité", desc: "Artisanat, atelier" },
  { value: "entrepot", icon: "📦", label: "Entrepôt", desc: "Stockage, logistique" },
  {
    value: "alimentaire",
    icon: "🥖",
    label: "Commerce alimentaire",
    desc: "Boulangerie, primeur…",
  },
  { value: "autre", icon: "🏬", label: "Autre", desc: "Autre destination commerciale" },
];

export function LocalStep1({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Le local"
        title="Quel local souhaitez-vous vendre ?"
        subtitle="La destination et la répartition des surfaces déterminent la clientèle d'acquéreurs."
      />
      <div className="space-y-6">
        <Field label="Type de local" required error={errors?.local_type}>
          <div className="grid gap-3 sm:grid-cols-2">
            {LOCAL_TYPES.map((o) => (
              <OptionCard
                key={o.value}
                selected={form.local_type === o.value}
                onClick={() => set({ local_type: o.value })}
                icon={o.icon}
                title={o.label}
                description={o.desc}
              />
            ))}
          </div>
        </Field>

        <SectionTitle>Surfaces</SectionTitle>
        <Field label="Surface totale" hint="m²" required error={errors?.surface_totale}>
          <TextInput
            type="number"
            min={1}
            value={form.surface_totale ?? ""}
            onChange={(e) =>
              set({ surface_totale: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="120"
          />
        </Field>
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            label="Surface de vente"
            hint="m² — la partie accessible au public, celle qui porte la valeur"
          >
            <TextInput
              type="number"
              min={0}
              value={form.surface_vente ?? ""}
              onChange={(e) =>
                set({ surface_vente: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="80"
            />
          </Field>
          <Field label="Réserve / stockage" hint="m²">
            <TextInput
              type="number"
              min={0}
              value={form.surface_reserve ?? ""}
              onChange={(e) =>
                set({ surface_reserve: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="40"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 2 — Caractéristiques ============ */

const CONFIGS: { v: string; i: string; l: string; d: string }[] = [
  { v: "angle", i: "📐", l: "Local d'angle", d: "Deux façades — visibilité très supérieure" },
  { v: "traversant", i: "↔️", l: "Traversant", d: "Deux accès sur rues différentes" },
  { v: "plain_pied", i: "🚪", l: "De plain-pied", d: "Sans marche depuis la rue" },
  { v: "plusieurs_niveaux", i: "🪜", l: "Sur plusieurs niveaux", d: "Étage ou sous-sol exploités" },
];

const EQUIPEMENTS: { v: string; i: string; l: string; d: string }[] = [
  { v: "pmr", i: "♿", l: "Accès PMR", d: "Conforme à l'accessibilité handicapés" },
  { v: "clim", i: "❄️", l: "Climatisation", d: "Installation en place" },
  { v: "extraction", i: "💨", l: "Extraction", d: "Indispensable pour la restauration" },
  { v: "rideau", i: "🛡", l: "Rideau métallique", d: "Protection de la devanture" },
  { v: "vitrine_securisee", i: "🔒", l: "Vitrine sécurisée", d: "Vitrage anti-effraction" },
];

export function LocalStep2({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Caractéristiques"
        title="Comment le local est-il configuré ?"
        subtitle="Un local d'angle avec une grande vitrine peut valoir 20 à 30 % de plus que le même local en linéaire."
      />
      <div className="space-y-6">
        <SectionTitle>Configuration</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONFIGS.map((o) => (
            <ToggleCard
              key={o.v}
              selected={form.local_config.includes(o.v)}
              onClick={() => set({ local_config: toggleIn(form.local_config, o.v) })}
              icon={o.i}
              title={o.l}
              desc={o.d}
            />
          ))}
        </div>

        <SectionTitle>Équipements</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {EQUIPEMENTS.map((o) => (
            <ToggleCard
              key={o.v}
              selected={form.local_equipements.includes(o.v)}
              onClick={() => set({ local_equipements: toggleIn(form.local_equipements, o.v) })}
              icon={o.i}
              title={o.l}
              desc={o.d}
            />
          ))}
        </div>

        <SectionTitle>Dimensions</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Longueur de vitrine" hint="mètres linéaires">
            <TextInput
              type="number"
              min={0}
              value={form.longueur_vitrine ?? ""}
              onChange={(e) =>
                set({ longueur_vitrine: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="6"
            />
          </Field>
          <Field label="Hauteur sous plafond" hint="mètres">
            <TextInput
              type="number"
              min={0}
              step="0.1"
              value={form.hauteur_plafond ?? ""}
              onChange={(e) =>
                set({ hauteur_plafond: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="3.2"
            />
          </Field>
        </div>
        <Field label="Nombre d'accès">
          <Stepper
            value={form.nb_acces}
            onChange={(v) => set({ nb_acces: v })}
            options={[1, 2, 3, "4+"]}
          />
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 3 — Emplacement ============ */

const ENVIRONNEMENTS: { value: string; icon: string; label: string; desc: string }[] = [
  {
    value: "tres_commercante",
    icon: "🌟",
    label: "Rue très commerçante",
    desc: "Artère n°1, enseignes nationales, flux permanent",
  },
  {
    value: "passante",
    icon: "🚶",
    label: "Rue passante",
    desc: "Commerces de proximité, bon flux quotidien",
  },
  {
    value: "secondaire",
    icon: "🔀",
    label: "Rue secondaire",
    desc: "Flux irrégulier, activité de destination",
  },
  {
    value: "residentielle",
    icon: "🏘",
    label: "Zone résidentielle",
    desc: "Clientèle de quartier uniquement",
  },
  {
    value: "artisanale",
    icon: "🏭",
    label: "Zone artisanale / activité",
    desc: "Périphérie, accès voiture indispensable",
  },
];

const NIVEAUX = ["Excellent", "Bon", "Moyen", "Faible"];

export function LocalStep3({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Emplacement"
        title="Où se situe le local ?"
        subtitle="C'est le premier facteur de valeur d'un commerce, loin devant l'état ou la surface."
      />
      <div className="space-y-6">
        <Field label="Type d'environnement" required error={errors?.environnement}>
          <div className="grid gap-3 sm:grid-cols-2">
            {ENVIRONNEMENTS.map((o) => (
              <OptionCard
                key={o.value}
                selected={form.environnement === o.value}
                onClick={() => set({ environnement: o.value })}
                icon={o.icon}
                title={o.label}
                description={o.desc}
              />
            ))}
          </div>
        </Field>
        <Field label="Visibilité depuis la rue">
          <PillGroup
            value={form.visibilite}
            onChange={(v) => set({ visibilite: v })}
            options={NIVEAUX}
          />
        </Field>
        <Field label="Flux piéton">
          <PillGroup
            value={form.flux_pieton}
            onChange={(v) => set({ flux_pieton: v })}
            options={NIVEAUX}
          />
        </Field>
        <Field label="Flux automobile">
          <PillGroup
            value={form.flux_auto}
            onChange={(v) => set({ flux_auto: v })}
            options={NIVEAUX}
          />
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 4 — Accessibilité ============ */

const STATIONNEMENTS = ["Parking privé", "Parking public à proximité", "Stationnement en voirie"];
const TRANSPORTS = ["Gare", "Métro", "Tramway", "Bus"];
const LIVRAISON = ["Facile — aire de livraison", "Possible", "Difficile", "Impossible"];

export function LocalStep4({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Accessibilité"
        title="Comment accède-t-on au local ?"
        subtitle="Le stationnement et les livraisons conditionnent une bonne partie des activités possibles."
      />
      <div className="space-y-6">
        <Field label="Stationnement" hint="plusieurs choix possibles">
          <PillMulti
            values={form.stationnement}
            onToggle={(v) => set({ stationnement: toggleIn(form.stationnement, v) })}
            options={STATIONNEMENTS}
          />
        </Field>
        <Field label="Transports en commun à proximité">
          <PillMulti
            values={form.transports}
            onToggle={(v) => set({ transports: toggleIn(form.transports, v) })}
            options={TRANSPORTS}
          />
        </Field>
        <Field label="Accès livraison">
          <PillGroup
            value={form.acces_livraison}
            onChange={(v) => set({ acces_livraison: v })}
            options={LIVRAISON}
          />
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 5 — Données commerciales ============ */

const OCCUPATIONS = ["Libre", "Occupé — bail en cours"];
const BAUX = ["Bail 3/6/9", "Bail professionnel", "Bail précaire / dérogatoire", "Autre"];
const DUREES = ["Moins d'un an", "1 à 3 ans", "3 à 6 ans", "Plus de 6 ans"];

export function LocalStep5({ form, set, errors }: P) {
  const occupe = form.local_occupation === "Occupé — bail en cours";
  return (
    <div className="space-y-8">
      <StepHeader
        label="Données commerciales"
        title="Le local est-il loué ?"
        subtitle="Un local occupé s'évalue d'abord à son rendement : le loyer en place détermine le prix qu'un investisseur acceptera."
      />
      <div className="space-y-6">
        <Field label="Situation locative" required error={errors?.local_occupation}>
          <PillGroup
            value={form.local_occupation}
            onChange={(v) => set({ local_occupation: v })}
            options={OCCUPATIONS}
          />
        </Field>

        {occupe && (
          <>
            <SectionTitle>Le bail en cours</SectionTitle>
            <div className="grid gap-6 md:grid-cols-2">
              <Field
                label="Loyer annuel"
                hint="€ HT / HC — hors charges et hors taxes"
                required
                error={errors?.loyer_annuel}
              >
                <TextInput
                  type="number"
                  min={0}
                  value={form.loyer_annuel ?? ""}
                  onChange={(e) =>
                    set({ loyer_annuel: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="24000"
                />
              </Field>
              <Field label="Charges annuelles" hint="€">
                <TextInput
                  type="number"
                  min={0}
                  value={form.charges_annuelles ?? ""}
                  onChange={(e) =>
                    set({ charges_annuelles: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="2400"
                />
              </Field>
            </div>
            <Field label="Type de bail">
              <PillGroup
                value={form.bail_commercial_type}
                onChange={(v) => set({ bail_commercial_type: v })}
                options={BAUX}
              />
            </Field>
            <Field label="Durée restante du bail">
              <PillGroup
                value={form.bail_duree_restante}
                onChange={(v) => set({ bail_duree_restante: v })}
                options={DUREES}
              />
            </Field>
            <Field label="Activité actuelle du locataire">
              <TextInput
                value={form.activite_actuelle ?? ""}
                onChange={(e) => set({ activite_actuelle: e.target.value })}
                placeholder="Boulangerie, agence immobilière…"
              />
            </Field>
          </>
        )}

        <SectionTitle>Charges du propriétaire</SectionTitle>
        <Field label="Taxe foncière annuelle" hint="€">
          <TextInput
            type="number"
            min={0}
            value={form.taxe_fonciere ?? ""}
            onChange={(e) => set({ taxe_fonciere: e.target.value ? Number(e.target.value) : null })}
            placeholder="1800"
          />
        </Field>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 6 — État du local ============ */

const ETATS: { v: EtatGeneral; i: string; t: string; d: string }[] = [
  {
    v: "excellent",
    i: "✨",
    t: "Excellent — exploitable immédiatement",
    d: "Aménagé et conforme, un repreneur peut ouvrir sans travaux.",
  },
  {
    v: "bon",
    i: "👍",
    t: "Bon état",
    d: "Fonctionnel, quelques rafraîchissements de décoration à prévoir.",
  },
  {
    v: "moyen",
    i: "🔧",
    t: "État moyen — travaux à prévoir",
    d: "Mise aux normes ou réaménagement nécessaire avant exploitation.",
  },
  {
    v: "a_renover",
    i: "🏚",
    t: "À rénover entièrement",
    d: "Local brut ou vétuste : électricité, sanitaires et devanture à reprendre.",
  },
];

const ETATS_TECHNIQUES = ["Neuf / refait", "Correct", "Vétuste", "À reprendre entièrement"];
const COMMODITES: { v: string; i: string; l: string; d: string }[] = [
  { v: "sanitaires", i: "🚻", l: "Sanitaires", d: "Obligatoires pour un ERP recevant du public" },
  { v: "cuisine", i: "🍳", l: "Cuisine équipée", d: "Point d'eau et raccordements en place" },
  { v: "fibre", i: "🌐", l: "Fibre optique", d: "Raccordement effectif du local" },
];

export function LocalStep6({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="État du local"
        title="Dans quel état se trouve le local ?"
        subtitle="Un local aux normes et exploitable tout de suite se vend nettement plus cher qu'un local à reprendre."
      />
      <div className="space-y-6">
        <Field label="État général" required error={errors?.etat}>
          <div className="grid gap-3">
            {ETATS.map((o) => (
              <OptionCard
                key={o.v}
                selected={form.etat === o.v}
                onClick={() => set({ etat: o.v })}
                icon={o.i}
                title={o.t}
                description={o.d}
              />
            ))}
          </div>
        </Field>
        <Field label="État de l'électricité">
          <PillGroup
            value={form.etat_electricite}
            onChange={(v) => set({ etat_electricite: v })}
            options={ETATS_TECHNIQUES}
          />
        </Field>
        <Field label="État de la vitrine / devanture">
          <PillGroup
            value={form.etat_vitrine}
            onChange={(v) => set({ etat_vitrine: v })}
            options={ETATS_TECHNIQUES}
          />
        </Field>
        <SectionTitle>Diagnostic de performance énergétique</SectionTitle>
        <p className="text-sm text-sub">
          Le DPE est obligatoire à la vente d'un local commercial comme d'un logement. Sur du
          tertiaire, il conditionne aussi les obligations du décret tertiaire.
        </p>
        <Field label="Étiquette énergie (DPE)">
          <DpeRow value={form.dpe} onChange={(v) => set({ dpe: v })} />
        </Field>
        <Field label="Étiquette GES">
          <DpeRow value={form.ges} onChange={(v) => set({ ges: v })} />
        </Field>
        <Field label="Type de chauffage">
          <PillGroup
            value={form.chauffage}
            onChange={(v) => set({ chauffage: v })}
            options={CHAUFFAGE_OPTS}
          />
        </Field>

        <SectionTitle>Commodités présentes</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMMODITES.map((o) => (
            <ToggleCard
              key={o.v}
              selected={form.local_commodites.includes(o.v)}
              onClick={() => set({ local_commodites: toggleIn(form.local_commodites, o.v) })}
              icon={o.i}
              title={o.l}
              desc={o.d}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 7 — Potentiel ============ */

const POTENTIEL: { v: string; i: string; l: string; d: string }[] = [
  { v: "divisible", i: "✂️", l: "Local divisible", d: "Deux cellules plus petites, plus liquides" },
  { v: "reunifiable", i: "🔗", l: "Réunifiable", d: "Regroupable avec le local voisin" },
  {
    v: "changement_destination",
    i: "🔄",
    l: "Changement de destination possible",
    d: "Autorisé par le PLU",
  },
  { v: "terrasse", i: "☀️", l: "Terrasse", d: "Autorisation d'occupation du domaine public" },
  {
    v: "extraction_possible",
    i: "💨",
    l: "Extraction réalisable",
    d: "Ouvre l'activité restauration",
  },
  { v: "erp", i: "🏛", l: "Classé ERP", d: "Recevant du public, conforme" },
  {
    v: "pmr_conforme",
    i: "♿",
    l: "Conforme PMR",
    d: "Accessibilité en règle, pas de mise aux normes",
  },
  { v: "enseigne", i: "🪧", l: "Autorisation d'enseigne", d: "Enseigne déclarée et autorisée" },
];

const TRANSFORMATIONS = [
  "Bureaux",
  "Commerce",
  "Médical",
  "Restauration",
  "Coworking",
  "Habitation (si autorisé)",
];

export function LocalStep7({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Potentiel"
        title="Que peut-on faire du local ?"
        subtitle="Plus les usages possibles sont nombreux, plus la clientèle d'acquéreurs est large — et le prix élevé."
      />
      <div className="space-y-6">
        <SectionTitle>Atouts et autorisations</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {POTENTIEL.map((o) => (
            <ToggleCard
              key={o.v}
              selected={form.local_potentiel.includes(o.v)}
              onClick={() => set({ local_potentiel: toggleIn(form.local_potentiel, o.v) })}
              icon={o.i}
              title={o.l}
              desc={o.d}
            />
          ))}
        </div>
        <SectionTitle>Transformations envisageables</SectionTitle>
        <Field label="Le local pourrait accueillir" hint="plusieurs choix possibles">
          <PillMulti
            values={form.potentiel_transformation}
            onToggle={(v) =>
              set({ potentiel_transformation: toggleIn(form.potentiel_transformation, v) })
            }
            options={TRANSFORMATIONS}
          />
        </Field>
      </div>
    </div>
  );
}
