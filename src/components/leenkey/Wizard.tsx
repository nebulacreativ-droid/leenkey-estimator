import { useCallback, useEffect, useMemo, useState } from "react";
import { computeEstimation } from "./estimation";
import { getFlow } from "./flows";
import { statsLocatives, totalCharges } from "./immeuble-calc";
import { StepPositionContext } from "./step-position";
import { initialForm, type LeenkeyForm } from "./types";
import { EstimationDashboard } from "./Dashboard";
import { cn } from "@/lib/utils";

// Format des données DVF retournées par /api/dvf-comparables
export interface DvfComparable {
  date: string;
  prix: number;
  prixM2: number;
  surface: number;
  pieces: number;
  type: string;
  adresse: string;
  ville: string;
  monthsAgo: number;
}
export interface DvfResult {
  available: boolean;
  codePostal: string;
  nbComparables: number;
  stats: {
    prixM2Pondere: number;
    prixM2Median: number;
    prixM2Min: number;
    prixM2Max: number;
  };
  dateLaPlusRecente: string | null;
  comparables: DvfComparable[];
  disclaimer: string;
}

const STORAGE_KEY = "leenkey_form_v1";
const DASHBOARD_KEY = "leenkey_dashboard_v1";

type Errors = Partial<Record<keyof LeenkeyForm, string>>;

