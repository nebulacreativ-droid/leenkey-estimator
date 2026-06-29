import { useEffect, useRef, useState } from "react";

// ──────────────────────────────────────────────────────────────────────
//   Cache mémoire global (partagé entre toutes les navigations)
//   - pageCache : HTML brut fetché une seule fois par src
//   - installedSources : src dont les styles ont déjà été injectés dans <head>
// ──────────────────────────────────────────────────────────────────────
const pageCache = new Map<string, string>();
const installedSources = new Set<string>();
const inflightFetches = new Map<string, Promise<string>>();

function resolveUrl(rawUrl: string, baseDir: string): string {
  if (!rawUrl) return rawUrl;
  if (
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://") ||
    rawUrl.startsWith("//") ||
    rawUrl.startsWith("data:") ||
    rawUrl.startsWith("/") ||
    rawUrl.startsWith("#")
  ) {
    return rawUrl;
  }
  return baseDir + rawUrl;
}

/** Récupère le HTML, met en cache. Pas de double fetch concurrent. */
function fetchPage(src: string): Promise<string> {
  const cached = pageCache.get(src);
  if (cached) return Promise.resolve(cached);

  const inflight = inflightFetches.get(src);
  if (inflight) return inflight;

  const p = fetch(src)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((html) => {
      pageCache.set(src, html);
      inflightFetches.delete(src);
      return html;
    })
    .catch((e) => {
      inflightFetches.delete(src);
      throw e;
    });

  inflightFetches.set(src, p);
  return p;
}

/**
 * Pré-installe les styles d'une page dans <head> et attend qu'ils soient chargés.
 * Retourne une promesse résolue quand toutes les <link rel="stylesheet"> sont prêtes.
 * Une fois installé, idempotent (résolu instantanément à la 2ème appel).
 */
function installStyles(src: string, html: string): Promise<void> {
  if (installedSources.has(src)) return Promise.resolve();
  installedSources.add(src);

  const baseDir = src.substring(0, src.lastIndexOf("/") + 1);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const linkPromises: Promise<void>[] = [];

  // <link rel="stylesheet">
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const rawHref = link.getAttribute("href");
    if (!rawHref) return;
    const href = resolveUrl(rawHref, baseDir);
    if (document.querySelector(`link[href="${href}"]`)) return;
    const newLink = document.createElement("link");
    newLink.rel = "stylesheet";
    newLink.href = href;
    newLink.setAttribute("data-htmlpage", src);

    const p = new Promise<void>((resolve) => {
      newLink.addEventListener("load", () => resolve(), { once: true });
      newLink.addEventListener("error", () => resolve(), { once: true }); // fail silently
      // Safety timeout : ne bloque jamais plus de 2 secondes
      setTimeout(() => resolve(), 2000);
    });
    linkPromises.push(p);
    document.head.appendChild(newLink);
  });

  // <style> inline (synchronous, pas besoin d'attendre)
  doc.querySelectorAll("style").forEach((style) => {
    const newStyle = document.createElement("style");
    newStyle.textContent = style.textContent;
    newStyle.setAttribute("data-htmlpage", src);
    document.head.appendChild(newStyle);
  });

  return Promise.all(linkPromises).then(() => undefined);
}

/** Précharge l'HTML + ses styles en idle, sans bloquer */
export function preloadPage(src: string) {
  fetchPage(src)
    .then((html) => installStyles(src, html))
    .catch(() => {
      /* silent */
    });
}

/** Marqueur pour savoir si une page est entièrement prête (HTML + CSS chargés) */
const readyPages = new Set<string>();

