import type { VercelRequest, VercelResponse } from "@vercel/node";

function buildPrompt(payload: Record<string, unknown>): string {
  const bien = payload.bien as Record<string, unknown> ?? {};
  const etat = payload.etat as Record<string, unknown> ?? {};
  const energie = payload.energie as Record<string, unknown> ?? {};
  const exterieur = payload.exterieur as string[] ?? [];
  const situation = payload.situation as Record<string, unknown> ?? {};
  const projet = payload.projet as Record<string, unknown> ?? {};

  return `Tu es un expert en estimation immobilière française avec 20 ans d'expérience.
Analyse ce bien et génère une estimation précise basée sur les données du marché actuel.

BIEN À ESTIMER :
- Type : ${bien.type}
- Adresse : ${bien.adresse}, ${bien.code_postal} ${bien.ville}
- Surface habitable : ${bien.surface_habitable ?? "NC"} m²
- Surface terrain : ${bien.surface_terrain ?? "NC"} m²
- Pièces : ${bien.pieces} | Chambres : ${bien.chambres} | SDB : ${bien.salles_bain}
- Cuisine : ${bien.cuisine}
- Étage : ${bien.etage ?? "NC"} / Dernier étage : ${bien.dernier_etage ? "Oui" : "Non"}
- Niveaux : ${bien.niveaux ?? "NC"}

ÉTAT & PRESTATIONS :
- État général : ${etat.general}
- Prestations : ${Array.isArray(etat.prestations) ? etat.prestations.join(", ") || "Aucune" : "NC"}
- Extérieur : ${exterieur.join(", ") || "Aucun"}

ÉNERGIE :
- DPE : ${energie.dpe ?? "NC"} | GES : ${energie.ges ?? "NC"}
- Chauffage : ${energie.chauffage ?? "NC"}
- Année construction : ${energie.annee_construction ?? "NC"}
- Dernière rénovation énergétique : ${energie.derniere_renovation ?? "NC"}

SITUATION JURIDIQUE :
- Propriétaire : ${situation.proprietaire}
- Occupation : ${situation.occupation}
- Charges copropriété : ${situation.charges_copro_mensuelles ?? "NC"} €/mois
- Procédure copro : ${situation.procedure_copro ?? "Aucune"}

PROJET VENDEUR :
- Raison de vente : ${projet.raison_vente ?? "NC"}
- Délai souhaité : ${projet.delai ?? "NC"}
- Prix souhaité : ${projet.prix_souhaite ? `${projet.prix_souhaite} €` : "NC"}
- Estimation préalable : ${projet.estimation_prealable ?? "Non"}

Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks :
{
  "prix_median": 350000,
  "prix_bas": 325000,
  "prix_haut": 380000,
  "prix_m2": 4200,
  "prix_m2_marche": 4000,
  "delta_marche": 5,
  "delai_vente": "45-65 jours",
  "tension_marche": "moderee",
  "fiabilite": "elevee",
  "analyse": "Analyse détaillée de 4-5 phrases professionnelles et factuelles expliquant l'estimation, le contexte du marché local, les facteurs clés qui influencent le prix, et les perspectives de vente.",
  "recommandations": [
    { "titre": "Titre de la recommandation", "description": "Description actionnable.", "uplift": "+3 à 5%" }
  ]
}

Règles :
- tension_marche: "faible" | "moderee" | "forte"
- fiabilite: "elevee" | "moyenne" | "faible"
- Prix en euros entiers
- 2 à 3 recommandations maximum
- uplift est optionnel`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY manquante");
    return res.status(500).json({ error: "Configuration serveur manquante" });
  }

  try {
    const payload = req.body as Record<string, unknown>;
    const prompt = buildPrompt(payload);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Erreur Anthropic API:", err);
      return res.status(502).json({ error: "Erreur API IA" });
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content[0]?.text?.trim() ?? "";

    // Nettoyage JSON (au cas où)
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean) as Record<string, unknown>;

    const ref = `EST-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    // Envoi email lead (non-bloquant — on n'attend pas la fin pour répondre au client)
    sendLeadEmail({ payload, result, ref }).catch((e) =>
      console.error("sendLeadEmail failed (non-blocking):", e)
    );

    return res.status(200).json({ ...result, ref });
  } catch (error) {
    console.error("Erreur estimation:", error);
    return res.status(500).json({ error: "Estimation indisponible" });
  }
}

// ──────────────────────────────────────────────────────────────────
// Envoi emails Resend (admin + propriétaire)
// ──────────────────────────────────────────────────────────────────
async function sendLeadEmail({
  payload,
  result,
  ref,
}: {
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  ref: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const ADMIN_EMAIL = "contact.leenkey@gmail.com";
  const FROM_EMAIL = "Leenkey <noreply@leenkey.fr>";

  const contact = (payload.contact as Record<string, unknown>) ?? {};
  const bien = (payload.bien as Record<string, unknown>) ?? {};

  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const DISCLAIMER = `Ce document constitue une analyse automatisée basée sur les informations renseignées et les données de marché disponibles. Il est fourni à titre informatif et ne constitue ni une expertise immobilière ni une estimation réalisée par un professionnel habilité au sens de la loi Hoguet.`;

  // Champs supplémentaires pour enrichir le lead
  const etat = (payload.etat as Record<string, unknown>) ?? {};
  const energie = (payload.energie as Record<string, unknown>) ?? {};
  const situation = (payload.situation as Record<string, unknown>) ?? {};
  const projet = (payload.projet as Record<string, unknown>) ?? {};
  const exterieur = (payload.exterieur as string[]) ?? [];

  // Atouts du bien (extérieur + prestations)
  const prestations = Array.isArray(etat.prestations) ? (etat.prestations as string[]) : [];
  const atouts = [...exterieur, ...prestations].filter(Boolean).join(", ") || "—";

  // ───── EMAIL 1 : Admin (notification lead) ─────
  const htmlAdmin = `