function buildPayload(form: LeenkeyForm) {
  return {
    meta: {
      source: "formulaire_leenkey",
      timestamp: new Date().toISOString(),
      session_id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
    },
    bien: {
      type: form.type,
      adresse: form.adresse,
      code_postal: form.code_postal,
      ville: form.ville,
      departement: form.departement,
      surface_habitable: form.surface_habitable,
      surface_terrain: form.surface_terrain,
      surface_carrez: form.surface_carrez,
      pieces: form.pieces,
      chambres: form.chambres,
      salles_bain: form.salles_bain,
      wc_separes: form.wc_separes,
      cuisine: form.cuisine,
      etage: form.etage,
      dernier_etage: form.dernier_etage,
      nb_etages_batiment: form.nb_etages_batiment,
      niveaux: form.niveaux,
    },
    ...(form.type === "terrain" && {
      terrain: {
        nature: form.terrain_type,
        constructible: form.constructible,
        zonage_plu: form.zonage_plu,
        emprise_sol_pct: form.emprise_sol,
        hauteur_autorisee_m: form.hauteur_autorisee,
        niveaux_autorises: form.niveaux_autorises,
        facade_m: form.facade,
        profondeur_m: form.profondeur,
        viabilisation: form.viabilisation,
        topographie: form.topographie,
        orientation: form.orientation,
        vue: form.vue,
        distances: form.distances,
        situation: form.situation_terrain,
        contraintes: form.contraintes_terrain,
        potentiel_foncier: form.potentiel_foncier,
      },
    }),
    ...(form.type === "local_commercial" && {
      local: {
        destination: form.local_type,
        surface_totale: form.surface_totale,
        surface_vente: form.surface_vente,
        surface_reserve: form.surface_reserve,
        configuration: form.local_config,
        equipements: form.local_equipements,
        longueur_vitrine_m: form.longueur_vitrine,
        hauteur_plafond_m: form.hauteur_plafond,
        nb_acces: form.nb_acces,
        environnement: form.environnement,
        visibilite: form.visibilite,
        flux_pieton: form.flux_pieton,
        flux_auto: form.flux_auto,
        stationnement: form.stationnement,
        transports: form.transports,
        acces_livraison: form.acces_livraison,
        occupation: form.local_occupation,
        loyer_annuel: form.loyer_annuel,
        charges_annuelles: form.charges_annuelles,
        taxe_fonciere: form.taxe_fonciere,
        bail_type: form.bail_commercial_type,
        bail_duree_restante: form.bail_duree_restante,
        activite_actuelle: form.activite_actuelle,
        etat_electricite: form.etat_electricite,
        etat_vitrine: form.etat_vitrine,
        commodites: form.local_commodites,
        potentiel: form.local_potentiel,
        transformations_possibles: form.potentiel_transformation,
      },
    }),
    ...(form.type === "immeuble" && {
      immeuble: {
        nature: form.immeuble_type,
        annee_construction: form.annee_construction,
        niveaux: form.immeuble_niveaux,
        surface_totale: form.surface_totale_immeuble,
        surface_habitable: form.surface_habitable_immeuble,
        surface_commerciale: form.surface_commerciale,
        surface_communs: form.surface_communs,
        surface_terrain: form.surface_terrain,
        lots: form.lots,
        stats_locatives: statsLocatives(form.lots),
        charges_annuelles: {
          taxe_fonciere: form.charge_taxe_fonciere,
          assurance: form.charge_assurance,
          entretien: form.charge_entretien,
          electricite_communs: form.charge_electricite_communs,
          eau: form.charge_eau,
          syndic: form.charge_syndic,
          maintenance: form.charge_maintenance,
          autres: form.charge_autres,
          total: totalCharges(form),
        },
        etat_technique: form.etat_technique,
        travaux_recents: form.travaux_recents,
        potentiel_developpement: form.potentiel_developpement,
        urbanisme: {
          zonage: form.urba_zonage,
          hauteur_autorisee_m: form.urba_hauteur,
          emprise_sol_pct: form.urba_emprise,
          stationnement: form.urba_stationnement,
          servitudes: form.urba_servitudes,
          risques: form.urba_risques,
        },
      },
    }),
    ...(form.type === "atypique" && {
      atypique: {
        nature: form.atypique_type,
        epoque: form.annee_construction,
        surface_habitable: form.surface_habitable,
        surface_dependances: form.surface_dependances,
        surface_terrain: form.surface_terrain,
        nb_batiments: form.nb_batiments,
        classement: form.classement,
        caracteres_exceptionnels: form.caracteres_exceptionnels,
        etat_technique: form.etat_technique,
        travaux_recents: form.travaux_recents,
        travaux_budget: form.travaux_budget,
        cadre: form.cadre,
        calme: form.calme,
        qualite_paysagere: form.qualite_paysagere,
        attractivite_touristique: form.attractivite_touristique,
        distances: form.distances,
        potentiel: form.potentiel_atypique,
        contraintes: form.contraintes_atypique,
        finances: {
          cout_entretien_annuel: form.cout_entretien_annuel,
          taxe_fonciere: form.taxe_fonciere,
          revenus_existants: form.revenus_existants,
          autres_charges: form.charges_atypique,
        },
      },
    }),
    exterieur: form.exterieur,
    etat: { general: form.etat, prestations: form.prestations },
    energie: {
      dpe: form.dpe,
      ges: form.ges,
      chauffage: form.chauffage,
      chauffage_mode: form.chauffage_mode,
      eau_chaude: form.eau_chaude,
      annee_construction: form.annee_construction,
      derniere_renovation_energetique: form.derniere_renovation,
    },
    situation: {
      proprietaire: form.proprietaire,
      occupation: form.occupation,
      bail_expiration: form.bail_expiration,
      bail_type: form.bail_type,
      contraintes: form.contraintes,
      charges_copro_mensuelles: form.charges_copro,
      procedure_copro: form.procedure_copro,
    },
    projet: {
      raison_vente: form.raison_vente,
      delai: form.delai,
      estimation_prealable: form.estimation_prealable,
      prix_estime_prealable: form.prix_estime_prealable,
      prix_souhaite: form.prix_souhaite,
      acheteur_identifie: form.acheteur_identifie,
      projet_achat_simultane: form.projet_achat_simultane,
      bien_achat_trouve: form.bien_achat_trouve,
    },
    contact: {
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      source: form.source,
      disponibilites: form.disponibilites,
      rgpd: form.rgpd,
      newsletter: form.newsletter,
      contact_conseiller: form.contact_conseiller,
    },
  };
}