/** Composant : injecte le HTML d'une page dans le DOM */
export function HtmlPage({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(!readyPages.has(src));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const baseDir = src.substring(0, src.lastIndexOf("/") + 1);

    const INTERNAL_HOSTS = [
      "leenkey-estimator.vercel.app",
      "leenkey-estimator-main.vercel.app",
    ];
    const isLegacyEstimatorDomain = (host: string) =>
      host === "leenkey-estimator.vercel.app";
    const URL_MAP: Record<string, string> = {
      "/estimer": "/estimer",
      "/concept": "/concept",
      "/investir": "/investir",
    };

    fetchPage(src)
      .then(async (html) => {
        if (cancelled || !container) return;

        // ⏳ Attendre que TOUS les styles soient chargés avant d'injecter le HTML
        //    (évite le FOUC — flash de contenu non stylé)
        await installStyles(src, html);
        if (cancelled || !container) return;

        // Parse + injecter le body
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Réécrire les URLs relatives des images
        doc.body.querySelectorAll("img[src]").forEach((img) => {
          const rawSrc = img.getAttribute("src");
          if (rawSrc) img.setAttribute("src", resolveUrl(rawSrc, baseDir));
        });
        doc.body.querySelectorAll("img[srcset]").forEach((img) => {
          const rawSrcset = img.getAttribute("srcset");
          if (rawSrcset) {
            const fixed = rawSrcset
              .split(",")
              .map((part) => {
                const trimmed = part.trim();
                const [url, descriptor] = trimmed.split(/\s+/);
                return resolveUrl(url, baseDir) + (descriptor ? ` ${descriptor}` : "");
              })
              .join(", ");
            img.setAttribute("srcset", fixed);
          }
        });

        // Réécrire les liens internes
        doc.body.querySelectorAll("a[href]").forEach((a) => {
          const rawHref = a.getAttribute("href") ?? "";
          if (!rawHref) return;

          let internalPath: string | null = null;
          let isLegacyDomain = false;
          try {
            if (rawHref.startsWith("http://") || rawHref.startsWith("https://")) {
              const u = new URL(rawHref);
              if (INTERNAL_HOSTS.includes(u.hostname)) {
                internalPath = (u.pathname || "/") + (u.hash || "");
                isLegacyDomain = isLegacyEstimatorDomain(u.hostname);
              }
            } else if (rawHref.startsWith("/")) {
              internalPath = rawHref;
            }
          } catch {
            /* ignore */
          }

          if (internalPath) {
            const cleanPath = internalPath.split("#")[0] || "/";
            const hash = internalPath.includes("#")
              ? "#" + internalPath.split("#")[1]
              : "";
            let mappedPath: string;
            if (isLegacyDomain && cleanPath === "/") {
              mappedPath = "/estimer";
            } else {
              mappedPath = URL_MAP[cleanPath] ?? cleanPath;
            }
            a.setAttribute("href", mappedPath + hash);
            a.removeAttribute("target");
            a.removeAttribute("rel");
          }
        });

        // Injecter le body
        container.innerHTML = doc.body.innerHTML;

        // Liste des scripts dev à BLOQUER (outils Lovable / Babel runtime / etc.)
        const BLOCKED_SCRIPT_PATTERNS = [
          /tweaks/i,
          /babel\/standalone/i,
          /unpkg\.com\/react/i,
          /unpkg\.com\/react-dom/i,
        ];
        const isBlocked = (src: string, content: string | null) => {
          for (const re of BLOCKED_SCRIPT_PATTERNS) {
            if (src && re.test(src)) return true;
            if (content && re.test(content)) return true;
          }
          return false;
        };

        // Réexécuter les scripts (sauf ceux bloqués)
        container.querySelectorAll("script").forEach((oldScript) => {
          const rawSrc = oldScript.getAttribute("src") ?? "";
          const content = oldScript.textContent ?? "";
          if (isBlocked(rawSrc, content)) {
            oldScript.remove();
            return;
          }

          const newScript = document.createElement("script");
          for (const attr of Array.from(oldScript.attributes)) {
            if (attr.name === "src") {
              newScript.src = resolveUrl(attr.value, baseDir);
            } else if (attr.name === "integrity") {
              // Skip integrity (URLs réécrites peuvent ne plus matcher)
              continue;
            } else {
              newScript.setAttribute(attr.name, attr.value);
            }
          }
          if (!oldScript.src) {
            newScript.textContent = oldScript.textContent;
          }
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });

        // ─────────────────────────────────────────────────────────────
        // Interception des formulaires → POST vers /api/contact
        // ─────────────────────────────────────────────────────────────
        const forms = container.querySelectorAll("form");
        forms.forEach((form) => {
          // Détermine la source du form selon son ID ou la page
          let source = "contact";
          const formId = form.id || "";
          if (formId.toLowerCase().includes("invest")) source = "investir";
          else if (src.includes("investir")) source = "investir";
          else if (src.includes("concept")) source = "concept";

          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector(
              'button[type="submit"], input[type="submit"]'
            ) as HTMLButtonElement | null;
            const originalLabel = submitBtn?.textContent ?? "";

            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = "Envoi en cours…";
            }

            // Collecte des champs
            const formData = new FormData(form as HTMLFormElement);
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
              // Gestion des checkboxes multiples / arrays
              if (key in data) {
                const existing = data[key];
                if (Array.isArray(existing)) existing.push(value);
                else data[key] = [existing, value];
              } else {
                data[key] = value;
              }
            });

            try {
              const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source, data }),
              });

              if (res.ok) {
                // Affichage succès : cherche .form-success dans le DOM ou crée un message
                const successEl = form.parentElement?.querySelector(".form-success") as HTMLElement | null;
                if (successEl) {
                  (form as HTMLElement).style.display = "none";
                  successEl.style.display = "block";
                } else {
                  // Fallback : message inline
                  const msg = document.createElement("div");
                  msg.style.cssText =
                    "padding:16px;background:#d1fae5;border:1px solid #10b981;border-radius:10px;color:#065f46;font-weight:600;text-align:center;margin-top:16px;";
                  msg.textContent = "✓ Message envoyé ! Nous revenons vers vous rapidement.";
                  form.appendChild(msg);
                  (form as HTMLFormElement).reset();
                  if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Envoyé ✓";
                  }
                }
              } else {
                const errMsg = document.createElement("div");
                errMsg.style.cssText =
                  "padding:12px;background:#fee2e2;border:1px solid #ef4444;border-radius:10px;color:#991b1b;font-weight:600;margin-top:12px;";
                errMsg.textContent = "Erreur d'envoi. Réessayez ou contactez-nous par email.";
                form.appendChild(errMsg);
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.textContent = originalLabel;
                }
              }
            } catch {
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalLabel;
              }
            }
          });
        });

        // ─────────────────────────────────────────────────────────────
        // Injection du CSS d'animations (une seule fois par session)
        // ─────────────────────────────────────────────────────────────
        if (!document.querySelector('link[data-lk-anim="1"]')) {
          const animLink = document.createElement("link");
          animLink.rel = "stylesheet";
          animLink.href = "/pages/leenkey-animations.css";
          animLink.setAttribute("data-lk-anim", "1");
          document.head.appendChild(animLink);
        }

        // ─────────────────────────────────────────────────────────────
        // Découpage mot-à-mot des gros titres (H1, H2)
        // ─────────────────────────────────────────────────────────────
        const bigHeadings = container.querySelectorAll(
          "h1.h1-display, h1.h1, section h2, .hero-copy h1, .hero-copy .h1, .hero-copy .h1-display, .section-head h2, .constat-head h2"
        );
        bigHeadings.forEach((heading) => {
          // Ne pas re-traiter si déjà fait
          if (heading.querySelector(".lk-word")) return;

          // On parcourt les noeuds enfants pour préserver les balises (br, em, etc.)
          // ⚠️ Les .text-grad ne sont PAS découpés (sinon le dégradé background-clip:text
          // ne fonctionne plus). On les anime comme un bloc unique.
          const wrapTextNodesWithWords = (node: Node) => {
            const children = Array.from(node.childNodes);
            children.forEach((child) => {
              if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent ?? "";
                if (!text.trim()) return;
                const frag = document.createDocumentFragment();
                const words = text.split(/(\s+)/);
                words.forEach((w) => {
                  if (/^\s+$/.test(w)) {
                    frag.appendChild(document.createTextNode(w));
                  } else if (w) {
                    const span = document.createElement("span");
                    span.className = "lk-word";
                    span.textContent = w;
                    frag.appendChild(span);
                  }
                });
                child.parentNode?.replaceChild(frag, child);
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                const el = child as Element;
                if (el.tagName === "BR") return;
                // ⚠️ NE PAS recurser dans .text-grad (background-clip:text casse)
                // On le traite comme un seul "mot" en lui ajoutant la classe .lk-word.
                if (el.classList.contains("text-grad")) {
                  el.classList.add("lk-word");
                  return;
                }
                // Pour les autres éléments (em, strong, span normaux) : recurser
                wrapTextNodesWithWords(el);
              }
            });
          };
          wrapTextNodesWithWords(heading);

          // Définir un delay décalé sur chaque mot
          const words = heading.querySelectorAll(".lk-word");
          words.forEach((w, i) => {
            (w as HTMLElement).style.transitionDelay = `${i * 50}ms`;
          });
        });

        // ─────────────────────────────────────────────────────────────
        // Compteurs animés : transforme tout nombre dans certains éléments
        // ─────────────────────────────────────────────────────────────
        const counterSelectors =
          ".ihs-num, .pc-num, .kpi-chip, .proof-num, .stat-num, .ec-big, .pa-num";
        const counterEls = container.querySelectorAll(counterSelectors);
        counterEls.forEach((el) => {
          // Marquer pour animation au scroll (handled below)
          el.setAttribute("data-lk-counter", "1");
        });

        // FIX : les pages Lovable utilisent class="reveal" (opacity:0 par défaut)
        // que des scripts externes manquants devraient révéler via IntersectionObserver.
        // On simule ce comportement nous-mêmes.
        const reveals = container.querySelectorAll(".reveal");
        // ─────────────────────────────────────────────────────────────
        // Reveal + Word reveal + Compteurs animés au scroll
        // ─────────────────────────────────────────────────────────────
        const wordHeadings = container.querySelectorAll(
          "h1.h1-display, h1.h1, h1, section h2, .section-head h2, .constat-head h2"
        );
        const allCounterEls = container.querySelectorAll("[data-lk-counter]");

        // Helper : compteur animé (compte de 0 à valeur cible en ~1.4s)
        const animateCounter = (el: Element) => {
          const text = (el.textContent ?? "").trim();
          // Extrait le 1er nombre du texte (gère espaces fins, séparateurs)
          const cleaned = text.replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.\-+%€]/g, "");
          const match = cleaned.match(/-?\d+(?:\.\d+)?/);
          if (!match) return;
          const target = parseFloat(match[0]);
          if (isNaN(target)) return;
          const originalText = text;
          const fmt = (n: number) => {
            const isInt = !originalText.includes(".") && !originalText.includes(",");
            const rounded = isInt ? Math.round(n) : Math.round(n * 10) / 10;
            // Préserver le format original (€, %, etc.)
            return originalText.replace(/-?\d[\d\s.,]*/, (orig) => {
              const hasSpaceSeparator = /\s/.test(orig);
              if (hasSpaceSeparator) {
                return new Intl.NumberFormat("fr-FR").format(rounded);
              }
              return String(rounded).replace(".", isInt ? "" : ",");
            });
          };
          const duration = 1400;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            el.textContent = fmt(current);
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              el.textContent = originalText; // garantir le rendu final exact
            }
          };
          el.classList.add("counting");
          requestAnimationFrame(step);
        };

        if ("IntersectionObserver" in window) {
          // 1) Reveal classique
          const io = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("in");
                  io.unobserve(entry.target);
                }
              });
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
          );
          reveals.forEach((el) => io.observe(el));

          // 2) Animation mot-à-mot des titres
          const wordIo = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  const words = entry.target.querySelectorAll(".lk-word");
                  words.forEach((w) => w.classList.add("in"));
                  wordIo.unobserve(entry.target);
                }
              });
            },
            { rootMargin: "0px 0px -15% 0px", threshold: 0.15 }
          );
          wordHeadings.forEach((el) => wordIo.observe(el));

          // 3) Compteurs animés
          const counterIo = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  animateCounter(entry.target);
                  counterIo.unobserve(entry.target);
                }
              });
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.3 }
          );
          allCounterEls.forEach((el) => counterIo.observe(el));

          // Sécurité : éléments déjà visibles au chargement
          requestAnimationFrame(() => {
            reveals.forEach((el) => {
              const rect = (el as HTMLElement).getBoundingClientRect();
              if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add("in");
              }
            });
            wordHeadings.forEach((el) => {
              const rect = (el as HTMLElement).getBoundingClientRect();
              if (rect.top < window.innerHeight * 0.9) {
                el.querySelectorAll(".lk-word").forEach((w) => w.classList.add("in"));
              }
            });
          });
        } else {
          // Fallback : tout révéler d'un coup
          reveals.forEach((el) => el.classList.add("in"));
          wordHeadings.forEach((el) =>
            el.querySelectorAll(".lk-word").forEach((w) => w.classList.add("in"))
          );
        }

        // ─────────────────────────────────────────────────────────────
        // Parallax léger sur les images hero
        // ─────────────────────────────────────────────────────────────
        const parallaxEls = container.querySelectorAll(".hero-bg, .hero-photo");
        if (parallaxEls.length > 0 && !("ontouchstart" in window)) {
          let ticking = false;
          const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
              const scrollY = window.scrollY;
              parallaxEls.forEach((el) => {
                const rect = (el as HTMLElement).getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < window.innerHeight) {
                  const offset = scrollY * 0.15;
                  (el as HTMLElement).style.transform = `translate3d(0, ${offset}px, 0) scale(1.06)`;
                }
              });
              ticking = false;
            });
          };
          window.addEventListener("scroll", onScroll, { passive: true });
        }

        // Marquer la page comme prête (HTML + CSS chargés) et révéler
        readyPages.add(src);
        setLoading(false);

        // Scroll vers ancre si présente
        if (window.location.hash) {
          setTimeout(() => {
            try {
              const el = document.querySelector(window.location.hash);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            } catch {
              /* ignore */
            }
          }, 200);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });

    // Cleanup minimal : vide juste le container.
    // On NE retire PAS les styles (persistent en head) → pas de flash blanc.
    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [src]);

  if (error) {
    return (
      <div style={{ padding: 64, textAlign: "center", fontFamily: "Poppins, sans-serif" }}>
        <h2>Erreur de chargement</h2>
        <p style={{ color: "#64748B" }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid #e2e8f0",
              borderTopColor: "#3B82F6",
              borderRadius: "50%",
              animation: "lkSpin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes lkSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div
        ref={containerRef}
        className="lk-htmlpage"
        style={{ visibility: loading ? "hidden" : "visible" }}
      />
    </>
  );
}