<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,sans-serif;color:#0F172A;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#3B82F6,#8B5CF6);padding:24px;color:#fff;">
    <div style="font-size:12px;font-weight:700;opacity:.85;letter-spacing:1.5px;text-transform:uppercase">Leenkey</div>
    <h1 style="margin:6px 0 0;font-size:22px;">🏠 Nouvelle estimation</h1>
    <p style="margin:6px 0 0;opacity:.9;font-size:13px;">Réf. ${esc(ref)} · ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
  </div>
  <div style="padding:24px;">

    <h2 style="margin:0 0 12px;font-size:16px;color:#1156FC;">📞 Coordonnées du prospect</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;background:#F8FAFC;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 12px;color:#64748B;width:35%;border-bottom:1px solid #E2E8F0;">Nom complet</td><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #E2E8F0;">${esc(contact.prenom)} ${esc(contact.nom)}</td></tr>
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Email</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;"><a href="mailto:${esc(contact.email)}" style="color:#1156FC;font-weight:600;">${esc(contact.email)}</a></td></tr>
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Téléphone</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;"><a href="tel:${esc(contact.telephone)}" style="color:#1156FC;font-weight:600;">${esc(contact.telephone || "—")}</a></td></tr>
      ${contact.contact_conseiller ? '<tr><td style="padding:10px 12px;color:#64748B;" colspan="2"><span style="display:inline-block;background:#10B981;color:#fff;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700">✓ Souhaite être contacté</span></td></tr>' : ""}
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#1156FC;">🏡 Le bien</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;background:#F8FAFC;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 12px;color:#64748B;width:35%;border-bottom:1px solid #E2E8F0;">Type</td><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #E2E8F0;">${esc(bien.type)}</td></tr>
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Adresse</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(bien.adresse)}, ${esc(bien.code_postal)} ${esc(bien.ville)}</td></tr>
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Surface</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(bien.surface_habitable)} m²</td></tr>
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Pièces / chambres</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(bien.pieces)} pièces · ${esc(bien.chambres)} chambres</td></tr>
      ${bien.etage !== undefined && bien.etage !== null && bien.etage !== "" ? `<tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Étage</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(bien.etage)}${bien.dernier_etage ? " (dernier)" : ""}</td></tr>` : ""}
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">État</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(etat.general)}</td></tr>
      ${energie.dpe ? `<tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">DPE</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(energie.dpe)}${energie.ges ? " · GES " + esc(energie.ges) : ""}</td></tr>` : ""}
      ${energie.annee_construction ? `<tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Année construction</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(energie.annee_construction)}</td></tr>` : ""}
      ${atouts !== "—" ? `<tr><td style="padding:10px 12px;color:#64748B;">Atouts</td><td style="padding:10px 12px;">${esc(atouts)}</td></tr>` : ""}
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#1156FC;">📋 Situation & projet</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;background:#F8FAFC;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 12px;color:#64748B;width:35%;border-bottom:1px solid #E2E8F0;">Statut</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(situation.proprietaire)}</td></tr>
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Occupation</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(situation.occupation)}</td></tr>
      ${projet.raison_vente ? `<tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">Raison vente</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;">${esc(projet.raison_vente)}</td></tr>` : ""}
      <tr><td style="padding:10px 12px;color:#64748B;border-bottom:1px solid #E2E8F0;">⏱️ Délai souhaité</td><td style="padding:10px 12px;font-weight:700;color:#1156FC;border-bottom:1px solid #E2E8F0;">${esc(projet.delai)}</td></tr>
      ${projet.prix_souhaite ? `<tr><td style="padding:10px 12px;color:#64748B;">Prix souhaité</td><td style="padding:10px 12px;font-weight:600;">${esc(projet.prix_souhaite)} €</td></tr>` : ""}
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#1156FC;">💰 Valorisation Leenkey</h2>
    <div style="background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.08));border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748B">Valeur estimée</div>
      <div style="font-size:32px;font-weight:800;color:#1156FC;margin:6px 0">${esc(result.prix_median)} €</div>
      <div style="font-size:13px;color:#64748B;">Fourchette : ${esc(result.prix_bas)} € — ${esc(result.prix_haut)} €</div>
      <div style="font-size:13px;color:#64748B;margin-top:2px;">${esc(result.prix_m2)} €/m² · Délai vente estimé : <strong>${esc(result.delai_vente)}</strong></div>
    </div>

    ${result.analyse ? `<h2 style="margin:24px 0 12px;font-size:16px;color:#1156FC;">📊 Analyse IA</h2><p style="font-size:14px;line-height:1.6;color:#475569;margin:0;background:#F8FAFC;padding:14px;border-radius:8px;border-left:3px solid #1156FC;">${esc(result.analyse)}</p>` : ""}

    <div style="margin-top:24px;padding:14px;background:#FEF3C7;border-radius:8px;border:1px solid #FCD34D;text-align:center">
      <p style="margin:0;font-size:13px;color:#78350F"><strong>💡 Action recommandée :</strong> contacter le prospect sous 48h</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px 24px;color:#64748B;font-size:11px;text-align:center;border-top:1px solid #e2e8f0">
    Reply directement à cet email pour répondre au prospect · Leenkey
  </div>
