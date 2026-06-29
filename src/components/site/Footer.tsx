import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <>
      <style>{`
        .lk-foot {
          background: #0F172A;
          color: #F8FAFC;
          padding: 64px 0 24px;
          font-family: 'Poppins', system-ui, sans-serif;
        }
        .lk-foot-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
        }
        .lk-foot-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .lk-foot .lk-foot-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
        .lk-foot-col h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: #F8FAFC;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin: 0 0 18px;
        }
        .lk-foot-brand-logo {
          display: inline-block;
          margin-bottom: 16px;
          text-decoration: none;
        }
        .lk-foot-brand-logo img {
          height: 42px; width: auto;
          display: block;
          /* Inversion couleur pour fond sombre : transforme le navy en blanc */
          filter: brightness(0) invert(1);
        }
        .lk-foot-brand p {
          font-size: 0.9rem;
          color: rgba(248,250,252,.65);
          line-height: 1.7;
          margin: 0 0 20px;
          max-width: 360px;
        }
        .lk-foot-socials {
          display: flex; gap: 12px;
        }
        .lk-foot-socials a {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(248,250,252,.08);
          color: #F8FAFC;
          text-decoration: none;
          transition: all .2s;
        }
        .lk-foot-socials a:hover {
          background: #3B82F6;
          transform: translateY(-2px);
        }
        .lk-foot-col ul {
          list-style: none;
          padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .lk-foot-col ul li a {
          font-size: 0.9rem;
          color: rgba(248,250,252,.65);
          text-decoration: none;
          transition: color .2s;
        }
        .lk-foot-col ul li a:hover { color: #F8FAFC; }
        .lk-foot-bottom {
          border-top: 1px solid #1e293b;
          padding-top: 24px;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 12px;
        }
        .lk-foot-bottom p {
          font-size: 0.85rem;
          color: rgba(248,250,252,.45);
          margin: 0;
        }
        @media (max-width: 900px) {
          .lk-foot-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }
        @media (max-width: 560px) {
          .lk-foot-grid { grid-template-columns: 1fr; }
          .lk-foot-bottom { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <footer className="lk-foot">
        <div className="lk-foot-wrap">
          <div className="lk-foot-grid">
            {/* Colonne 1 — Marque */}
            <div className="lk-foot-brand">
              <Link to="/" className="lk-foot-brand-logo">
                <img src="/leenkey-logo.svg" alt="Leenkey" />
              </Link>
              <p>
                La plateforme française qui vous aide à vendre votre bien sans agence,
                accompagné à chaque étape. Moins de frais, plus de contrôle.
              </p>
              <div className="lk-foot-socials">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" /></svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" /></svg>
                </a>
              </div>
            </div>

            {/* Colonne 2 — Produit */}
            <div className="lk-foot-col">
              <h4>Produit</h4>
              <ul>
                <li><Link to="/" hash="fonctionnalites">Fonctionnalités</Link></li>
                <li><Link to="/" hash="comment">Comment ça marche</Link></li>
                <li><Link to="/" hash="tarifs">Tarifs</Link></li>
                <li><Link to="/estimer">Valoriser mon bien</Link></li>
              </ul>
            </div>

            {/* Colonne 3 — Légal */}
            <div className="lk-foot-col">
              <h4>Légal</h4>
              <ul>
                <li><Link to="/mentions-legales">Mentions légales</Link></li>
                <li><Link to="/cgu">Conditions d'utilisation</Link></li>
                <li><a href="mailto:contact.leenkey@gmail.com">Contact</a></li>
              </ul>
            </div>

          </div>

          <div className="lk-foot-bottom">
            <p>© 2026 Leenkey. Tous droits réservés.</p>
            <p>Fait en France · Données hébergées en France</p>
          </div>
        </div>
      </footer>
    </>
  );
}
