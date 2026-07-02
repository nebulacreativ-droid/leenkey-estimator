import { cn } from "@/lib/utils";
import { computeEstimation, formatEUR, type EstimationResult } from "./estimation";
import type { LeenkeyForm } from "./types";
import type { DvfResult } from "./Wizard";
import { useState } from "react";
import { downloadReportPDF, generateReportPDFBase64 } from "./generatePDF";

const monthLabel = (months: number): string => {
  if (months === 0) return "ce mois-ci";
  if (months === 1) return "il y a 1 mois";
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years === 1 && restMonths === 0) return "il y a 1 an";
  if (restMonths === 0) return `il y a ${years} ans`;
  return `il y a ${years} an${years > 1 ? "s" : ""} et ${restMonths} mois`;
};

const dateFr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
};

const typeLabel: Record<string, string> = {
  maison: "Maison",
  appartement: "Appartement",
  terrain: "Terrain",
  local_commercial: "Local commercial",
  immeuble: "Immeuble",
  atypique: "Bien atypique",
};

const fiabiliteLabel = {
  elevee: { txt: "Fiabilité élevée", cls: "bg-success/15 text-success border-success/30" },
  moyenne: { txt: "Fiabilité moyenne", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  faible: { txt: "Fiabilité faible", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

const tensionLabel = {
  faible: "Marché détendu",
  moderee: "Marché actif",
  forte: "Marché tendu",
};

export function EstimationDashboard({
  form,
  ref_,
  aiAnalyse,
  dvfData,
  onRestart,
}: {
  form: LeenkeyForm;
  ref_: string;
  aiAnalyse?: string;
  dvfData?: DvfResult | null;
  onRestart: () => void;
}) {
  // Si on a des données DVF dispo, on les utilise pour affiner l'estimation
  const dvfPrixM2 = dvfData?.available ? dvfData.stats.prixM2Pondere : null;
  const r: EstimationResult = computeEstimation(form, dvfPrixM2);

  // État pour le bouton "Recevoir par email"
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // État pour le modal "Être rappelé"
  const [contactOpen, setContactOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [contactMsg, setContactMsg] = useState("");
  const [contactDispo, setContactDispo] = useState("Dès que possible");

  const sendContactRequest = async () => {
    setContactStatus("sending");
    try {
      // 1. Génère le PDF en base64 pour l'attacher aux 2 emails (admin + client)
      let pdfBase64: string | undefined;
      let pdfFilename: string | undefined;
      try {
        const pdf = await generateReportPDFBase64({
          form,
          ref: ref_,
          r,
          aiAnalyse,
          dvfData,
        });
        pdfBase64 = pdf.base64;
        pdfFilename = pdf.filename;
      } catch (e) {
        console.warn("Génération PDF échouée, envoi sans pièce jointe:", e);
      }

      // 2. POST vers /api/contact (qui envoie à l'admin + au client)
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "rappel-conseiller",
          sendToClient: true,
          pdfBase64,
          pdfFilename,
          data: {
            ref_dossier: ref_,
            prenom: form.prenom,
            nom: form.nom,
            email: form.email,
            telephone: form.telephone,
            bien: `${form.type} · ${r.surface} m² · ${form.ville || ""}`,
            valeur_estimee: `${r.prixEstime.toLocaleString("fr-FR")} €`,
            disponibilite: contactDispo,
            message: contactMsg || "Demande de contact suite à une valorisation.",
          },
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setContactStatus("sent");
      setTimeout(() => {
        setContactOpen(false);
        setContactStatus("idle");
        setContactMsg("");
      }, 2500);
    } catch {
      setContactStatus("error");
      setTimeout(() => setContactStatus("idle"), 4000);
    }
  };
  const sendEmailRecap = async () => {
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: ref_,
          contact: {
            prenom: form.prenom,
            nom: form.nom,
            email: form.email,
            telephone: form.telephone,
          },
          bien: {
            type: form.type,
            adresse: form.adresse,
            code_postal: form.code_postal,
            ville: form.ville,
            surface_habitable: form.surface_habitable,
          },
          result: {
            prix_median: r.prixEstime,
            prix_bas: r.prixBas,
            prix_haut: r.prixHaut,
            prix_m2: r.prixM2,
            delai_vente: r.delaiVente,
            analyse: aiAnalyse ?? "",
          },
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setEmailStatus("sent");
      setTimeout(() => setEmailStatus("idle"), 5000);
    } catch {
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 5000);
    }
  };
  const fiab = fiabiliteLabel[r.fiabilite];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <img
            src="/leenkey-logo.svg"
            alt="Leenkey"
            width={112}
            height={56}
            className="h-12 w-auto"
          />
          <div className="text-sm text-sub">
            Réf. dossier · <span className="font-semibold text-navy">{ref_}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* Intro */}
        <div className="fade-up mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Ma valeur immobilière
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">
            Bonjour {form.prenom || ""}, voici la valeur estimée de votre bien
          </h1>
          <p className="mt-2 text-sub">
            {typeLabel[form.type ?? "maison"]} · {r.surface} m² · {form.ville || "—"}
          </p>
        </div>

        {/* Hero card */}
        <section
          className="fade-up relative overflow-hidden rounded-[20px] border-2 border-sky-mid bg-gradient-to-br from-sky to-card p-8 shadow-[0_20px_50px_-20px_rgba(17,86,252,0.25)]"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-start">
            <div className="flex-1">
              <div className="text-sm font-semibold text-sub">Prix estimé</div>
              <div className="mt-2 font-display text-5xl font-bold tracking-tight text-navy sm:text-6xl">
                {formatEUR(r.prixEstime)}
              </div>
              <div className="mt-2 text-sub text-sm">
                Précision <span className="font-semibold text-navy">±{Math.round(((r.prixHaut - r.prixEstime) / r.prixEstime) * 100)}%</span> · Fourchette resserrée selon votre profil
              </div>

              {/* Barre de fourchette visuelle */}
              <div className="mt-6 max-w-md">
                <div className="relative h-2 rounded-full bg-sky-mid">
                  <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
                    style={{ left: "10%", right: "10%" }}
                  />
                  <div
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-white bg-primary shadow-lg"
                    style={{ left: "calc(50% - 10px)" }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs font-semibold text-sub">
                  <span>{formatEUR(r.prixBas)}</span>
                  <span className="text-primary">{formatEUR(r.prixEstime)}</span>
                  <span>{formatEUR(r.prixHaut)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-semibold",
                  fiab.cls,
                )}
              >
                ● {fiab.txt} · {r.fiabiliteScore}%
              </span>
              <div className="text-right">
                <div className="text-sm text-sub">Prix au m²</div>
                <div className="font-display text-2xl font-bold text-navy">
                  {r.prixM2.toLocaleString("fr-FR")} €/m²
                </div>
                <div className="mt-1 text-xs text-sub">
                  Marché : {r.prixM2Marche.toLocaleString("fr-FR")} €/m²
                </div>
              </div>
              {/* Mini-jauge fiabilité */}
              <div className="w-full max-w-[160px] md:max-w-[200px]">
                <div className="mb-1 flex justify-between text-xs text-sub">
                  <span>Fiabilité</span>
                  <span className="font-semibold text-navy">{r.fiabiliteScore}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sky-mid">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      r.fiabilite === "elevee" ? "bg-success" : r.fiabilite === "moyenne" ? "bg-amber-500" : "bg-destructive",
                    )}
                    style={{ width: `${r.fiabiliteScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI grid */}
        <section
          className="fade-up mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "0.1s" }}
        >
          <Kpi
            label="vs marché local"
            value={`${r.deltaMarche >= 0 ? "+" : ""}${r.deltaMarche}%`}
            tone={r.deltaMarche >= 0 ? "pos" : "neg"}
            sub={`Moy. ${r.prixM2Marche.toLocaleString("fr-FR")} €/m²`}
            icon={r.deltaMarche >= 0 ? "📈" : "📉"}
          />
          <Kpi
            label="Délai de vente attendu"
            value={r.delaiVente}
            sub="À prix de marché"
            icon="⏱️"
          />
          <Kpi
            label="Score d'attractivité"
            value={`${r.scoreAttractivite}/100`}
            tone={r.scoreAttractivite >= 70 ? "pos" : r.scoreAttractivite >= 50 ? "neutral" : "neg"}
            sub="DPE · état · prestations"
            icon="⭐"
          />
          <Kpi
            label="Tension du marché"
            value={tensionLabel[r.tensionMarche]}
            sub={`Département ${(form.departement || form.code_postal || "").slice(0, 2) || "—"}`}
            icon={r.tensionMarche === "forte" ? "🔥" : r.tensionMarche === "moderee" ? "📊" : "💧"}
          />
        </section>

        {/* Two columns */}
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Récap */}
          <Card className="fade-up lg:col-span-2" delay="0.15s">
            <h2 className="mb-4 font-display text-lg font-bold text-navy">Votre bien</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row k="Type" v={typeLabel[form.type ?? ""] ?? "—"} />
              <Row k="Surface" v={`${r.surface} m²`} />
              <Row k="Pièces" v={form.pieces ?? "—"} />
              <Row k="Chambres" v={form.chambres ?? "—"} />
              <Row k="Salles de bain" v={form.salles_bain ?? "—"} />
              {form.type === "appartement" && (
                <Row k="Étage" v={form.dernier_etage ? "Dernier" : form.etage ?? "—"} />
              )}
              <Row k="DPE" v={form.dpe ?? "—"} />
              <Row k="État" v={form.etat ?? "—"} />
            </dl>
            {(form.exterieur.length > 0 || form.prestations.length > 0) && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-sub">
                  Atouts
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...form.exterieur, ...form.prestations].map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-sky-mid bg-sky px-3 py-1 text-xs font-medium text-primary"
                    >
                      {p.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Analyse IA Claude */}
          {aiAnalyse && (
            <Card className="fade-up lg:col-span-3" delay="0.18s">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm">✦</span>
                <h2 className="font-display text-lg font-bold text-navy">Analyse du marché</h2>
                <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Alimenté par IA
                </span>
              </div>
              <p className="text-sm leading-relaxed text-sub">{aiAnalyse}</p>
            </Card>
          )}

          {/* Comparables DVF — données officielles data.gouv.fr */}
          {dvfData?.available && dvfData.comparables.length > 0 && (
            <Card className="fade-up lg:col-span-3" delay="0.19s">
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-sm">
                  📊
                </span>
                <h2 className="font-display text-lg font-bold text-navy">
                  Ventes réelles dans votre secteur
                </h2>
                <span className="ml-auto rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  Données DVF · data.gouv.fr
                </span>
              </div>

              <div className="mb-4 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong>⚠️ Données historiques</strong> · Les ventes ci-dessous proviennent de la base DVF
                officielle (DGFiP). Elles sont publiées avec un délai d'environ 6 mois. Le marché peut
                avoir évolué depuis. Notre analyse tient compte de cette ancienneté.
              </div>

              {/* Stats résumées */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-[12px] bg-sky/40 p-3">
                  <div className="text-xs font-semibold uppercase text-sub">Comparables trouvés</div>
                  <div className="mt-1 font-display text-xl font-bold text-navy">
                    {dvfData.nbComparables}
                  </div>
                </div>
                <div className="rounded-[12px] bg-sky/40 p-3">
                  <div className="text-xs font-semibold uppercase text-sub">Prix médian /m²</div>
                  <div className="mt-1 font-display text-xl font-bold text-navy">
                    {dvfData.stats.prixM2Median.toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div className="rounded-[12px] bg-sky/40 p-3">
                  <div className="text-xs font-semibold uppercase text-sub">Min /m²</div>
                  <div className="mt-1 font-display text-xl font-bold text-navy">
                    {dvfData.stats.prixM2Min.toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div className="rounded-[12px] bg-sky/40 p-3">
                  <div className="text-xs font-semibold uppercase text-sub">Max /m²</div>
                  <div className="mt-1 font-display text-xl font-bold text-navy">
                    {dvfData.stats.prixM2Max.toLocaleString("fr-FR")} €
                  </div>
                </div>
              </div>

              {/* Liste des ventes comparables */}
              <h3 className="mb-3 text-sm font-semibold text-navy">
                Dernières ventes comparables ({dvfData.comparables.length})
              </h3>
              <div className="space-y-2">
                {dvfData.comparables.map((c, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2 rounded-[10px] border border-border bg-card p-3 text-sm sm:grid-cols-4"
                  >
                    <div>
                      <div className="text-xs text-sub">Vente</div>
                      <div className="font-semibold text-navy">{dateFr(c.date)}</div>
                      <div className="text-xs text-sub">{monthLabel(c.monthsAgo)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-sub">Bien</div>
                      <div className="font-semibold text-navy">{c.type}</div>
                      <div className="text-xs text-sub">
                        {c.surface} m² {c.pieces > 0 ? `· ${c.pieces} p.` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-sub">Prix</div>
                      <div className="font-semibold text-navy">{formatEUR(c.prix)}</div>
                      <div className="text-xs text-sub">
                        {c.prixM2.toLocaleString("fr-FR")} €/m²
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-sub">Localisation</div>
                      <div className="font-semibold text-navy line-clamp-1">{c.ville}</div>
                      {c.adresse && (
                        <div className="text-xs text-sub line-clamp-1">{c.adresse}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs italic text-sub">
                Source : base de données publique DVF (Demandes de Valeurs Foncières) · data.gouv.fr
              </p>
            </Card>
          )}

          {/* Facteurs */}
          <Card className="fade-up lg:col-span-3" delay="0.2s">
            <h2 className="mb-1 font-display text-lg font-bold text-navy">
              Facteurs de valorisation
            </h2>
            <p className="mb-5 text-sm text-sub">
              Impact estimé de chaque critère par rapport au prix de marché.
            </p>
            <div className="space-y-4">
              {r.facteurs.map((f) => (
                <FactorBar key={f.label} f={f} />
              ))}
            </div>
          </Card>
        </section>

        {/* Recommandations */}
        <section className="fade-up mt-6" style={{ animationDelay: "0.25s" }}>
          <h2 className="mb-4 font-display text-lg font-bold text-navy">
            Comment valoriser votre bien
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {r.recommandations.map((rec, i) => (
              <div
                key={i}
                className="rounded-[16px] border-2 border-border bg-card p-5 transition hover:border-primary/40"
              >
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  💡
                </div>
                <h3 className="font-display text-base font-semibold text-navy">
                  {rec.title}
                </h3>
                <p className="mt-1.5 text-sm text-sub">{rec.description}</p>
                {rec.uplift && (
                  <div className="mt-3 inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                    Potentiel {rec.uplift}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Prochaines étapes */}
        <section className="fade-up mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" style={{ animationDelay: "0.3s" }}>
          <Card>
            <h2 className="mb-4 font-display text-lg font-bold text-navy">Prochaines étapes</h2>
            <ol className="space-y-3">
              {[
                { i: "✅", l: "Rapport généré", done: true },
                { i: "📧", l: `Rapport détaillé envoyé à ${form.email || "votre email"}`, done: false },
                { i: "📞", l: "Appel avec un conseiller Leenkey", done: false },
                { i: "🏷️", l: "Mise en vente sans agence", done: false },
              ].map((it, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-[12px] border-2 p-3",
                    it.done ? "border-success/30 bg-success/5" : "border-border bg-card",
                  )}
                >
                  <span className="text-lg">{it.i}</span>
                  <span className={cn("text-sm font-medium", it.done ? "text-navy" : "text-sub")}>
                    {it.l}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="mb-2 font-display text-lg font-bold text-navy">Aller plus loin</h2>
            <p className="mb-4 text-sm text-sub">
              Recevez le rapport complet ou échangez avec un conseiller pour affiner votre projet.
            </p>
            <div className="flex flex-col gap-3">
              {/* Actions principales en grille 2 colonnes */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    void downloadReportPDF({
                      form,
                      ref: ref_,
                      r,
                      aiAnalyse,
                      dvfData,
                    });
                  }}
                  className="rounded-[12px] bg-primary px-5 py-3 font-display text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-8px_rgba(17,86,252,0.5)] transition hover:translate-y-[-1px]"
                >
                  📄 Télécharger le PDF
                </button>
                <button
                  onClick={sendEmailRecap}
                  disabled={emailStatus === "sending" || emailStatus === "sent"}
                  className={cn(
                    "rounded-[12px] border-2 px-5 py-3 font-display text-sm font-semibold transition hover:translate-y-[-1px]",
                    emailStatus === "sent"
                      ? "border-success bg-success/10 text-success cursor-default"
                      : emailStatus === "error"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-primary bg-primary/5 text-primary hover:bg-primary/10",
                    emailStatus === "sending" && "opacity-60 cursor-wait"
                  )}
                >
                  {emailStatus === "sending" && "⏳ Envoi en cours…"}
                  {emailStatus === "sent" && "✓ Email envoyé !"}
                  {emailStatus === "error" && "❌ Erreur, réessayer"}
                  {emailStatus === "idle" && "📧 Recevoir le récap par email"}
                </button>
              </div>

              <button
                onClick={() => setContactOpen(true)}
                className="rounded-[12px] border-2 border-border bg-card px-5 py-3 font-display text-sm font-semibold text-navy transition hover:border-primary/60 hover:translate-y-[-1px]"
              >
                📞 Prendre contact avec un conseiller
              </button>
              <button
                onClick={onRestart}
                className="rounded-[12px] px-5 py-3 font-display text-sm font-semibold text-sub transition hover:text-navy"
              >
                ↻ Refaire une analyse
              </button>
            </div>
          </Card>
        </section>

        {/* Modal : Demande de rappel par un conseiller */}
        {contactOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => contactStatus !== "sending" && setContactOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-[16px] bg-card p-6 shadow-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {contactStatus === "sent" ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-3xl">
                    ✓
                  </div>
                  <h3 className="mb-2 font-display text-xl font-bold text-navy">
                    Demande envoyée !
                  </h3>
                  <p className="text-sm text-sub">
                    Un conseiller Leenkey vous contactera dans les plus brefs délais.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-xl font-bold text-navy">
                        📞 Prendre contact avec un conseiller
                      </h3>
                      <p className="mt-1 text-sm text-sub">
                        Un conseiller Leenkey vous contactera sous 48h, 7j/7.
                      </p>
                    </div>
                    <button
                      onClick={() => setContactOpen(false)}
                      className="text-sub hover:text-navy text-2xl leading-none"
                      aria-label="Fermer"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mb-5 rounded-[10px] bg-sky/30 p-4 text-sm">
                    <div className="font-semibold text-navy">
                      {form.prenom} {form.nom}
                    </div>
                    <div className="text-sub">
                      {form.email} · {form.telephone}
                    </div>
                    <div className="mt-1 text-xs text-sub">
                      Réf. dossier : <span className="font-mono">{ref_}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block font-display text-sm font-semibold text-navy">
                        Quand préférez-vous être contacté&nbsp;?
                      </label>
                      <select
                        value={contactDispo}
                        onChange={(e) => setContactDispo(e.target.value)}
                        className="h-[44px] w-full rounded-[10px] border-2 border-border bg-card px-3 text-sm text-navy focus:border-primary focus:outline-none"
                      >
                        <option>Dès que possible</option>
                        <option>Matin (9h - 12h)</option>
                        <option>Après-midi (14h - 17h)</option>
                        <option>Fin de journée (17h - 19h)</option>
                        <option>Week-end</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block font-display text-sm font-semibold text-navy">
                        Votre message <span className="font-normal text-sub text-xs">(optionnel)</span>
                      </label>
                      <textarea
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                        rows={4}
                        placeholder="Décrivez votre projet, vos questions, vos attentes…"
                        className="w-full rounded-[10px] border-2 border-border bg-card p-3 text-sm text-navy focus:border-primary focus:outline-none resize-none"
                      />
                    </div>

                    {contactStatus === "error" && (
                      <div className="rounded-[8px] bg-destructive/10 p-3 text-sm text-destructive">
                        Erreur d'envoi, réessayez ou contactez-nous directement à contact.leenkey@gmail.com
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setContactOpen(false)}
                        disabled={contactStatus === "sending"}
                        className="flex-1 rounded-[10px] border-2 border-border bg-card px-4 py-3 font-display text-sm font-semibold text-navy hover:border-sub"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => void sendContactRequest()}
                        disabled={contactStatus === "sending"}
                        className={cn(
                          "flex-[2] rounded-[10px] bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-8px_rgba(17,86,252,0.5)] transition",
                          contactStatus === "sending" ? "opacity-60 cursor-wait" : "hover:translate-y-[-1px]"
                        )}
                      >
                        {contactStatus === "sending" ? "⏳ Envoi…" : "📨 Envoyer ma demande"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer juridique obligatoire */}
        <div className="mt-10 rounded-[12px] border-2 border-amber-200 bg-amber-50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <h3 className="font-display text-sm font-bold text-amber-900">Avertissement légal</h3>
          </div>
          <p className="text-xs leading-relaxed text-amber-900">
            Ce document constitue une <strong>analyse automatisée</strong> basée sur les informations renseignées
            et les données de marché disponibles. Il est fourni <strong>à titre informatif uniquement</strong> et ne
            constitue ni une expertise immobilière ni une estimation réalisée par un professionnel habilité au sens de la loi
            Hoguet. Les valeurs indiquées sont des ordres de grandeur basés sur des modèles statistiques et peuvent
            différer significativement du prix réel de vente. Pour une évaluation officielle opposable, consultez un
            expert immobilier agréé ou un notaire.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ============ Helpers ============ */

function Card({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={cn("rounded-[16px] border-2 border-border bg-card p-6", className)}
      style={delay ? { animationDelay: delay } : undefined}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "neutral";
  icon?: string;
}) {
  const toneCls =
    tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : "text-navy";
  const iconBg =
    tone === "pos" ? "bg-success/10" : tone === "neg" ? "bg-destructive/10" : "bg-primary/10";
  const iconColor =
    tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : "text-primary";
  return (
    <div className="group relative overflow-hidden rounded-[16px] border-2 border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-sub">{label}</div>
          <div className={cn("mt-2 font-display text-2xl font-bold", toneCls)}>{value}</div>
          {sub && <div className="mt-1 text-xs text-sub">{sub}</div>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg", iconBg, iconColor)}>
            {icon}
          </div>
        )}
      </div>
      {/* Trait décoratif bas */}
      <div className={cn("absolute bottom-0 left-0 h-1 w-full opacity-50",
        tone === "pos" ? "bg-success" : tone === "neg" ? "bg-destructive" : "bg-primary",
      )} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-sub">{k}</dt>
      <dd className="text-right font-semibold text-navy">{v ?? "—"}</dd>
    </>
  );
}

function FactorBar({ f }: { f: { label: string; impact: number; detail: string } }) {
  const pos = f.impact >= 0;
  const width = Math.min(Math.abs(f.impact) * 4, 100); // 25% impact = full bar
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-navy">{f.label}</span>
        <span className={cn("font-display text-sm font-bold", pos ? "text-success" : "text-destructive")}>
          {pos ? "+" : ""}
          {f.impact}%
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-sky-mid/40">
        <div
          className={cn(
            "absolute top-0 h-full rounded-full",
            pos ? "bg-success left-1/2" : "bg-destructive right-1/2",
          )}
          style={{ width: `${width / 2}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
      </div>
      <div className="mt-1 text-xs text-sub">{f.detail}</div>
    </div>
  );
}