export function LeenkeyWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<LeenkeyForm>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [hydrated, setHydrated] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [submitted, setSubmitted] = useState<null | {
    ref: string;
    aiAnalyse?: string;
    dvfData?: DvfResult | null;
  }>(null);
  const [submitting, setSubmitting] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    try {
      // 1. Restore dashboard if exists (priorité — F5 sur la page résultat)
      const dashRaw = localStorage.getItem(DASHBOARD_KEY);
      if (dashRaw) {
        const dash = JSON.parse(dashRaw) as {
          form: LeenkeyForm;
          submitted: { ref: string; aiAnalyse?: string; dvfData?: DvfResult | null };
        };
        if (dash.form && dash.submitted) {
          setForm(dash.form);
          setSubmitted(dash.submitted);
          setHydrated(true);
          return;
        }
      }
      // 2. Sinon, restore form en cours de saisie
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form: LeenkeyForm; step: number };
        if (saved.step > 1) {
          setResumePrompt(true);
          setForm(saved.form);
          setStep(saved.step);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // persist dashboard state when submitted (pour resister à F5)
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (submitted) {
        localStorage.setItem(DASHBOARD_KEY, JSON.stringify({ form, submitted }));
      } else {
        localStorage.removeItem(DASHBOARD_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [submitted, form, hydrated]);

  // persist
  useEffect(() => {
    if (!hydrated || submitted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step }));
    } catch {
      /* ignore */
    }
  }, [form, step, hydrated, submitted]);

  const set = useCallback((patch: Partial<LeenkeyForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors({});
  }, []);

  // Le parcours dépend du type de bien : un terrain n'a pas les mêmes étapes
  // qu'un appartement. Il est donc recalculé dès que le type change.
  const flow = useMemo(() => getFlow(form.type), [form.type]);
  const TOTAL = flow.length;
  const current = flow[step - 1];

  // Un parcours plus court que l'étape restaurée (changement de type, ancien
  // brouillon en localStorage) laisserait le wizard sur une étape inexistante.
  useEffect(() => {
    if (step > TOTAL) setStep(TOTAL);
  }, [step, TOTAL]);

  const progress = useMemo(() => Math.round((step / TOTAL) * 100), [step, TOTAL]);
  const stepPosition = useMemo(() => ({ step, total: TOTAL }), [step, TOTAL]);

  const next = () => {
    const e = current?.validate?.(form) ?? {};
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Scroll vers le 1er champ en erreur (après le render)
      requestAnimationFrame(() => {
        setTimeout(() => {
          const firstErrorEl = document.querySelector(".lk-field-error");
          if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
            // Focus l'input à l'intérieur si possible
            const input = firstErrorEl.querySelector<HTMLElement>(
              "input, select, textarea, button[role='combobox']",
            );
            if (input && typeof input.focus === "function") {
              input.focus({ preventScroll: true });
            }
          }
        }, 50);
      });
      return;
    }
    if (step < TOTAL) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    } else {
      submit();
    }
  };

  const back = () => {
    if (step > 1) {
      setStep(step - 1);
      // Scroll en haut absolu avec un léger offset négatif pour compenser le sticky header
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      // Double sécurité après le re-render
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  };

  const submit = async () => {
    setSubmitting(true);

    // Les DVF d'abord : ils entrent dans le calcul de l'estimation, qui doit
    // être arrêtée avant d'appeler Claude. Les deux appels étaient parallèles,
    // ce qui obligeait Claude à produire son propre prix — d'où deux chiffres
    // différents entre l'écran et les emails.
    const dvfResult = (await fetch("/api/dvf-comparables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codePostal: form.code_postal,
        ville: form.ville,
        type: form.type,
        // Appartement : l'habitable peut être vide, la Carrez fait foi.
        // Local commercial : c'est la surface totale qui sert de référence.
        surface:
          form.surface_habitable ??
          form.surface_carrez ??
          form.surface_totale ??
          form.surface_totale_immeuble,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as DvfResult | null;

    // Chiffre unique de référence : c'est lui qui s'affiche à l'écran, dans le
    // PDF et dans les emails. Le Dashboard le recalcule à l'identique — le
    // modèle est déterministe, mêmes entrées, même sortie.
    const dvfPrixM2 = dvfResult?.available ? dvfResult.stats.prixM2Pondere : null;
    const estimation = computeEstimation(form, dvfPrixM2);

    const payload = {
      ...buildPayload(form),
      estimation: {
        prix_estime: estimation.prixEstime,
        prix_bas: estimation.prixBas,
        prix_haut: estimation.prixHaut,
        prix_m2: estimation.prixM2,
        prix_m2_marche: estimation.prixM2Marche,
        delta_marche: estimation.deltaMarche,
        surface: estimation.surface,
        delai_vente: estimation.delaiVente,
        tension_marche: estimation.tensionMarche,
        fiabilite: estimation.fiabilite,
        score_attractivite: estimation.scoreAttractivite,
        facteurs: estimation.facteurs,
      },
      comparables_dvf: dvfResult?.available
        ? {
            nb: dvfResult.nbComparables,
            prix_m2_median: dvfResult.stats.prixM2Median,
            prix_m2_pondere: dvfResult.stats.prixM2Pondere,
            prix_m2_min: dvfResult.stats.prixM2Min,
            prix_m2_max: dvfResult.stats.prixM2Max,
          }
        : null,
    };

    const estimateResult = (await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as { ref?: string; analyse?: string } | null;

    const ref =
      estimateResult?.ref ??
      `EST-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const aiAnalyse = estimateResult?.analyse;

    setSubmitted({ ref, aiAnalyse, dvfData: dvfResult });

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  };

  const restart = () => {
    setForm(initialForm);
    setStep(1);
    setSubmitted(null);
    setErrors({});
    // Vide tous les storages pour repartir de zéro
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DASHBOARD_KEY);
    } catch {
      /* ignore */
    }
  };

  if (submitted)
    return (
      <EstimationDashboard
        form={form}
        ref_={submitted.ref}
        aiAnalyse={submitted.aiAnalyse}
        dvfData={submitted.dvfData}
        onRestart={restart}
      />
    );

  const StepNode = current?.render({ form, set, errors }) ?? null;

  const firstError = Object.values(errors)[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-20 z-30 border-b border-border bg-background/95 backdrop-blur">
        {/* Progress (logo retiré : déjà dans la navbar au-dessus) */}
        <div className="mx-auto max-w-5xl px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-sub">
            <span className="font-display font-semibold text-navy">{current?.label}</span>
            <span>
              Étape {step} sur {TOTAL} · {progress}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sky-mid">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Resume prompt */}
      {resumePrompt && (
        <div className="mx-auto mt-4 max-w-3xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border-2 border-sky-mid bg-sky/60 p-4 text-sm">
            <span className="text-navy">
              👋 Nous avons retrouvé votre formulaire en cours. Voulez-vous reprendre ?
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setResumePrompt(false)}
                className="rounded-[8px] bg-primary px-4 py-2 font-semibold text-primary-foreground"
              >
                Reprendre
              </button>
              <button
                onClick={() => {
                  setForm(initialForm);
                  setStep(1);
                  setResumePrompt(false);
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                  } catch {
                    /* ignore */
                  }
                }}
                className="rounded-[8px] border-2 border-border bg-card px-4 py-2 font-semibold text-navy"
              >
                Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <main className="mx-auto max-w-3xl px-5 pb-32 pt-10">
        <StepPositionContext.Provider value={stepPosition}>
          <div key={step} className="step-enter">
            {StepNode}
          </div>
        </StepPositionContext.Provider>
        {firstError && (
          <p className="mt-6 rounded-[10px] border-2 border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {firstError}
          </p>
        )}
      </main>

      {/* Footer nav */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className={cn(
              "rounded-[10px] px-5 py-3 font-display text-sm font-semibold transition",
              step === 1 ? "invisible" : "text-navy hover:bg-sky",
            )}
          >
            ← Retour
          </button>
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className={cn(
              "inline-flex min-w-[180px] items-center justify-center gap-2 rounded-[12px] bg-primary px-7 py-3.5 font-display text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-8px_rgba(17,86,252,0.5)] transition",
              "hover:translate-y-[-1px] hover:shadow-[0_14px_28px_-8px_rgba(17,86,252,0.6)]",
              submitting && "opacity-70",
            )}
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Envoi en cours…
              </>
            ) : step === TOTAL ? (
              "Voir ma valorisation →"
            ) : (
              "Continuer →"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