</div>
</body></html>`.trim();

  // ───── EMAIL 2 : Propriétaire (son rapport) ─────
  const userEmail = String(contact.email ?? "").trim();
  const htmlUser = `
<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,sans-serif;color:#0F172A;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#3B82F6,#8B5CF6);padding:32px 24px;color:#fff;text-align:center;">
    <div style="font-size:14px;font-weight:600;opacity:.85;letter-spacing:1.5px;text-transform:uppercase">Leenkey</div>
    <h1 style="margin:8px 0 0;font-size:24px;">Votre rapport de valorisation</h1>
    <p style="margin:8px 0 0;opacity:.9;font-size:14px;">Réf. ${esc(ref)}</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="font-size:15px;line-height:1.6;color:#0F172A;margin:0 0 20px">Bonjour <strong>${esc(contact.prenom)}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 24px">Merci d'avoir utilisé Leenkey pour analyser la valeur de votre bien. Voici la synthèse de votre rapport personnalisé.</p>

    <div style="background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.08));border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:1px">Valeur estimée</div>
      <div style="font-size:38px;font-weight:800;color:#1156FC;margin:8px 0">${esc(result.prix_median)} €</div>
      <div style="font-size:14px;color:#64748B">Fourchette : ${esc(result.prix_bas)} € — ${esc(result.prix_haut)} €</div>
      <div style="font-size:14px;color:#64748B;margin-top:4px">${esc(result.prix_m2)} €/m² · ${esc(bien.surface_habitable)} m²</div>
    </div>

    <h2 style="font-size:16px;color:#1156FC;margin:0 0 12px">🏡 Votre bien</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
      <tr><td style="padding:6px 8px;color:#64748B">Type</td><td style="padding:6px 8px;text-align:right;font-weight:600">${esc(bien.type)}</td></tr>
      <tr><td style="padding:6px 8px;color:#64748B">Adresse</td><td style="padding:6px 8px;text-align:right">${esc(bien.adresse)}, ${esc(bien.code_postal)} ${esc(bien.ville)}</td></tr>
      <tr><td style="padding:6px 8px;color:#64748B">Surface</td><td style="padding:6px 8px;text-align:right">${esc(bien.surface_habitable)} m²</td></tr>
      <tr><td style="padding:6px 8px;color:#64748B">Délai de vente estimé</td><td style="padding:6px 8px;text-align:right;font-weight:600">${esc(result.delai_vente)}</td></tr>
    </table>

    ${result.analyse ? `<h2 style="font-size:16px;color:#1156FC;margin:0 0 12px">📊 Analyse du marché</h2><p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 24px">${esc(result.analyse)}</p>` : ""}

    <div style="text-align:center;margin:32px 0">
      <a href="https://leenkey-estimator-main.vercel.app/estimer" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Télécharger mon rapport PDF complet →</a>
      <p style="font-size:12px;color:#94A3B8;margin:12px 0 0">Cliquez pour accéder à votre tableau de bord et télécharger votre rapport détaillé (4 pages).</p>
    </div>

    <p style="font-size:14px;line-height:1.7;color:#475569;margin:24px 0">Notre équipe reste à votre disposition pour vous accompagner dans votre projet de vente.</p>
    <p style="font-size:14px;color:#0F172A;margin:0"><strong>L'équipe Leenkey</strong></p>

    <div style="margin-top:32px;padding:14px;background:#FEF3C7;border-radius:8px;border:1px solid #FCD34D">
      <p style="font-size:11px;line-height:1.5;color:#78350F;margin:0"><strong>⚠️ Avertissement :</strong> ${esc(DISCLAIMER)} Les valeurs indiquées sont des ordres de grandeur basés sur des modèles statistiques et peuvent différer significativement du prix réel de vente. Pour une évaluation officielle opposable, consultez un expert immobilier agréé.</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px 24px;color:#64748B;font-size:11px;text-align:center;border-top:1px solid #e2e8f0">
    Leenkey · Vendez votre bien autrement · Moins de frais, plus de contrôle
  </div>
</div>
</body></html>`.trim();

  // Envoi parallèle des 2 emails
  const adminEmailPromise = fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `🏠 Nouvelle estimation Leenkey — ${contact.prenom ?? ""} ${contact.nom ?? ""} (${result.prix_median} €)`,
      html: htmlAdmin,
      reply_to: userEmail || undefined,
    }),
  });

  const userEmailPromise = userEmail
    ? fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [userEmail],
          subject: `Votre rapport de valorisation Leenkey — ${result.prix_median} €`,
          html: htmlUser,
        }),
      })
    : Promise.resolve();

  await Promise.all([adminEmailPromise, userEmailPromise]);
}
