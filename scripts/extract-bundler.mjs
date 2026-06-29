#!/usr/bin/env node
/**
 * Extrait le bundler qui-sommes-nous.html pour analyse / modification.
 * - Lit le fichier
 * - Décompresse les assets (base64 + gzip)
 * - Trouve les images et leur contexte
 * - Génère un fichier d'analyse + le template HTML décodé
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.join(__dirname, "..");
const SRC = path.join(PROJ, "public/pages/qui-sommes-nous.html");
const OUT_DIR = path.join(PROJ, "scripts/extracted");

fs.mkdirSync(OUT_DIR, { recursive: true });

const html = fs.readFileSync(SRC, "utf8");

// Extrait les scripts du bundler avec regex
const manifestMatch = html.match(
  /<script[^>]*type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/
);
const templateMatch = html.match(
  /<script[^>]*type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/
);

if (!manifestMatch || !templateMatch) {
  console.error("Manifest ou template introuvable");
  process.exit(1);
}

const manifest = JSON.parse(manifestMatch[1]);
const template = JSON.parse(templateMatch[1]);

console.log(`Manifest: ${Object.keys(manifest).length} assets`);
console.log(`Template type: ${typeof template}`);

// template peut être string ou objet — sauvegarde brute
fs.writeFileSync(
  path.join(OUT_DIR, "template.txt"),
  typeof template === "string" ? template : JSON.stringify(template, null, 2)
);

// Décode chaque asset
const assetsInfo = [];
for (const [uuid, entry] of Object.entries(manifest)) {
  try {
    const binary = Buffer.from(entry.data, "base64");
    const data = entry.compressed ? zlib.gunzipSync(binary) : binary;
    const info = {
      uuid,
      mime: entry.mime,
      sizeKb: Math.round(data.length / 1024),
      compressed: entry.compressed,
    };

    // Pour les images, sauvegarde sur disque
    if (entry.mime.startsWith("image/")) {
      const ext = entry.mime.split("/")[1].split("+")[0];
      const filename = `${uuid}.${ext}`;
      fs.writeFileSync(path.join(OUT_DIR, filename), data);
      info.savedAs = filename;
    } else if (entry.mime.includes("text") || entry.mime.includes("javascript") || entry.mime.includes("html") || entry.mime.includes("css")) {
      // Sauvegarde aussi les fichiers texte pour inspection
      const ext = entry.mime.includes("html") ? "html" : entry.mime.includes("css") ? "css" : entry.mime.includes("javascript") ? "js" : "txt";
      const filename = `${uuid}.${ext}`;
      fs.writeFileSync(path.join(OUT_DIR, filename), data.toString("utf8"));
      info.savedAs = filename;

      // Cherche les mentions de "Cédric" / "fondateur" dans les fichiers texte
      const text = data.toString("utf8").toLowerCase();
      if (text.includes("cédric") || text.includes("cedric") || text.includes("fondateur") || text.includes("founder")) {
        info.containsFounder = true;
      }
    }

    assetsInfo.push(info);
  } catch (e) {
    assetsInfo.push({ uuid, mime: entry.mime, error: String(e) });
  }
}

// Trie les assets : d'abord ceux qui contiennent "founder", puis les images
assetsInfo.sort((a, b) => {
  if (a.containsFounder && !b.containsFounder) return -1;
  if (!a.containsFounder && b.containsFounder) return 1;
  if (a.mime.startsWith("image/") && !b.mime.startsWith("image/")) return -1;
  if (!a.mime.startsWith("image/") && b.mime.startsWith("image/")) return 1;
  return 0;
});

// Rapport
fs.writeFileSync(
  path.join(OUT_DIR, "_INVENTAIRE.txt"),
  assetsInfo
    .map(
      (a) =>
        `${a.containsFounder ? "[FOUNDER]" : "         "} [${(a.mime || "?").padEnd(28)}] ${(a.sizeKb || "?").toString().padStart(5)}kb  ${a.uuid}  ${a.savedAs ?? ""}`
    )
    .join("\n")
);

console.log("\n=== ASSETS CONTENANT 'Cédric' / 'fondateur' ===");
assetsInfo.filter((a) => a.containsFounder).forEach((a) => console.log(`- ${a.uuid} (${a.mime}, ${a.sizeKb}kb)`));

console.log("\n=== IMAGES ===");
assetsInfo.filter((a) => a.mime?.startsWith("image/")).forEach((a) => console.log(`- ${a.uuid} (${a.mime}, ${a.sizeKb}kb) -> ${a.savedAs}`));

console.log(`\n✅ Inventaire complet dans ${OUT_DIR}/_INVENTAIRE.txt`);
console.log(`✅ Template HTML dans ${OUT_DIR}/template.txt`);
