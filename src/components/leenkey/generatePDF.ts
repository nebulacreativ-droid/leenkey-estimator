import jsPDF from "jspdf";
import type { LeenkeyForm } from "./types";
import type { EstimationResult } from "./estimation";
import type { DvfResult } from "./Wizard";

// ─── Palette Leenkey ───
const C = {
  navy: [15, 23, 42] as [number, number, number],
  navySoft: [30, 41, 59] as [number, number, number],
  blue: [17, 86, 252] as [number, number, number],
  blueLight: [59, 130, 246] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  grayLight: [148, 163, 184] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  destructive: [239, 68, 68] as [number, number, number],
  amber: [120, 53, 15] as [number, number, number],
  amberBg: [254, 243, 199] as [number, number, number],
  amberBorder: [252, 211, 77] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "short" });
  } catch {
    return iso;
  }
};

interface PDFData {
  form: LeenkeyForm;
  ref: string;
  r: EstimationResult;
  aiAnalyse?: string;
  dvfData?: DvfResult | null;
}

interface LogoData {
  png: string;
  ratio: number; // width / height
}

// Charge le logo SVG (couleur d'origine ou forcée en blanc) et retourne la PNG + le ratio
async function loadLogo(forceWhite = false): Promise<LogoData | null> {
  try {
    const res = await fetch("/leenkey-logo.svg");
    if (!res.ok) return null;
    let svgText = await res.text();
    if (forceWhite) {
      svgText = svgText
        .replace(/fill="[^"]*"/gi, 'fill="#ffffff"')
        .replace(/#131618|#1156fc/gi, "#ffffff");
    }
    const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);

    return await new Promise<LogoData | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Render à 1200px de large pour garder de la qualité
        const targetWidth = 1200;
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const targetHeight = Math.round(targetWidth / naturalRatio);
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(url);
        resolve({ png: canvas.toDataURL("image/png"), ratio: naturalRatio });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

const TYPE_LABELS: Record<string, string> = {
  maison: "Maison",
  appartement: "Appartement",
  terrain: "Terrain",
  local_commercial: "Local commercial",
  immeuble: "Immeuble",
  atypique: "Bien atypique",
};

const ETAT_LABELS: Record<string, string> = {
  excellent: "Excellent",
  bon: "Bon état",
  moyen: "Moyen",
  a_renover: "A renover",
};

const TENSION_LABELS: Record<string, string> = {
  faible: "Marche detendu",
  moderee: "Marche actif",
  forte: "Marche tendu",
};

const FIAB_LABELS: Record<string, string> = {
  elevee: "Elevee",
  moyenne: "Moyenne",
  faible: "Faible",
};

/**
 * Génère le rapport PDF de valorisation. Async pour charger le logo.
 */
export async function generateReportPDF(data: PDFData): Promise<Blob> {
  const { form, ref, r, aiAnalyse, dvfData } = data;
  const [logo, logoWhite] = await Promise.all([loadLogo(false), loadLogo(true)]);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setFont("helvetica", "normal");

  const PW = doc.internal.pageSize.getWidth(); // 210
  const PH = doc.internal.pageSize.getHeight(); // 297
  const M = 18; // marges

  // ─── Helpers de dessin ───
  const setColor = (rgb: [number, number, number], type: "text" | "fill" | "draw" = "text") => {
    if (type === "text") doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    if (type === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    if (type === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  };

  // Place le logo à une position donnée en préservant l'aspect ratio
  const placeLogo = (
    logoData: LogoData | null,
    x: number,
    yPos: number,
    heightMm: number,
    fallbackText: string,
    fallbackColor: [number, number, number]
  ) => {
    if (logoData) {
      try {
        const widthMm = heightMm * logoData.ratio;
        doc.addImage(logoData.png, "PNG", x, yPos, widthMm, heightMm);
        return widthMm;
      } catch {
        // fallback
      }
    }
    setColor(fallbackColor, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.round(heightMm * 1.8));
    doc.text(fallbackText, x, yPos + heightMm - 1);
    return 22;
  };

  const drawHeader = (pageNum: number, totalPages: number) => {
    // Bande haute discrete
    setColor(C.bgLight, "fill");
    doc.rect(0, 0, PW, 14, "F");

    // Logo gauche (hauteur 6mm, ratio préservé)
    placeLogo(logo, M, 4, 6, "leenkey", C.navy);

    // Ref + date à droite
    setColor(C.gray, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Ref. ${ref}`, PW - M, 7, { align: "right" });
    doc.text(`Edite le ${new Date().toLocaleDateString("fr-FR")}`, PW - M, 11, { align: "right" });

    // Ligne séparatrice
    setColor(C.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(M, 14, PW - M, 14);

    // Footer
    setColor(C.grayLight, "text");
    doc.setFontSize(7);
    doc.text(`Leenkey - Rapport de valorisation`, M, PH - 7);
    doc.text(`${pageNum} / ${totalPages}`, PW - M, PH - 7, { align: "right" });
  };

  // Texte sécurisé (retire les emojis + diacritiques problématiques)
  const safe = (s: string) =>
    s
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  // Petit pictogramme géométrique (carré coloré au lieu d'emoji)
  const drawSquareIcon = (x: number, y: number, color: [number, number, number]) => {
    setColor(color, "fill");
    doc.roundedRect(x, y, 3.5, 3.5, 0.8, 0.8, "F");
  };

  // ═══════════════════════════════════════════════════════
  // PAGE 1 — Couverture
  // ═══════════════════════════════════════════════════════
  let y = 0;

  // Bandeau hero dégradé (simulé en plusieurs bandes)
  setColor(C.blue, "fill");
  doc.rect(0, 0, PW, 80, "F");
  setColor(C.purple, "fill");
  doc.rect(0, 70, PW, 12, "F");

  // Logo blanc en haut (hauteur 12mm, ratio préservé)
  placeLogo(logoWhite, M, 16, 12, "leenkey", C.white);

  // Date + ref à droite
  setColor(C.white, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Reference dossier`, PW - M, 19, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(ref, PW - M, 25, { align: "right" });

  // Titre principal
  setColor(C.white, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Rapport de valorisation", M, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Analyse personnalisee de la valeur de votre bien immobilier", M, 60);

  y = 100;

  // Carte propriétaire
  setColor(C.bgLight, "fill");
  setColor(C.border, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, PW - 2 * M, 28, 3, 3, "FD");

  setColor(C.gray, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PROPRIETAIRE", M + 6, y + 7);

  setColor(C.navy, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(safe(`${form.prenom} ${form.nom}`), M + 6, y + 16);

  setColor(C.gray, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${form.email}${form.telephone ? "  -  " + form.telephone : ""}`, M + 6, y + 23);

  y += 36;

  // Carte bien
  setColor(C.bgLight, "fill");
  setColor(C.border, "draw");
  doc.roundedRect(M, y, PW - 2 * M, 38, 3, 3, "FD");

  setColor(C.gray, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BIEN ANALYSE", M + 6, y + 7);

  setColor(C.navy, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
    `${TYPE_LABELS[form.type ?? "maison"]} - ${r.surface} m2`,
    M + 6,
    y + 15
  );

  setColor(C.gray, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const addr = `${form.adresse || ""}${form.code_postal ? ", " + form.code_postal : ""} ${form.ville || ""}`.trim();
  doc.text(safe(addr), M + 6, y + 22);

  doc.setFontSize(9);
  setColor(C.navySoft, "text");
  const detailLine = [
    form.pieces ? `${form.pieces} pieces` : null,
    form.chambres ? `${form.chambres} chambres` : null,
    form.salles_bain ? `${form.salles_bain} SDB` : null,
    form.dpe ? `DPE ${form.dpe}` : null,
    form.etat ? ETAT_LABELS[form.etat] : null,
  ]
    .filter(Boolean)
    .join("  -  ");
  doc.text(detailLine, M + 6, y + 29);

  // Atouts
  const atouts = [...form.exterieur, ...form.prestations];
  if (atouts.length) {
    setColor(C.blue, "text");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(safe("Atouts : " + atouts.slice(0, 6).join(", ")), M + 6, y + 35, {
      maxWidth: PW - 2 * M - 12,
    });
  }

  y += 48;

  // Box valorisation principale
  setColor(C.blue, "fill");
  doc.roundedRect(M, y, PW - 2 * M, 56, 4, 4, "F");

  setColor(C.white, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("VALEUR ESTIMEE DE VOTRE BIEN", M + 8, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text(safe(fmtEUR(r.prixEstime)), M + 8, y + 24);

  // Range bar visuel
  const rangePct = Math.round(((r.prixHaut - r.prixEstime) / r.prixEstime) * 100);
  setColor([255, 255, 255], "fill");
  doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.3 }));
  doc.roundedRect(M + 8, y + 35, PW - 2 * M - 16, 2, 1, 1, "F");
  doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 1 }));
  // Marker central
  setColor(C.white, "fill");
  const markerX = M + 8 + (PW - 2 * M - 16) / 2;
  doc.circle(markerX, y + 36, 1.8, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(safe(fmtEUR(r.prixBas)), M + 8, y + 43);
  doc.text(`+/- ${rangePct}% precision`, markerX, y + 43, { align: "center" });
  doc.text(safe(fmtEUR(r.prixHaut)), PW - M - 8, y + 43, { align: "right" });

  // Footer du bloc : prix m² et fiabilité
  doc.setFontSize(9);
  doc.text(`${fmtNum(r.prixM2)} EUR/m2`, M + 8, y + 51);
  doc.text(`Fiabilite : ${FIAB_LABELS[r.fiabilite]} (${r.fiabiliteScore}%)`, PW - M - 8, y + 51, { align: "right" });

  // Footer page 1 — index
  y = PH - 35;
  setColor(C.gray, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DANS CE RAPPORT", M, y);

  setColor(C.navy, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const tocItems = [
    "Page 2  -  Analyse de marche et facteurs",
    "Page 3  -  Strategie de vente et recommandations",
    "Page 4  -  Plan d'action sur 7 jours",
  ];
  tocItems.forEach((t, i) => {
    doc.text(t, M, y + 7 + i * 6);
  });

  // Footer page 1 simple (PAS de header avec logo, déjà dans la cover)
  setColor(C.grayLight, "text");
  doc.setFontSize(7);
  doc.text("Leenkey - Rapport de valorisation", M, PH - 7);
  doc.text("1 / 4", PW - M, PH - 7, { align: "right" });

  // ═══════════════════════════════════════════════════════
  // PAGE 2 — Analyse de marché
  // ═══════════════════════════════════════════════════════
  doc.addPage();
  y = 24;

  setColor(C.blue, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ANALYSE DE MARCHE", M, y);
  y += 8;
  setColor(C.navy, "text");
  doc.setFontSize(22);
  doc.text("Votre bien sur le marche", M, y);
  y += 12;

  // 4 KPIs en grille 2x2 (style dashboard)
  const kpiW = (PW - 2 * M - 5) / 2;
  const kpiH = 26;
  const drawKpi = (
    x: number,
    ky: number,
    label: string,
    value: string,
    sub: string,
    tone: "pos" | "neg" | "neutral" = "neutral"
  ) => {
    setColor(C.bgLight, "fill");
    setColor(C.border, "draw");
    doc.setLineWidth(0.3);
    doc.roundedRect(x, ky, kpiW, kpiH, 3, 3, "FD");

    // Trait coloré bas
    const accent = tone === "pos" ? C.success : tone === "neg" ? C.destructive : C.blue;
    setColor(accent, "fill");
    doc.rect(x, ky + kpiH - 1, kpiW, 1, "F");

    setColor(C.gray, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + 5, ky + 7);

    setColor(tone === "pos" ? C.success : tone === "neg" ? C.destructive : C.navy, "text");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(safe(value), x + 5, ky + 16);

    setColor(C.gray, "text");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(safe(sub), x + 5, ky + 22);
  };

  drawKpi(
    M,
    y,
    "vs marche local",
    `${r.deltaMarche >= 0 ? "+" : ""}${r.deltaMarche}%`,
    `Moy. ${fmtNum(r.prixM2Marche)} EUR/m2`,
    r.deltaMarche >= 0 ? "pos" : "neg"
  );
  drawKpi(M + kpiW + 5, y, "Delai attendu", r.delaiVente, "A prix de marche");
  y += kpiH + 5;
  drawKpi(
    M,
    y,
    "Score d'attractivite",
    `${r.scoreAttractivite}/100`,
    "DPE, etat, prestations",
    r.scoreAttractivite >= 70 ? "pos" : r.scoreAttractivite >= 50 ? "neutral" : "neg"
  );
  drawKpi(
    M + kpiW + 5,
    y,
    "Tension marche",
    TENSION_LABELS[r.tensionMarche],
    `Departement ${(form.departement || form.code_postal || "").slice(0, 2) || "—"}`
  );
  y += kpiH + 10;

  // Analyse IA
  if (aiAnalyse) {
    setColor(C.blue, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Analyse contextuelle", M, y);
    y += 6;
    setColor(C.gray, "text");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Generee par IA - base sur les caracteristiques de votre bien", M, y);
    y += 6;

    setColor(C.bgLight, "fill");
    const textHeight = Math.max(20, doc.getTextDimensions(aiAnalyse, { maxWidth: PW - 2 * M - 12 }).h + 8);
    doc.roundedRect(M, y, PW - 2 * M, textHeight, 3, 3, "F");

    setColor(C.navySoft, "text");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(safe(aiAnalyse), PW - 2 * M - 12);
    doc.text(lines, M + 6, y + 6);
    y += textHeight + 10;
  }

  // Facteurs avec barres
  setColor(C.blue, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Facteurs de valorisation", M, y);
  y += 6;
  setColor(C.gray, "text");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Impact estime de chaque critere par rapport au prix de marche", M, y);
  y += 8;

  r.facteurs.forEach((f) => {
    if (y > PH - 30) return;
    const pos = f.impact >= 0;

    setColor(C.navy, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(safe(f.label), M, y);

    setColor(pos ? C.success : C.destructive, "text");
    doc.setFontSize(10);
    doc.text(`${pos ? "+" : ""}${f.impact}%`, PW - M, y, { align: "right" });

    // Barre divergente : milieu à 0, droite = positif, gauche = négatif
    const barY = y + 2;
    const barW = PW - 2 * M;
    const barH = 2;
    const center = M + barW / 2;
    setColor(C.bgLight, "fill");
    doc.roundedRect(M, barY, barW, barH, 1, 1, "F");
    setColor(C.border, "fill");
    doc.rect(center - 0.15, barY, 0.3, barH, "F");

    const impactWidth = Math.min(Math.abs(f.impact) * 4, 50) / 100 * (barW / 2);
    setColor(pos ? C.success : C.destructive, "fill");
    if (pos) {
      doc.roundedRect(center, barY, impactWidth, barH, 1, 1, "F");
    } else {
      doc.roundedRect(center - impactWidth, barY, impactWidth, barH, 1, 1, "F");
    }

    setColor(C.gray, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(safe(f.detail), M, y + 8, { maxWidth: PW - 2 * M });
    y += 14;
  });

  drawHeader(2, 4);

  // ═══════════════════════════════════════════════════════
  // PAGE 3 — Stratégie + Recommandations + DVF
  // ═══════════════════════════════════════════════════════
  doc.addPage();
  y = 24;

  setColor(C.blue, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("STRATEGIE DE VENTE", M, y);
  y += 8;
  setColor(C.navy, "text");
  doc.setFontSize(22);
  doc.text("Vos deux scenarios de vente", M, y);
  y += 12;

  // Scénario 1 — Prix ambitieux
  const prixAmbitieux = Math.round(r.prixHaut / 1000) * 1000;
  setColor(C.bgLight, "fill");
  setColor(C.blue, "draw");
  doc.setLineWidth(0.6);
  doc.roundedRect(M, y, PW - 2 * M, 36, 3, 3, "FD");

  drawSquareIcon(M + 6, y + 6, C.blue);
  setColor(C.blue, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SCENARIO PRIX AMBITIEUX", M + 12, y + 9);

  setColor(C.navy, "text");
  doc.setFontSize(18);
  doc.text(safe(fmtEUR(prixAmbitieux)), M + 6, y + 19);

  setColor(C.gray, "text");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Delai estime : 90 a 150 jours", M + 6, y + 26);

  setColor(C.navySoft, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    safe("Recommande si vous n'avez pas de contrainte de delai et souhaitez tester le marche au prix fort."),
    M + 6,
    y + 32,
    { maxWidth: PW - 2 * M - 12 }
  );

  y += 42;

  // Scénario 2 — Vente rapide
  const prixRapide = Math.round(r.prixBas / 1000) * 1000;
  setColor(C.bgLight, "fill");
  setColor(C.purple, "draw");
  doc.roundedRect(M, y, PW - 2 * M, 36, 3, 3, "FD");

  drawSquareIcon(M + 6, y + 6, C.purple);
  setColor(C.purple, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SCENARIO VENTE RAPIDE", M + 12, y + 9);

  setColor(C.navy, "text");
  doc.setFontSize(18);
  doc.text(safe(fmtEUR(prixRapide)), M + 6, y + 19);

  setColor(C.gray, "text");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Delai estime : ${r.delaiVente}`, M + 6, y + 26);

  setColor(C.navySoft, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    safe("Recommande si vous souhaitez vendre rapidement, avec un prix attractif des la mise en ligne."),
    M + 6,
    y + 32,
    { maxWidth: PW - 2 * M - 12 }
  );

  y += 46;

  // Recommandations
  if (r.recommandations.length) {
    setColor(C.blue, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Recommandations cles", M, y);
    y += 8;

    r.recommandations.forEach((rec, i) => {
      if (y > PH - 35) return;

      // Numéro en cercle
      setColor(C.blue, "fill");
      doc.circle(M + 3, y + 1, 3, "F");
      setColor(C.white, "text");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(i + 1), M + 3, y + 2.3, { align: "center" });

      setColor(C.navy, "text");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(safe(rec.title), M + 9, y + 2.5);

      setColor(C.gray, "text");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const recLines = doc.splitTextToSize(safe(rec.description), PW - 2 * M - 12);
      doc.text(recLines, M + 9, y + 8);
      y += 8 + recLines.length * 4;

      if (rec.uplift) {
        setColor(C.success, "fill");
        doc.roundedRect(M + 9, y + 1, 32, 5, 1, 1, "F");
        setColor(C.white, "text");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(safe(`Gain potentiel : ${rec.uplift}`), M + 11, y + 4.5);
        y += 9;
      }
      y += 5;
    });
  }

  drawHeader(3, 4);

  // ═══════════════════════════════════════════════════════
  // PAGE 4 — Plan d'action + DVF + Disclaimer
  // ═══════════════════════════════════════════════════════
  doc.addPage();
  y = 24;

  setColor(C.blue, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PLAN D'ACTION", M, y);
  y += 8;
  setColor(C.navy, "text");
  doc.setFontSize(22);
  doc.text("Vos 7 prochains jours", M, y);
  y += 12;

  const plan7Jours = [
    {
      titre: "Reunir les diagnostics obligatoires",
      desc: "DPE, ERP, electricite, gaz, plomb, amiante, termites selon votre zone. Budget 200 a 500 EUR.",
    },
    {
      titre: "Preparer le dossier copropriete",
      desc: "Demandez au syndic : pre-etat date, PV des AG, reglement de copropriete, fonds travaux.",
    },
    {
      titre: "Photos professionnelles et home staging leger",
      desc: "Desencombrez, depersonnalisez. Photos en lumiere naturelle avec un objectif grand-angle.",
    },
    {
      titre: "Rediger l'annonce",
      desc: "Titre accrocheur, description precise (surface Carrez, exposition, etage, atouts cles).",
    },
    {
      titre: "Diffusion multi-portails",
      desc: "SeLoger, LeBonCoin, Bien'ici, PAP. Suivez les statistiques de chaque annonce.",
    },
    {
      titre: "Preparer le tableau des visites",
      desc: "Calendrier de disponibilites, fiche bien : prix, charges, taxe fonciere, travaux recents.",
    },
    {
      titre: "Premieres visites et qualification",
      desc: "Verifiez le serieux : projet immobilier precis, mode de financement, simulation bancaire.",
    },
  ];

  plan7Jours.forEach((step, i) => {
    if (y > PH - 50) return;

    // Pastille jour
    setColor(C.blue, "fill");
    doc.circle(M + 4, y + 3.5, 4, "F");
    setColor(C.white, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`J${i + 1}`, M + 4, y + 4.8, { align: "center" });

    setColor(C.navy, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(safe(step.titre), M + 12, y + 4);

    setColor(C.gray, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const descLines = doc.splitTextToSize(safe(step.desc), PW - 2 * M - 14);
    doc.text(descLines, M + 12, y + 9);
    y += 10 + descLines.length * 4 + 3;
  });

  // DVF si dispo
  if (dvfData?.available && dvfData.comparables.length > 0 && y < PH - 60) {
    y += 4;
    setColor(C.blue, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Ventes reelles dans votre secteur", M, y);
    y += 5;
    setColor(C.gray, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Source : DVF (data.gouv.fr) - ${dvfData.nbComparables} ventes comparables`, M, y);
    y += 7;

    // Header tableau
    setColor(C.bgLight, "fill");
    doc.rect(M, y, PW - 2 * M, 6, "F");
    setColor(C.gray, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("DATE", M + 3, y + 4);
    doc.text("TYPE", M + 30, y + 4);
    doc.text("SURFACE", M + 70, y + 4);
    doc.text("PRIX", M + 100, y + 4);
    doc.text("EUR/M2", M + 140, y + 4);
    y += 6;

    dvfData.comparables.slice(0, 5).forEach((c) => {
      if (y > PH - 35) return;
      setColor(C.border, "draw");
      doc.line(M, y, PW - M, y);
      setColor(C.navy, "text");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(safe(fmtDate(c.date)), M + 3, y + 4);
      doc.text(safe(c.type.slice(0, 12)), M + 30, y + 4);
      doc.text(`${c.surface} m2`, M + 70, y + 4);
      doc.setFont("helvetica", "bold");
      doc.text(safe(fmtEUR(c.prix)), M + 100, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text(fmtNum(c.prixM2), M + 140, y + 4);
      y += 6;
    });
  }

  // Disclaimer en bas de page 4
  const disclaimerH = 32;
  const disclaimerY = PH - disclaimerH - 16;
  setColor(C.amberBg, "fill");
  setColor(C.amberBorder, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(M, disclaimerY, PW - 2 * M, disclaimerH, 2, 2, "FD");

  setColor(C.amber, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("AVERTISSEMENT LEGAL", M + 4, disclaimerY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const disclaimer = safe(
    "Ce document constitue une analyse automatisee basee sur les informations renseignees et les donnees de marche disponibles. Il est fourni a titre informatif uniquement et ne constitue ni une expertise immobiliere ni une estimation realisee par un professionnel habilite au sens de la loi Hoguet. Les valeurs indiquees sont des ordres de grandeur basees sur des modeles statistiques et peuvent differer significativement du prix reel de vente. Pour une evaluation officielle opposable, consultez un expert immobilier agree ou un notaire."
  );
  const disLines = doc.splitTextToSize(disclaimer, PW - 2 * M - 8);
  doc.text(disLines, M + 4, disclaimerY + 11);

  drawHeader(4, 4);

  return doc.output("blob");
}

/**
 * Télécharge le rapport PDF.
 */
export async function downloadReportPDF(data: PDFData) {
  const blob = await generateReportPDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rapport-valorisation-${data.form.nom || "Leenkey"}-${data.ref}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génère le PDF et retourne son contenu en base64 (pour envoi via API).
 */
export async function generateReportPDFBase64(
  data: PDFData
): Promise<{ base64: string; filename: string }> {
  const blob = await generateReportPDF(data);
  const arrayBuffer = await blob.arrayBuffer();
  // Convertit ArrayBuffer → base64 (en chunks pour éviter le stack overflow sur gros PDFs)
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  const filename = `Rapport-valorisation-${data.form.nom || "Leenkey"}-${data.ref}.pdf`;
  return { base64, filename };
}
