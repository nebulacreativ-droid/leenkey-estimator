import { useEffect, useRef, useState } from "react";

/**
 * Charge un fichier HTML auto-contenu (ex: bundler Lovable) via iframe
 * et ajuste automatiquement sa hauteur au contenu.
 * Utile pour les pages avec scripts qui dépendent de DOMContentLoaded.
 */
/**
 * Charge un fichier HTML auto-contenu (ex: bundler Lovable) via iframe
 * et ajuste automatiquement sa hauteur au contenu.
 * Si hidePhotoNearText fourni, masque les images proches d'éléments
 * contenant ces textes (utile pour retirer une photo de fondateur).
 */
export function IframePage({
  src,
  title,
  hidePhotoNearText,
}: {
  src: string;
  title?: string;
  hidePhotoNearText?: string[];
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let resizeObserver: ResizeObserver | null = null;

    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const body = doc.body;
        const html = doc.documentElement;
        const height = Math.max(
          body?.scrollHeight ?? 0,
          body?.offsetHeight ?? 0,
          html?.clientHeight ?? 0,
          html?.scrollHeight ?? 0,
          html?.offsetHeight ?? 0
        );
        if (height > 0) {
          iframe.style.height = `${height}px`;
        }
      } catch (e) {
        console.warn("Could not adjust iframe height:", e);
      }
    };

    // Masque les images proches d'éléments contenant un mot-clé donné
    const hidePhotosNearKeywords = (keywords: string[]) => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || keywords.length === 0) return;

        const lowerKw = keywords.map((k) => k.toLowerCase());

        // Parcourt tous les éléments et cherche ceux qui contiennent un keyword
        const allEls = Array.from(doc.querySelectorAll<HTMLElement>("*"));
        const matchEls = allEls.filter((el) => {
          const ownText = (el.textContent ?? "").toLowerCase();
          if (!ownText) return false;
          return lowerKw.some((kw) => ownText.includes(kw));
        });

        // Pour chaque élément qui matche, remonte aux ancêtres et masque les <img>
        // ou éléments <picture>/<svg image> à proximité
        const hidden = new Set<HTMLElement>();
        matchEls.forEach((el) => {
          // Cherche dans l'élément lui-même et 3 ancêtres au-dessus
          let cur: HTMLElement | null = el;
          for (let depth = 0; depth < 4 && cur; depth++) {
            cur.querySelectorAll("img, picture, [class*='photo' i], [class*='portrait' i], [class*='avatar' i]").forEach(
              (img) => {
                const imgEl = img as HTMLElement;
                if (hidden.has(imgEl)) return;
                imgEl.style.display = "none";
                hidden.add(imgEl);
              }
            );
            cur = cur.parentElement;
          }
        });
      } catch (e) {
        console.warn("Could not hide photos:", e);
      }
    };

    const handleLoad = () => {
      setLoading(false);
      // Premier ajustement immédiat
      adjustHeight();
      // Ajustements successifs (le bundler peut prendre quelques ms pour déballer)
      setTimeout(adjustHeight, 200);
      setTimeout(adjustHeight, 600);
      setTimeout(adjustHeight, 1500);
      setTimeout(adjustHeight, 3000);

      // Masque les photos demandées (attend que le bundler ait fini de déballer)
      if (hidePhotoNearText && hidePhotoNearText.length > 0) {
        const hide = () => hidePhotosNearKeywords(hidePhotoNearText);
        setTimeout(hide, 300);
        setTimeout(hide, 1000);
        setTimeout(hide, 2500);
      }

      // Observer les changements de taille du body de l'iframe
      try {
        const doc = iframe.contentDocument;
        if (doc?.body && "ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(() => {
            adjustHeight();
            // Re-masquer au cas où le DOM change
            if (hidePhotoNearText && hidePhotoNearText.length > 0) {
              hidePhotosNearKeywords(hidePhotoNearText);
            }
          });
          resizeObserver.observe(doc.body);
          resizeObserver.observe(doc.documentElement);
        }
      } catch {
        /* ignore */
      }
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      resizeObserver?.disconnect();
    };
  }, [src, hidePhotoNearText]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            fontFamily: "Poppins, sans-serif",
            position: "absolute",
            inset: 0,
            background: "#fff",
            zIndex: 1,
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
      <iframe
        ref={iframeRef}
        src={src}
        title={title ?? "Page"}
        style={{
          width: "100%",
          minHeight: "100vh",
          border: "none",
          display: "block",
          background: "#fff",
        }}
        scrolling="no"
      />
    </div>
  );
}
