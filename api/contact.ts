import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Endpoint générique de réception des formulaires (contact, investir, etc.)
 * Envoie un email via Resend vers l'adresse configurée.
 *
 * Body attendu : { source: string, data: Record<string, any> }
 *   - source : "contact" | "investir" | "contact-navbar" | ...
 *   - data : tous les champs du formulaire
 */
const TO_EMAIL = "contact.leenkey@gmail.com";
const FROM_EMAIL = "Leenkey <noreply@leenkey.fr>"; // sender vérifié sur le domaine Resend

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlTable(data: Record<string, unknown>): string {
  const rows = Object.entries(data)
    .map(([k, v]) => {
      const label = escapeHtml(k.replace(/_/g, " "));
      let value: string;
      if (v === null || v === undefined || v === "") value = "—";
      else if (Array.isArray(v)) value = escapeHtml(v.join(", "));
      else if (typeof v === "object") value = `<pre style="margin:0;font-family:monospace;font-size:12px;">${escapeHtml(JSON.stringify(v, null, 2))}</pre>`;
      else value = escapeHtml(v);
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0F172A;width:30%;text-transform:capitalize;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${value}</td></tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">${rows}</table>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY manquante");
    return res.status(500).json({ error: "Configuration serveur manquante" });
  }

  try {
    const body = req.body as {
      source?: string;
      data?: Record<string, unknown>;
      pdfBase64?: string;
      pdfFilename?: string;
      sendToClient?: boolean;
    } | undefined;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Body invalide" });
    }

    const source = body.source ?? "inconnu";
    const data = body.data ?? {};
    const pdfBase64 = body.pdfBase64;
    const pdfFilename = body.pdfFilename ?? "Rapport-Leenkey.pdf";
    const sendToClient = body.sendToClient !== false; // par défaut on envoie aussi au client
    const clientEmail = String((data as Record<string, unknown>).email ?? "").trim();

    // Distinction par MOTIF (choix utilisateur dans le formulaire) puis par SOURCE
    const motif = String((data as Record<string, unknown>).motif ?? "").trim();
    const prenom = String((data as Record<string, unknown>).prenom ?? "").trim();
    const nom = String((data as Record<string, unknown>).nom ?? "").trim();
    const nomComplet = [prenom, nom].filter(Boolean).join(" ") || "Sans nom";

    // Mapping motif → objet explicite + couleur bandeau + emoji
    const motifConfig: Record<string, { label: string; icon: string; gradient: string }> = {
      Vendeur: { label: "Question vendeur", icon: "🏠", gradient: "linear-gradient(135deg,#1156FC,#60A5FA)" },
      Investisseur: { label: "Investisseur", icon: "💼", gradient: "linear-gradient(135deg,#F59E0B,#D97706)" },
      Partenaire: { label: "Partenaire", icon: "🤝", gradient: "linear-gradient(135deg,#10B981,#059669)" },
      Presse: { label: "Presse / Médias", icon: "📰", gradient: "linear-gradient(135deg,#8B5CF6,#7C3AED)" },
      Autre: { label: "Contact divers", icon: "💬", gradient: "linear-gradient(135deg,#64748B,#475569)" },
    };
    // Mapping source → fallback si aucun motif
    const sourceLabel: Record<string, string> = {
      contact: "Formulaire de contact",
      investir: "Formulaire investir",
      "contact-navbar": "Contact Navbar",
      estimation: "Estimation",
      "rappel-conseiller": "Demande conseiller",
    };

    const motifPick = motifConfig[motif];
    const headerLabel = motifPick?.label ?? sourceLabel[source] ?? source;
    const headerIcon = motifPick?.icon ?? "🔑";
    const headerGradient = motifPick?.gradient ?? "linear-gradient(135deg,#1156FC,#8B5CF6)";
    const subject = `${headerIcon} Leenkey — ${headerLabel} · ${nomComplet}`;

    // Attachments pour Resend
    const attachments = pdfBase64
      ? [{ filename: pdfFilename, content: pdfBase64 }]
      : undefined;

    // ───── EMAIL 1 : Admin ─────
    const htmlAdmin = `
<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#0F172A;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:${headerGradient};padding:24px;color:#ffffff;">
    <h1 style="margin:0;font-size:20px;font-weight:700;">${headerIcon} ${escapeHtml(headerLabel)} — ${escapeHtml(nomComplet)}</h1>
    <p style="margin:6px 0 0;opacity:.9;font-size:13px;">Source : <strong>${escapeHtml(source)}</strong> · ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
  </div>
  <div style="padding:20px;">
    ${renderHtmlTable(data as Record<string, unknown>)}
    ${pdfBase64 ? `<p style="margin-top:16px;font-size:13px;color:#64748B"><strong>📎 Rapport PDF</strong> en pièce jointe.</p>` : ""}
  </div>
  <div style="background:#f8fafc;padding:16px 20px;color:#64748B;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;">
    Envoyé automatiquement par Leenkey
  </div>
</div>
</body></html>`.trim();

    const adminPayload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      html: htmlAdmin,
      reply_to: clientEmail || undefined,
    };
    if (attachments) adminPayload.attachments = attachments;

    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(adminPayload),
    });

    if (!adminRes.ok) {
      const errText = await adminRes.text();
      console.error("Resend admin error:", errText);
      return res.status(502).json({ error: "Email admin non envoyé", detail: errText });
    }

    // ───── EMAIL 2 : Confirmation au client (avec PDF si fourni) ─────
    if (sendToClient && clientEmail) {
      const htmlClient = `
<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,sans-serif;color:#0F172A;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#1156FC,#8B5CF6);padding:32px 24px;color:#fff;text-align:center;">
    <div style="font-size:14px;font-weight:600;opacity:.85;letter-spacing:1.5px;text-transform:uppercase">Leenkey</div>
    <h1 style="margin:8px 0 0;font-size:22px;">Votre demande est bien reçue</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="font-size:15px;line-height:1.6;color:#0F172A;margin:0 0 20px">Bonjour ${escapeHtml(prenom)},</p>
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 18px">
      Nous avons bien reçu votre demande de contact. Un conseiller Leenkey vous contactera
      <strong>sous 48 heures ouvrées</strong> pour échanger avec vous sur votre projet de vente.
    </p>
    ${pdfBase64 ? `<p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 18px">📎 Vous trouverez également <strong>votre rapport de valorisation complet en pièce jointe</strong> de cet email, à conserver précieusement.</p>` : ""}
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:24px 0 0">À très vite,</p>
    <p style="font-size:14px;color:#0F172A;margin:4px 0 0"><strong>L'équipe Leenkey</strong></p>
  </div>
  <div style="background:#f8fafc;padding:16px 24px;color:#64748B;font-size:11px;text-align:center;border-top:1px solid #e2e8f0">
    Leenkey · Vendez votre bien autrement · Moins de frais, plus de contrôle
  </div>
</div>
</body></html>`.trim();

      const clientPayload: Record<string, unknown> = {
        from: FROM_EMAIL,
        to: [clientEmail],
        subject: `Votre demande de contact Leenkey est bien reçue`,
        html: htmlClient,
      };
      if (attachments) clientPayload.attachments = attachments;

      // Non-bloquant : on envoie au client mais on ne bloque pas l'admin si ça échoue
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(clientPayload),
      }).catch((e) => console.error("Resend client error (non-blocking):", e));
    }

    const result = (await adminRes.json()) as { id?: string };
    return res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    console.error("Erreur contact handler:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
