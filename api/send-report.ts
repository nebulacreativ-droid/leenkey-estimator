import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Endpoint : renvoie le rapport de valorisation par email au client.
 * Body attendu : { contact: {...}, bien: {...}, result: {...}, ref: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      contact?: Record<string, unknown>;
      bien?: Record<string, unknown>;
      result?: Record<string, unknown>;
      ref?: string;
    };

    const contact = body.contact ?? {};
    const bien = body.bien ?? {};
    const result = body.result ?? {};
    const ref = body.ref ?? "REF";

    const userEmail = String(contact.email ?? "").trim();
    if (!userEmail) {
      return res.status(400).json({ error: "Email manquant" });
    }

    const FROM_EMAIL = "Leenkey <noreply@leenkey.fr>";

    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const DISCLAIMER =
      "Ce document constitue une analyse automatisée basée sur les informations renseignées et les données de marché disponibles. Il est fourni à titre informatif et ne constitue ni une expertise immobilière ni une estimation réalisée par un professionnel habilité au sens de la loi Hoguet.";

    const html = `
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
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 24px">Voici à nouveau le récapitulatif de votre rapport de valorisation Leenkey, comme demandé.</p>

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
      <a href="https://leenkey-estimator-main.vercel.app/estimer" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Retourner sur mon tableau de bord</a>
    </div>

    <p style="font-size:14px;line-height:1.7;color:#475569;margin:24px 0">Notre équipe reste à votre disposition pour vous accompagner.</p>
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

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        subject: `Votre rapport de valorisation Leenkey — ${result.prix_median} €`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", errText);
      return res.status(502).json({ error: "Email non envoyé", detail: errText });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erreur send-report:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
