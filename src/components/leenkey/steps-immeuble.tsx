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
import type { DpeLetter, LeenkeyForm, Lot } from "./types";
import {
  ANNEXES,
  CHARGES_POSTES,
  POSTES_TECHNIQUES,
  statsLocatives,
  syncLots,
  totalCharges,
  TYPOLOGIES,
} from "./immeuble-calc";

/* ------------------------------------------------------------------ */
/* Parcours dédié au type "immeuble".                                  */
/* Un immeuble de rapport ne se décrit pas comme un logement : il se    */
/* décrit lot par lot, et se valorise à son revenu net.                */
/* ------------------------------------------------------------------ */

function toggleIn(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ============ ÉTAPE 1 — Identification ============ */

const IMMEUBLE_TYPES: { value: string; icon: string; label: string; desc: string }[] = [
  {
    value: "rapport",
    icon: "🏘",
    label: "Immeuble de rapport",
    desc: "Entièrement composé de logements loués",
  },
  {
    value: "mixte",
    icon: "🏢",
    label: "Immeuble mixte",
    desc: "Commerces en pied d'immeuble, logements au-dessus",
  },
  {
    value: "commercial",
    icon: "🏬",
    label: "Immeuble commercial",
    desc: "Exclusivement des locaux commerciaux",
  },
  { value: "bureaux", icon: "💼", label: "Immeuble de bureaux", desc: "Tertiaire" },
  {
    value: "petit_collectif",
    icon: "🏠",
    label: "Petit collectif",
    desc: "2 à 6 logements, souvent une maison divisée",
  },
  { value: "autre", icon: "🏗", label: "Autre", desc: "Autre configuration" },
];

const ANNEES = [
  "Avant 1900",
  "1900-1948",
  "1949-1974",
  "1975-1990",
  "1991-2005",
  "2006-2020",
  "Après 2020",
];

export function ImmeubleStep1({ form, set, errors }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="L'immeuble"
        title="Parlez-nous de votre immeuble"
        subtitle="La composition et les surfaces posent la base du calcul de rendement."
      />
      <div className="space-y-6">
        <Field label="Type d'immeuble" required error={errors?.immeuble_type}>
          <div className="grid gap-3 sm:grid-cols-2">
            {IMMEUBLE_TYPES.map((o) => (
              <OptionCard
                key={o.value}
                selected={form.immeuble_type === o.value}
                onClick={() => set({ immeuble_type: o.value })}
                icon={o.icon}
                title={o.label}
                description={o.desc}
              />
            ))}
          </div>
        </Field>

        <Field label="Année de construction">
          <PillGroup
            value={form.annee_construction}
            onChange={(v) => set({ annee_construction: v })}
            options={ANNEES}
          />
        </Field>

        <Field label="Nombre de niveaux" hint="rez-de-chaussée compris">
          <Stepper
            value={form.immeuble_niveaux}
            onChange={(v) => set({ immeuble_niveaux: v })}
            options={[1, 2, 3, 4, 5, 6, 7, "8+"]}
          />
        </Field>

        <SectionTitle>Surfaces</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            label="Surface totale"
            hint="m² — plancher, tous niveaux"
            required
            error={errors?.surface_totale_immeuble}
          >
            <TextInput
              type="number"
              min={1}
              value={form.surface_totale_immeuble ?? ""}
              onChange={(e) =>
                set({
                  surface_totale_immeuble: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="450"
            />
          </Field>
          <Field label="Surface habitable" hint="m² — hors commerces et communs">
            <TextInput
              type="number"
              min={0}
              value={form.surface_habitable_immeuble ?? ""}
              onChange={(e) =>
                set({
                  surface_habitable_immeuble: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="360"
            />
          </Field>
          <Field label="Surface commerciale" hint="m²">
            <TextInput
              type="number"
              min={0}
              value={form.surface_commerciale ?? ""}
              onChange={(e) =>
                set({ surface_commerciale: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="60"
            />
          </Field>
          <Field label="Parties communes" hint="m²">
            <TextInput
              type="number"
              min={0}
              value={form.surface_communs ?? ""}
              onChange={(e) =>
                set({ surface_communs: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="30"
            />
          </Field>
          <Field label="Surface du terrain" hint="m² — 0 si aucun">
            <TextInput
              type="number"
              min={0}
              value={form.surface_terrain ?? ""}
              onChange={(e) =>
                set({ surface_terrain: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="200"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 2 — Composition ============ */

export function ImmeubleStep2({ form, set, errors }: P) {
  const compte = (t: string) => form.lots.filter((l) => l.typologie === t).length;
  const stats = statsLocatives(form.lots);

  const setStatut = (id: string, statut: Lot["statut"]) =>
    set({ lots: form.lots.map((l) => (l.id === id ? { ...l, statut } : l)) });

  return (
    <div className="space-y-8">
      <StepHeader
        label="Composition"
        title="Comment l'immeuble est-il découpé ?"
        subtitle="Indiquez le nombre de lots par typologie, puis précisez lesquels sont occupés."
      />
      <div className="space-y-6">
        <div className={errors?.lots ? "lk-field lk-field-error" : "lk-field"}>
          <div className="space-y-5">
            {TYPOLOGIES.map((t) => (
              <Field key={t} label={t}>
                <Stepper
                  value={compte(t)}
                  onChange={(v) => set({ lots: syncLots(form.lots, t, v) })}
                  options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "10+"]}
                />
              </Field>
            ))}
          </div>
          {errors?.lots && (
            <p className="mt-3 text-xs font-medium text-destructive">{errors.lots}</p>
          )}
        </div>

        {form.lots.length > 0 && (
          <>
            <SectionTitle>Occupation de chaque lot</SectionTitle>
            <p className="text-sm text-sub">
              {stats.nbLots} lot{stats.nbLots > 1 ? "s" : ""} · {stats.nbOccupes} occupé
              {stats.nbOccupes > 1 ? "s" : ""} · taux d'occupation {stats.tauxOccupation} %
            </p>
            <div className="space-y-2">
              {form.lots.map((lot, i) => (
                <div
                  key={lot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border-2 border-border bg-card px-4 py-3"
                >
                  <span className="font-display text-sm font-semibold text-navy">
                    {lot.typologie} n°
                    {form.lots.slice(0, i + 1).filter((l) => l.typologie === lot.typologie).length}
                  </span>
                  <div className="flex gap-2">
                    {(["occupe", "libre"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatut(lot.id, s)}
                        className={
                          "rounded-full border-2 px-4 py-1.5 text-sm font-medium transition " +
                          (lot.statut === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-navy hover:border-primary/60")
                        }
                      >
                        {s === "occupe" ? "Occupé" : "Libre"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============ ÉTAPE 3 — Situation locative ============ */

const DUREES = ["Moins d'un an", "1 à 3 ans", "3 à 6 ans", "Plus de 6 ans"];
const DPE_CHOIX: DpeLetter[] = ["A", "B", "C", "D", "E", "F", "G", "inconnu"];

export function ImmeubleStep3({ form, set }: P) {
  const stats = statsLocatives(form.lots);
  const maj = (id: string, patch: Partial<Lot>) =>
    set({ lots: form.lots.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  if (form.lots.length === 0) {
    return (
      <div className="space-y-8">
        <StepHeader
          label="Situation locative"
          title="Détail des lots"
          subtitle="Revenez à l'étape précédente pour déclarer les lots de l'immeuble."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StepHeader
        label="Situation locative"
        title="Quels sont les revenus de l'immeuble ?"
        subtitle="C'est le revenu net qui fixe le prix d'un immeuble de rapport — bien plus que la surface."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Revenus annuels", v: `${stats.revenusAnnuels.toLocaleString("fr-FR")} €` },
          { l: "Taux d'occupation", v: `${stats.tauxOccupation} %` },
          { l: "Loyer moyen", v: `${stats.loyerMoyen.toLocaleString("fr-FR")} €/mois` },
          { l: "Loyer au m²", v: stats.loyerM2 ? `${stats.loyerM2} €/m²` : "—" },
        ].map((s) => (
          <div key={s.l} className="rounded-[12px] border-2 border-sky-mid bg-sky/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-sub">{s.l}</div>
            <div className="mt-1 font-display text-xl font-bold text-navy">{s.v}</div>
          </div>
        ))}
      </div>
      {stats.tauxOccupation < 100 && (
        <p className="rounded-[10px] border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {100 - stats.tauxOccupation} % de vacance. Un acquéreur y verra soit un risque, soit un
          potentiel de revalorisation — les lots libres sont ceux qu'il faut savoir expliquer.
        </p>
      )}

      <div className="space-y-4">
        {form.lots.map((lot, i) => {
          const annexe = ANNEXES.has(lot.typologie);
          const rang = form.lots
            .slice(0, i + 1)
            .filter((l) => l.typologie === lot.typologie).length;
          return (
            <div key={lot.id} className="rounded-[14px] border-2 border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-base font-semibold text-navy">
                  {lot.typologie} n°{rang}
                </span>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-semibold " +
                    (lot.statut === "occupe"
                      ? "bg-success/15 text-success"
                      : "bg-amber-100 text-amber-700")
                  }
                >
                  {lot.statut === "occupe" ? "Occupé" : "Libre"}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Surface" hint="m²">
                  <TextInput
                    type="number"
                    min={0}
                    value={lot.surface ?? ""}
                    onChange={(e) =>
                      maj(lot.id, { surface: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </Field>
                <Field label="Loyer hors charges" hint="€ / mois">
                  <TextInput
                    type="number"
                    min={0}
                    value={lot.loyer_hc ?? ""}
                    onChange={(e) =>
                      maj(lot.id, { loyer_hc: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </Field>
                {lot.statut === "occupe" && (
                  <>
                    <Field label="Charges" hint="€ / mois">
                      <TextInput
                        type="number"
                        min={0}
                        value={lot.charges ?? ""}
                        onChange={(e) =>
                          maj(lot.id, { charges: e.target.value ? Number(e.target.value) : null })
                        }
                      />
                    </Field>
                    <Field label="Date de début du bail">
                      <TextInput
                        type="date"
                        value={lot.bail_debut}
                        onChange={(e) => maj(lot.id, { bail_debut: e.target.value })}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Durée restante du bail">
                        <PillGroup
                          value={lot.bail_duree_restante}
                          onChange={(v) => maj(lot.id, { bail_duree_restante: v })}
                          options={DUREES}
                        />
                      </Field>
                    </div>
                  </>
                )}
                {!annexe && (
                  <div className="md:col-span-2">
                    <Field label="DPE du lot">
                      <PillGroup
                        value={lot.dpe}
                        onChange={(v) => maj(lot.id, { dpe: v as DpeLetter })}
                        options={DPE_CHOIX.map((d) => (d === "inconnu" ? "Je ne sais pas" : d))}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ ÉTAPE 4 — Charges ============ */

export function ImmeubleStep4({ form, set }: P) {
  const total = totalCharges(form);
  const stats = statsLocatives(form.lots);
  const net = stats.revenusAnnuels - total;

  return (
    <div className="space-y-8">
      <StepHeader
        label="Charges"
        title="Quelles charges supportez-vous ?"
        subtitle="Ce sont elles qui transforment un revenu brut en revenu net — la seule base sur laquelle un investisseur calcule."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {CHARGES_POSTES.map((c) => (
          <Field key={String(c.key)} label={c.label} hint={c.hint}>
            <TextInput
              type="number"
              min={0}
              value={(form[c.key] as number | null) ?? ""}
              onChange={(e) => set({ [c.key]: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        ))}
      </div>

      <div className="rounded-[14px] border-2 border-sky-mid bg-sky/40 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sub">
              Revenus bruts
            </div>
            <div className="mt-1 font-display text-xl font-bold text-navy">
              {stats.revenusAnnuels.toLocaleString("fr-FR")} €
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sub">
              Charges annuelles
            </div>
            <div className="mt-1 font-display text-xl font-bold text-navy">
              −{total.toLocaleString("fr-FR")} €
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Revenu net
            </div>
            <div className="mt-1 font-display text-xl font-bold text-primary">
              {net.toLocaleString("fr-FR")} €
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ ÉTAPE 5 — État technique ============ */

const ETATS_POSTE = ["Bon", "Moyen", "À refaire"];

export function ImmeubleStep5({ form, set }: P) {
  const majPoste = (poste: string, valeur: string) =>
    set({ etat_technique: { ...form.etat_technique, [poste]: valeur } });

  return (
    <div className="space-y-8">
      <StepHeader
        label="État technique"
        title="Dans quel état est l'immeuble ?"
        subtitle="Toiture et façade sont les deux postes qui pèsent le plus lourd : un acquéreur en déduit le coût de son offre."
      />
      <div className="space-y-5">
        {POSTES_TECHNIQUES.map((poste) => (
          <Field key={poste} label={poste}>
            <PillGroup
              value={form.etat_technique[poste] ?? null}
              onChange={(v) => majPoste(poste, v)}
              options={ETATS_POSTE}
            />
          </Field>
        ))}
      </div>
      <SectionTitle>Travaux récents réalisés</SectionTitle>
      <Field label="Postes repris depuis moins de 10 ans" hint="plusieurs choix possibles">
        <PillMulti
          values={form.travaux_recents}
          onToggle={(v) => set({ travaux_recents: toggleIn(form.travaux_recents, v) })}
          options={POSTES_TECHNIQUES}
        />
      </Field>
    </div>
  );
}

/* ============ ÉTAPE 6 — Potentiel de développement ============ */

const POTENTIEL: { v: string; i: string; l: string; d: string }[] = [
  {
    v: "division",
    i: "✂️",
    l: "Division de lots",
    d: "Découper les grands logements augmente le rendement",
  },
  { v: "surelevation", i: "⬆️", l: "Surélévation", d: "Ajouter un niveau si le PLU l'autorise" },
  { v: "extension", i: "➕", l: "Extension", d: "Agrandissement du bâti existant" },
  {
    v: "construction_arriere",
    i: "🏗",
    l: "Construction en fond de parcelle",
    d: "Bâtiment supplémentaire",
  },
  {
    v: "nouveaux_lots",
    i: "🔑",
    l: "Création de nouveaux lots",
    d: "À partir des volumes existants",
  },
  { v: "combles", i: "🪜", l: "Combles aménageables", d: "Surface à gagner sous toiture" },
  { v: "sous_sol", i: "🕳", l: "Sous-sol exploitable", d: "Caves transformables ou louables" },
  {
    v: "changement_destination",
    i: "🔄",
    l: "Changement de destination",
    d: "Bureaux en logements, ou l'inverse",
  },
  {
    v: "commercial_transformable",
    i: "🏬",
    l: "Local commercial transformable",
    d: "En logement si le PLU le permet",
  },
];

export function ImmeubleStep6({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Potentiel"
        title="Que peut-on encore tirer de l'immeuble ?"
        subtitle="Le potentiel de développement est ce qui distingue un immeuble de rapport banal d'un actif recherché par les investisseurs."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {POTENTIEL.map((o) => (
          <ToggleCard
            key={o.v}
            selected={form.potentiel_developpement.includes(o.v)}
            onClick={() =>
              set({ potentiel_developpement: toggleIn(form.potentiel_developpement, o.v) })
            }
            icon={o.i}
            title={o.l}
            desc={o.d}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-sub">
        <input
          type="checkbox"
          checked={form.potentiel_developpement.length === 0}
          onChange={() => set({ potentiel_developpement: [] })}
          className="h-4 w-4 accent-primary"
        />
        Aucun potentiel identifié
      </label>
    </div>
  );
}

/* ============ ÉTAPE 7 — Urbanisme ============ */

const ZONAGES = [
  "U — zone urbaine",
  "AU — à urbaniser",
  "A — agricole",
  "N — naturelle",
  "Je ne sais pas",
];
const STATIONNEMENT_PLU = [
  "Aucune obligation",
  "1 place par logement",
  "2 places par logement",
  "Je ne sais pas",
];
const SERVITUDES = [
  "Droit de passage",
  "Mitoyenneté",
  "Vue / jour de souffrance",
  "Réseau enterré",
  "Alignement",
];
const RISQUES = [
  "Inondation",
  "Retrait-gonflement des argiles",
  "Sismique",
  "Technologique (PPRT)",
  "Minier",
  "Aucun",
];

export function ImmeubleStep7({ form, set }: P) {
  return (
    <div className="space-y-8">
      <StepHeader
        label="Urbanisme"
        title="Que dit le PLU sur votre parcelle ?"
        subtitle="Ces règles conditionnent tout le potentiel de développement. Si vous ne les connaissez pas, laissez vide : elles se vérifient en mairie."
      />
      <div className="space-y-6">
        <Field label="Zonage PLU">
          <PillGroup
            value={form.urba_zonage}
            onChange={(v) => set({ urba_zonage: v })}
            options={ZONAGES}
          />
        </Field>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Hauteur autorisée" hint="mètres au faîtage">
            <TextInput
              type="number"
              min={0}
              value={form.urba_hauteur ?? ""}
              onChange={(e) =>
                set({ urba_hauteur: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="15"
            />
          </Field>
          <Field label="Emprise au sol autorisée" hint="% de la parcelle">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={form.urba_emprise ?? ""}
              onChange={(e) =>
                set({ urba_emprise: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="60"
            />
          </Field>
        </div>
        <Field label="Obligation de stationnement">
          <PillGroup
            value={form.urba_stationnement}
            onChange={(v) => set({ urba_stationnement: v })}
            options={STATIONNEMENT_PLU}
          />
        </Field>
        <Field label="Servitudes" hint="plusieurs choix possibles">
          <PillMulti
            values={form.urba_servitudes}
            onToggle={(v) => set({ urba_servitudes: toggleIn(form.urba_servitudes, v) })}
            options={SERVITUDES}
          />
        </Field>
        <Field label="Risques identifiés">
          <PillMulti
            values={form.urba_risques}
            onToggle={(v) => set({ urba_risques: toggleIn(form.urba_risques, v) })}
            options={RISQUES}
          />
        </Field>
      </div>
    </div>
  );
}
