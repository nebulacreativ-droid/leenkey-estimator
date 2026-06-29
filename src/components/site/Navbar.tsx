import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";

  // ─── Détection automatique de la section visible sur la home (scroll spy) ───
  useEffect(() => {
    if (!isHome) {
      setActiveSection(null);
      return;
    }

    const ids = ["tarifs", "faq", "comment", "fonctionnalites"];
    const sectionEls = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sectionEls.length === 0) {
      // Les sections sont dans l'iframe-injected HTML, peut prendre un peu de temps
      const retry = setTimeout(() => {
        const els = ids
          .map((id) => document.getElementById(id))
          .filter((el): el is HTMLElement => el !== null);
        if (els.length === 0) return;
        startObserving(els);
      }, 1500);
      return () => clearTimeout(retry);
    }

    return startObserving(sectionEls);

    function startObserving(els: HTMLElement[]) {
      const observer = new IntersectionObserver(
        (entries) => {
          // Trouver la section avec la plus grande visibilité
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible.length > 0) {
            setActiveSection(visible[0].target.id);
          }
        },
        {
          rootMargin: "-80px 0px -50% 0px",
          threshold: [0, 0.2, 0.5, 0.8, 1],
        }
      );
      els.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }
  }, [isHome, location.pathname]);

  // ─── Helpers actif ───
  const isRouteActive = (path: string) => location.pathname === path;
  const isSectionActive = (id: string) => isHome && activeSection === id;

  const sectionLink = (id: string, label: string) => {
    const active = isSectionActive(id);
    const className = `lk-nav-link${active ? " lk-nav-link-active" : ""}`;
    if (isHome) {
      return (
        <a
          href={`#${id}`}
          className={className}
          onClick={() => {
            setOpen(false);
            setActiveSection(id);
          }}
        >
          {label}
        </a>
      );
    }
    return (
      <Link to="/" hash={id} className={className} onClick={() => setOpen(false)}>
        {label}
      </Link>
    );
  };

  const routeLinkClass = (path: string) =>
    `lk-nav-link${isRouteActive(path) ? " lk-nav-link-active" : ""}`;

  return (
    <>
      <style>{`
        .lk-nav {
          position: sticky; top: 0; z-index: 100;
          height: 80px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 8px rgba(0,0,0,.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px;
          font-family: 'Poppins', system-ui, sans-serif;
        }
        .lk-nav-logo {
          display: flex; align-items: center;
          text-decoration: none;
        }
        .lk-nav-logo img {
          height: 56px; width: auto;
          display: block;
        }
        .lk-nav-links {
          display: flex; align-items: center; gap: 32px;
        }
        .lk-nav-link {
          position: relative;
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
          font-size: 0.9rem;
          color: #475569;
          text-decoration: none;
          transition: color .25s ease;
          cursor: pointer;
          background: none;
          border: none;
          padding: 6px 2px;
        }
        /* Underline animée — état par défaut (invisible) */
        .lk-nav-link::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 2px;
          background: linear-gradient(90deg, #3B82F6, #8B5CF6);
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform .35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Hover : underline qui se déploie */
        .lk-nav-link:hover {
          color: #0F172A;
        }
        .lk-nav-link:hover::after {
          transform: scaleX(1);
        }
        /* État actif : underline visible + couleur navy */
        .lk-nav-link-active {
          color: #0F172A;
          font-weight: 600;
        }
        .lk-nav-link-active::after {
          transform: scaleX(1);
          height: 2.5px;
        }
        .lk-nav-cta {
          display: inline-block;
          background: #3B82F6;
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 10px 22px;
          border-radius: 10px;
          text-decoration: none;
          transition: all .25s ease;
        }
        .lk-nav-cta:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
        }
        .lk-nav-burger {
          display: none;
          flex-direction: column; gap: 4px;
          background: none; border: none; cursor: pointer;
          padding: 8px;
        }
        .lk-nav-burger span {
          width: 24px; height: 2px;
          background: #0F172A; border-radius: 2px;
          transition: all .3s;
        }
        .lk-nav-mobile-overlay {
          display: none;
          position: fixed; top: 80px; left: 0; right: 0; bottom: 0;
          background: #ffffff;
          padding: 32px;
          flex-direction: column; gap: 24px;
          z-index: 99;
        }
        .lk-nav-mobile-overlay.open { display: flex; }
        .lk-nav-mobile-overlay .lk-nav-link {
          font-size: 1.1rem;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .lk-nav-mobile-overlay .lk-nav-link::after {
          left: 0;
          width: 32px;
          right: auto;
        }
        .lk-nav-mobile-overlay .lk-nav-link-active {
          color: #1156fc;
        }
        @media (max-width: 768px) {
          .lk-nav-links { display: none; }
          .lk-nav-cta { display: none; }
          .lk-nav-burger { display: flex; }
          .lk-nav { padding: 0 20px; }
        }
      `}</style>

      <nav className="lk-nav">
        <Link to="/" className="lk-nav-logo">
          <img src="/leenkey-logo.svg" alt="Leenkey" />
        </Link>

        <div className="lk-nav-links">
          <Link to="/qui-sommes-nous" className={routeLinkClass("/qui-sommes-nous")}>
            Qui sommes-nous
          </Link>
          {sectionLink("tarifs", "Tarifs")}
          {sectionLink("faq", "FAQ")}
          <Link to="/investir" className={routeLinkClass("/investir")}>
            Investir dans Leenkey
          </Link>
        </div>

        <Link to="/estimer" className="lk-nav-cta">
          Valoriser mon bien gratuitement
        </Link>

        <button
          className="lk-nav-burger"
          aria-label="Menu"
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className={`lk-nav-mobile-overlay ${open ? "open" : ""}`}>
        <Link
          to="/qui-sommes-nous"
          className={routeLinkClass("/qui-sommes-nous")}
          onClick={() => setOpen(false)}
        >
          Qui sommes-nous
        </Link>
        {sectionLink("tarifs", "Tarifs")}
        {sectionLink("faq", "FAQ")}
        <Link
          to="/investir"
          className={routeLinkClass("/investir")}
          onClick={() => setOpen(false)}
        >
          Investir dans Leenkey
        </Link>
        <Link to="/estimer" className="lk-nav-cta" onClick={() => setOpen(false)}>
          Valoriser mon bien gratuitement
        </Link>
      </div>
    </>
  );
}
