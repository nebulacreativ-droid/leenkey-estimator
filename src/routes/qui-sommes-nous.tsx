import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/qui-sommes-nous")({
  component: QuiSommesNousPage,
});

function QuiSommesNousPage() {
  const [imgError, setImgError] = useState(false);
  return (
    <SiteLayout>
      <style>{`
        .lk-qsn {
          font-family: 'Poppins', system-ui, sans-serif;
          color: #0F172A;
          overflow-x: hidden;
        }
        /* ─── HERO ─────────────────────────────────────────── */
        .lk-qsn-hero {
          background: linear-gradient(135deg, #0F1E35 0%, #1A2B4A 50%, #1156FC 130%);
          color: #fff;
          padding: 96px 32px 120px;
          position: relative;
          overflow: hidden;
        }
        .lk-qsn-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.08) 1.2px, transparent 1.2px);
          background-size: 28px 28px;
          opacity: 0.5;
          pointer-events: none;
        }
        .lk-qsn-hero-wrap {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 56px;
          align-items: center;
          position: relative;
          z-index: 2;
        }
        @media (min-width: 900px) {
          .lk-qsn-hero-wrap {
            grid-template-columns: 1fr 0.9fr;
            gap: 72px;
          }
        }
        .lk-qsn-hero-copy .lk-eyebrow {
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #93B4FF;
          margin-bottom: 20px;
        }
        .lk-qsn-hero-copy h1 {
          font-size: clamp(38px, 5vw, 56px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1.5px;
          margin: 0 0 24px;
          color: #fff;
        }
        .lk-qsn-hero-copy h1 .grad {
          background: linear-gradient(135deg, #60A5FA, #B8D4FF);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .lk-qsn-hero-copy p.lead {
          font-size: 19px;
          line-height: 1.7;
          color: rgba(255,255,255,0.85);
          max-width: 560px;
          margin: 0 0 32px;
        }
        .lk-qsn-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #1156FC;
          color: #fff;
          padding: 14px 26px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          box-shadow: 0 10px 30px -10px rgba(17,86,252,0.6);
          transition: transform 0.2s;
        }
        .lk-qsn-hero-cta:hover { transform: translateY(-2px); }
        /* Photo Cédric */
        .lk-qsn-photo-wrap {
          position: relative;
          justify-self: center;
          width: 100%;
          max-width: 440px;
        }
        .lk-qsn-photo {
          width: 100%;
          aspect-ratio: 3/4;
          object-fit: cover;
          border-radius: 24px;
          box-shadow: 0 30px 80px -20px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .lk-qsn-photo-tag {
          position: absolute;
          left: -20px;
          bottom: 32px;
          background: #fff;
          color: #0F172A;
          padding: 16px 22px;
          border-radius: 16px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Poppins', sans-serif;
        }
        .lk-qsn-photo-tag-dot {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1156FC, #8B5CF6);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 800; font-size: 18px;
        }
        .lk-qsn-photo-tag-name {
          font-weight: 700; font-size: 15px; line-height: 1.2;
        }
        .lk-qsn-photo-tag-role {
          font-size: 12px; color: #64748B; margin-top: 2px;
        }

        /* ─── STATS ───────────────────────────────────────── */
        .lk-qsn-stats {
          background: #fff;
          padding: 56px 32px;
          border-bottom: 1px solid #E2E8F0;
        }
        .lk-qsn-stats-grid {
          max-width: 1100px; margin: 0 auto;
          display: grid; gap: 32px;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          text-align: center;
        }
        .lk-qsn-stat-num {
          font-size: 44px; font-weight: 800; color: #1156FC;
          letter-spacing: -1.5px; margin: 0 0 4px;
          background: linear-gradient(135deg, #1156FC, #8B5CF6);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lk-qsn-stat-cap {
          font-size: 14px; color: #64748B; font-weight: 500;
        }

        /* ─── STORY ────────────────────────────────────────── */
        .lk-qsn-story {
          background: linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 100%);
          padding: 96px 32px;
        }
        .lk-qsn-wrap {
          max-width: 880px; margin: 0 auto;
        }
        .lk-qsn-story h2 {
          font-size: clamp(30px, 3.5vw, 42px);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -1px;
          margin: 0 0 24px;
          color: #0F172A;
          text-align: center;
        }
        .lk-qsn-story h2 .grad {
          background: linear-gradient(135deg, #1156FC, #8B5CF6);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lk-qsn-story .lk-eyebrow {
          display: block;
          text-align: center;
          font-size: 13px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: #1156FC;
          margin-bottom: 14px;
        }
        .lk-qsn-story p {
          font-size: 17px;
          line-height: 1.8;
          color: #334155;
          margin: 0 0 22px;
        }
        .lk-qsn-story p strong { color: #0F172A; }
        .lk-qsn-story-highlight {
          background: linear-gradient(135deg, rgba(17,86,252,0.06), rgba(139,92,246,0.06));
          border-left: 4px solid #1156FC;
          padding: 22px 26px;
          border-radius: 8px;
          margin: 32px 0;
          font-size: 17px;
          line-height: 1.7;
          color: #0F172A;
          font-style: italic;
        }

        /* ─── VALEURS ──────────────────────────────────────── */
        .lk-qsn-values {
          background: #0F1E35;
          color: #fff;
          padding: 96px 32px;
          position: relative;
          overflow: hidden;
        }
        .lk-qsn-values::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at top left, rgba(17,86,252,0.18), transparent 55%),
            radial-gradient(ellipse at bottom right, rgba(139,92,246,0.15), transparent 55%);
          pointer-events: none;
        }
        .lk-qsn-values-head {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 56px;
          position: relative; z-index: 2;
        }
        .lk-qsn-values-head .lk-eyebrow {
          color: #93B4FF;
          font-size: 13px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; margin-bottom: 14px; display: block;
        }
        .lk-qsn-values-head h2 {
          font-size: clamp(30px, 3.5vw, 42px);
          font-weight: 800;
          color: #fff;
          letter-spacing: -1px;
          margin: 0 0 16px;
        }
        .lk-qsn-values-head p {
          color: rgba(255,255,255,0.72);
          font-size: 17px;
          line-height: 1.7;
          margin: 0;
        }
        .lk-qsn-values-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          gap: 24px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          position: relative; z-index: 2;
        }
        .lk-qsn-value {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 32px 28px;
          transition: transform 0.2s, background 0.2s;
        }
        .lk-qsn-value:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-4px);
        }
        .lk-qsn-value-icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1156FC, #8B5CF6);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .lk-qsn-value h3 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 10px;
        }
        .lk-qsn-value p {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255,255,255,0.7);
          margin: 0;
        }

        /* ─── CTA FINAL ────────────────────────────────────── */
        .lk-qsn-cta {
          background: #fff;
          padding: 96px 32px;
          text-align: center;
        }
        .lk-qsn-cta h2 {
          font-size: clamp(28px, 3.5vw, 40px);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -1px;
          margin: 0 0 18px;
          color: #0F172A;
        }
        .lk-qsn-cta h2 .grad {
          background: linear-gradient(135deg, #1156FC, #8B5CF6);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lk-qsn-cta p {
          font-size: 17px;
          color: #475569;
          line-height: 1.7;
          margin: 0 0 32px;
          max-width: 620px;
          margin-inline: auto;
        }
        .lk-qsn-cta-btns {
          display: inline-flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .lk-qsn-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 26px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          transition: transform 0.2s;
        }
        .lk-qsn-cta-btn.primary {
          background: #1156FC; color: #fff;
          box-shadow: 0 10px 30px -10px rgba(17,86,252,0.6);
        }
        .lk-qsn-cta-btn.secondary {
          background: #F8FAFC; color: #0F172A;
          border: 1px solid #E2E8F0;
        }
        .lk-qsn-cta-btn:hover { transform: translateY(-2px); }
      `}</style>

      <div className="lk-qsn">
        {/* ============ HERO ============ */}
        <section className="lk-qsn-hero">
          <div className="lk-qsn-hero-wrap">
            <div className="lk-qsn-hero-copy">
              <span className="lk-eyebrow">Qui sommes-nous</span>
              <h1>
                Rendre la vente immobilière <span className="grad">enfin simple, humaine et transparente.</span>
              </h1>
              <p className="lead">
                Fondée par Cédric Da Cunha, Leenkey est née d'un constat simple&nbsp;:
                vendre son bien immobilier en France reste trop complexe, trop opaque et souvent
                trop coûteux. Nous construisons une nouvelle façon de vendre, où l'intelligence
                artificielle accompagne chaque propriétaire pour lui permettre de vendre en toute
                autonomie, sans jamais être seul.
              </p>
              <Link to="/investir" className="lk-qsn-hero-cta">
                Découvrir notre vision
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </Link>
            </div>
            <div className="lk-qsn-photo-wrap">
              {!imgError ? (
                <img
                  className="lk-qsn-photo"
                  src="/cedric.jpg"
                  alt="Cédric Da Cunha, fondateur de Leenkey"
                  loading="eager"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="lk-qsn-photo"
                  style={{
                    background: "linear-gradient(135deg, #1156FC 0%, #8B5CF6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "clamp(80px, 12vw, 140px)",
                    fontWeight: 800,
                    letterSpacing: "-4px",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  aria-label="Photo à venir"
                >
                  CD
                </div>
              )}
              <div className="lk-qsn-photo-tag">
                <div className="lk-qsn-photo-tag-dot">CD</div>
                <div>
                  <div className="lk-qsn-photo-tag-name">Cédric Da Cunha</div>
                  <div className="lk-qsn-photo-tag-role">Fondateur & CEO · Leenkey</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ STATS ============ */}
        <section className="lk-qsn-stats">
          <div className="lk-qsn-stats-grid">
            <div>
              <div className="lk-qsn-stat-num">15 ans</div>
              <div className="lk-qsn-stat-cap">d'expérience dans l'immobilier</div>
            </div>
            <div>
              <div className="lk-qsn-stat-num">300+</div>
              <div className="lk-qsn-stat-cap">transactions accompagnées</div>
            </div>
            <div>
              <div className="lk-qsn-stat-num">100 %</div>
              <div className="lk-qsn-stat-cap">français, données hébergées en France</div>
            </div>
            <div>
              <div className="lk-qsn-stat-num">24 / 7</div>
              <div className="lk-qsn-stat-cap">un copilote IA à vos côtés</div>
            </div>
          </div>
        </section>

        {/* ============ STORY ============ */}
        <section className="lk-qsn-story">
          <div className="lk-qsn-wrap">
            <span className="lk-eyebrow">L'histoire</span>
            <h2>Pourquoi j'ai lancé <span className="grad">Leenkey.</span></h2>
            <p>
              Après <strong>plus de quinze années dans l'immobilier</strong>, j'ai accompagné des
              centaines de propriétaires dans leur projet de vente. J'ai constaté la même
              difficulté, encore et encore&nbsp;: vendre un bien reste un parcours complexe,
              stressant et souvent coûteux. Beaucoup renoncent à vendre seuls, non par manque de
              motivation, mais parce qu'ils manquent d'accompagnement.
            </p>
            <p>
              C'est de ce constat qu'est née Leenkey.
            </p>
            <p>
              Mon ambition est simple&nbsp;: permettre à chaque propriétaire de vendre son bien en
              toute autonomie, sans jamais être seul. Grâce à une plateforme pilotée par
              l'<strong>intelligence artificielle</strong>, Leenkey accompagne chaque étape de la
              vente, de l'analyse de la valeur du bien jusqu'à la signature chez le notaire, avec
              un accompagnement disponible <strong>24 h/24 et 7 j/7</strong>.
            </p>
            <p>
              Je suis convaincu qu'un propriétaire ne devrait pas avoir à céder plusieurs milliers
              d'euros de commission pour bénéficier d'un accompagnement de qualité. Il mérite de
              comprendre chaque étape, de garder le contrôle de sa vente et de profiter des
              meilleurs outils technologiques dans un cadre simple, transparent et accessible.
            </p>
            <div className="lk-qsn-story-highlight">
              Leenkey est née de cette conviction&nbsp;: redonner aux propriétaires les clés de
              leur vente.
            </div>
          </div>
        </section>

        {/* ============ VALEURS ============ */}
        <section className="lk-qsn-values">
          <div className="lk-qsn-values-head">
            <span className="lk-eyebrow">Nos valeurs</span>
            <h2>Ce qui nous anime au quotidien.</h2>
            <p>
              Quatre principes qui guident chaque décision produit, chaque conversation client,
              chaque ligne de code.
            </p>
          </div>
          <div className="lk-qsn-values-grid">
            <div className="lk-qsn-value">
              <div className="lk-qsn-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M5 12h14"/></svg>
              </div>
              <h3>Transparence radicale</h3>
              <p>Aucune commission cachée, aucun tarif surprise. Le prix est annoncé avant de commencer, en euros TTC.</p>
            </div>
            <div className="lk-qsn-value">
              <div className="lk-qsn-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <h3>Rigueur technique</h3>
              <p>Modèles d'analyse construits sur les données réelles (DVF, marché local). Pas d'approximation, pas de moyenne floue.</p>
            </div>
            <div className="lk-qsn-value">
              <div className="lk-qsn-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <h3>Accompagnement humain</h3>
              <p>Un conseiller joignable à chaque étape. La technologie sert la relation, elle ne la remplace jamais.</p>
            </div>
            <div className="lk-qsn-value">
              <div className="lk-qsn-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
              </div>
              <h3>Impact mesurable</h3>
              <p>Notre succès se mesure aux euros économisés par nos clients. Une commission agence évitée est une victoire concrète.</p>
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="lk-qsn-cta">
          <h2>
            Prêt à échanger avec <span className="grad">Cédric&nbsp;?</span>
          </h2>
          <p>
            Que vous soyez propriétaire, investisseur ou partenaire potentiel — la porte est ouverte.
            Un mot suffit pour démarrer la discussion.
          </p>
          <div className="lk-qsn-cta-btns">
            <Link to="/investir" hash="formulaire" className="lk-qsn-cta-btn primary">
              Nous contacter
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </Link>
            <Link to="/estimer" className="lk-qsn-cta-btn secondary">
              Valoriser mon bien gratuitement
            </Link>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
