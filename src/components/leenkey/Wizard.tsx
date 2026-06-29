import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "./steps";
import { initialForm, STEP_LABELS, type LeenkeyForm } from "./types";
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
const TOTAL = 12;

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
    exterieur: form.exterieur,
    etat: { general: form.etat, prestations: form.prestations },
    energie: {
      dpe: form.dpe,
      ges: form.ges,
      chauffage: form.chauffage,
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

function validateStep(step: number, f: LeenkeyForm): Errors {
  const e: Errors = {};
  switch (step) {
    case 1:
      if (!f.type) e.type = "Sélectionnez un type de bien";
      break;
    case 2:
      if (!f.adresse) e.adresse = "L'adresse est requise";
      break;
    case 3:
      if (f.type !== "terrain" && !f.surface_habitable)
        e.surface_habitable = "Surface requise";
      if ((f.type === "maison" || f.type === "terrain") && f.surface_terrain === null)
        e.surface_terrain = "Surface terrain requise (0 si aucun)";
      break;
    case 4:
      if (!f.pieces) e.pieces = "Requis";
      if (f.chambres === null) e.chambres = "Requis";
      if (f.salles_bain === null) e.salles_bain = "Requis";
      if (!f.cuisine) e.cuisine = "Requis";
      if (f.type === "appartement" && f.etage === null) e.etage = "Requis";
      if (f.type === "maison" && !f.niveaux) e.niveaux = "Requis";
      break;
    case 6:
      if (!f.etat) e.etat = "Sélectionnez un état";
      break;
    case 9:
      if (!f.proprietaire) e.proprietaire = "Requis";
      if (!f.occupation) e.occupation = "Requis";
      break;
    case 10:
      if (!f.delai) e.delai = "Requis";
      break;
    case 12:
      if (!f.prenom) e.prenom = "Prénom requis";
      if (!f.nom) e.nom = "Nom requis";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Email invalide";
      if (!/^(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(f.telephone.replace(/\s/g, "")))
        e.telephone = "Numéro français invalide";
      if (!f.rgpd) e.rgpd = "Vous devez accepter pour continuer";
      break;
  }
  return e;
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
        localStorage.setItem(
          DASHBOARD_KEY,
          JSON.stringify({ form, submitted })
        );
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

  const progress = useMemo(() => Math.round((step / TOTAL) * 100), [step]);

  const next = () => {
    const e = validateStep(step, form);
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
              "input, select, textarea, button[role='combobox']"
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
    const payload = buildPayload(form);

    // Lance les 2 APIs en parallèle (Claude estimate + DVF comparables)
    const estimatePromise = fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const dvfPromise = fetch("/api/dvf-comparables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codePostal: form.code_postal,
        ville: form.ville,
        type: form.type,
        surface: form.surface_habitable,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const [estimateResult, dvfResult] = await Promise.all([
      estimatePromise,
      dvfPromise,
    ]);

    const ref =
      (estimateResult as { ref?: string } | null)?.ref ??
      `EST-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const aiAnalyse = (estimateResult as { analyse?: string } | null)?.analyse;

    setSubmitted({
      ref,
      aiAnalyse,
      dvfData: dvfResult as DvfResult | null,
    });

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

  const StepNode = (() => {
    switch (step) {
      case 1:
        return <Step1 form={form} set={set} errors={errors} />;
      case 2:
        return <Step2 form={form} set={set} errors={errors} />;
      case 3:
        return <Step3 form={form} set={set} errors={errors} />;
      case 4:
        return <Step4 form={form} set={set} errors={errors} />;
      case 5:
        return <Step5 form={form} set={set} />;
      case 6:
        return <Step6 form={form} set={set} errors={errors} />;
      case 7:
        return <Step7 form={form} set={set} />;
      case 8:
        return <Step8 form={form} set={set} />;
      case 9:
        return <Step9 form={form} set={set} errors={errors} />;
      case 10:
        return <Step10 form={form} set={set} errors={errors} />;
      case 11:
        return <Step11 form={form} set={set} />;
      case 12:
        return <Step12 form={form} set={set} errors={errors} />;
      default:
        return null;
    }
  })();

  const firstError = Object.values(errors)[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-20 z-30 border-b border-border bg-background/95 backdrop-blur">
        {/* Progress (logo retiré : déjà dans la navbar au-dessus) */}
        <div className="mx-auto max-w-5xl px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-sub">
            <span className="font-display font-semibold text-navy">{STEP_LABELS[step - 1]}</span>
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
        <div key={step} className="step-enter">
          {StepNode}
        </div>
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
              step === 1
                ? "invisible"
                : "text-navy hover:bg-sky",
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

