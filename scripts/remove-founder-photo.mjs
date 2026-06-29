#!/usr/bin/env node
/**
 * Supprime la photo du fondateur dans qui-sommes-nous.html (bundler Lovable).
 * - Utilise un regex précis qui matche tout le bloc .founder-portrait jusqu'au </div> final
 * - Ajoute un override CSS pour passer .founder en 1 colonne
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.join(__dirname, "..");
const FILE = path.join(PROJ, "public/pages/qui-sommes-nous.html");

let html = fs.readFileSync(FILE, "utf8");

// ─── Fix flash blanc/code au chargement ─────────────────────────
// Cache le thumbnail SVG (navy + code) et le badge "Unpacking..."
// pour qu'il n'y ait qu'un fond blanc clean pendant l'unpacking
html = html
  .replace(
    /body \{ background: #faf9f5;/,
    "body { background: #ffffff;"
  )
  .replace(
    /#__bundler_thumbnail \{ position: fixed; inset: 0; width: 100%; height: 100%; display: flex;/,
    "#__bundler_thumbnail { position: fixed; inset: 0; width: 100%; height: 100%; display: none;"
  )
  .replace(
    /#__bundler_loading \{ position: fixed; bottom: 20px; right: 20px;/,
    "#__bundler_loading { display: none; position: fixed; bottom: 20px; right: 20px;"
  );
console.log("✅ Flash de chargement retiré (thumbnail + loader cachés, fond blanc)");


// Extrait le template JSON
const templateRegex =
  /(<script[^>]*type="__bundler\/template"[^>]*>)([\s\S]*?)(<\/script>)/;
const m = html.match(templateRegex);
if (!m) {
  console.error("Template introuvable");
  process.exit(1);
}

const before = m[1];
const after = m[3];
const templateJson = m[2];

// Parse le JSON (string contenant le HTML)
let template = JSON.parse(templateJson);
if (typeof template !== "string") {
  console.error("Template attendu en string");
  process.exit(1);
}

const originalLen = template.length;

// Extraction précise : trouver les bornes start/end du bloc .founder-portrait
// On s'appuie sur le fait que le bloc est suivi de "<div class=\"founder-info"
const START_MARKER = '<div class="founder-portrait reveal">';
const END_MARKER_NEXT = '<div class="founder-info';

const startIdx = template.indexOf(START_MARKER);
if (startIdx === -1) {
  console.warn("⚠️  .founder-portrait introuvable — probablement déjà retiré");
} else {
  // Trouve l'index de "<div class=\"founder-info" qui suit
  const nextDivIdx = template.indexOf(END_MARKER_NEXT, startIdx);
  if (nextDivIdx === -1) {
    console.error("❌ founder-info introuvable après founder-portrait");
    process.exit(1);
  }
  // Le bloc à retirer va de startIdx jusqu'au début du <div class="founder-info...">
  // On retire aussi les espaces/sauts de ligne qui précèdent founder-info
  const before = template.slice(0, startIdx);
  const after = template.slice(nextDivIdx).replace(/^\s*/, "");
  const removed = template.slice(startIdx, nextDivIdx);
  template = before + after;
  console.log(`✅ Bloc .founder-portrait retiré (${removed.length} caractères, indentation préservée)`);
}

// 2) Remplace les CTA "Estimer mon bien" par "Valoriser mon bien"
const beforeCount = (template.match(/Estimer mon bien/g) ?? []).length;
template = template
  .replace(/Estimer mon bien gratuitement/g, "Valoriser mon bien gratuitement")
  .replace(/Estimer mon bien/g, "Valoriser mon bien");
const afterCount = (template.match(/Estimer mon bien/g) ?? []).length;
console.log(`✅ CTA "Estimer mon bien" remplacés : ${beforeCount} occurrences → ${afterCount} restantes`);

// 2bis) Retire le doublon "Cédric Da Cunha" (déjà présent dans le titre)
const dupRegex = /<div class="founder-name">Cédric Da Cunha<\/div>\s*/;
if (template.match(dupRegex)) {
  template = template.replace(dupRegex, "");
  console.log("✅ Doublon '.founder-name' retiré (Cédric Da Cunha)");
}

// 3) Override CSS : aligner .founder sur la même largeur que .section-head (720px, aligné à gauche)
const cssOverride = `
  /* Photo fondateur retiree - aligne sur le section-head "Le porteur de projet" (720px, left) */
  .founder { grid-template-columns: 1fr !important; gap: 24px !important; max-width: 680px !important; margin: 0 !important; }
  @media (min-width:920px){ .founder { grid-template-columns: 1fr !important; max-width: 680px !important; margin: 0 !important; } }
  .founder-info { text-align: left; max-width: 100%; }
  .founder-name { font-size: clamp(26px, 3.2vw, 32px) !important; }
  .founder-role { font-size: 14px !important; }
  .founder-bio { margin-top: 18px !important; }
  .founder-bio p { font-size: 15px !important; line-height: 1.7 !important; margin-bottom: 12px; }
  .founder-stats { grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important; margin-top: 24px !important; }
  .founder-stats .fstat { padding: 14px !important; }
  .founder-stats .fs-num { font-size: 18px !important; }
  .founder-stats .fs-cap { font-size: 11.5px !important; }
  .expertise { margin-top: 20px !important; gap: 6px !important; }
  .expertise .exp-chip { font-size: 12px !important; padding: 6px 10px !important; }`;

const lastStyleIdx = template.lastIndexOf("</style>");
if (lastStyleIdx !== -1) {
  template = template.slice(0, lastStyleIdx) + cssOverride + template.slice(lastStyleIdx);
  console.log("✅ CSS override .founder ajouté");
} else {
  console.warn("⚠️  </style> introuvable — ajout du CSS ignoré");
}

// Réinjecte avec escape spécial pour les </script> à l'intérieur du JSON
// (sinon le navigateur clôture prématurément le <script> qui contient le JSON)
// Échappe uniquement </script> car c'est ce qui clôture le tag HTML parent
const escapeForScriptTag = (json) =>
  json.replace(/<\/script/gi, "<\\/script");

const newTemplateJson = escapeForScriptTag(JSON.stringify(template));

// Vérif : re-parse pour valider que c'est OK
try {
  JSON.parse(newTemplateJson);
  console.log("✅ JSON re-encodé valide");
} catch (e) {
  console.error("❌ JSON re-encodé invalide:", e.message);
  process.exit(1);
}

// Vérif : taille du HTML cohérente
console.log(`   Template HTML : ${originalLen} → ${template.length} caractères`);
console.log(`   Template JSON : ${templateJson.length} → ${newTemplateJson.length} caractères`);

const newHtml = html.replace(templateRegex, () => `${before}${newTemplateJson}${after}`);

fs.writeFileSync(FILE, newHtml);
console.log(`\n✅ Fichier mis à jour : ${FILE}`);
