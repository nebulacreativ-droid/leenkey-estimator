import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/mentions-legales")({
  component: MentionsLegales,
});

function MentionsLegales() {
  return (
    <SiteLayout>
      <div className="lk-legal">
        <style>{`
          .lk-legal {
            max-width: 800px;
            margin: 0 auto;
            padding: 64px 32px 96px;
            font-family: 'Poppins', system-ui, sans-serif;
            color: #0F172A;
            line-height: 1.7;
          }
          .lk-legal h1 {
            font-size: clamp(28px, 4vw, 40px);
            font-weight: 800;
            margin-bottom: 8px;
            letter-spacing: -1px;
          }
          .lk-legal .lk-legal-update {
            color: #64748B;
            font-size: 13px;
            margin-bottom: 40px;
          }
          .lk-legal h2 {
            font-size: 20px;
            font-weight: 700;
            color: #1156FC;
            margin-top: 36px;
            margin-bottom: 12px;
          }
          .lk-legal h3 { font-size: 16px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; }
          .lk-legal p { margin-bottom: 14px; color: #475569; font-size: 15px; }
          .lk-legal ul { list-style: disc; padding-left: 24px; margin-bottom: 14px; color: #475569; }
          .lk-legal li { margin-bottom: 6px; font-size: 15px; }
          .lk-legal a { color: #1156FC; text-decoration: underline; }
          .lk-legal strong { color: #0F172A; }
          .lk-legal .lk-legal-block {
            background: #F8FAFC;
            border-left: 4px solid #1156FC;
            padding: 18px 22px;
            border-radius: 4px;
            margin: 18px 0;
          }
          .lk-legal .lk-legal-block p { margin: 0; }
          .lk-legal .lk-legal-block p + p { margin-top: 8px; }
        `}</style>

        <h1>Mentions légales</h1>
        <p className="lk-legal-update">Dernière mise à jour : 28 juin 2026</p>

        <h2>1. Éditeur du site</h2>
        <div className="lk-legal-block">
          <p><strong>Leenkey</strong></p>
          <p>Entrepreneur individuel : Cédric Da Cunha</p>
          <p>Adresse : à compléter (Île-de-France, France)</p>
          <p>Email : <a href="mailto:contact.leenkey@gmail.com">contact.leenkey@gmail.com</a></p>
          <p>Téléphone : +33 6 13 84 54 51</p>
          <p>Directeur de la publication : Cédric Da Cunha</p>
        </div>

        <h2>2. Hébergement</h2>
        <div className="lk-legal-block">
          <p><strong>Vercel Inc.</strong></p>
          <p>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
          <p>Site : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></p>
        </div>

        <h2>3. Conception et développement</h2>
        <div className="lk-legal-block">
          <p>
            Site conçu et développé par <strong>Nebula Creativ</strong>.
          </p>
        </div>

        <h2>4. Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu du site <strong>leenkey.fr</strong> (textes, graphismes, logos,
          images, vidéos, icônes, code source) est la propriété exclusive de Leenkey ou de ses
          partenaires, et est protégé par les lois françaises et internationales relatives à la
          propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication, adaptation ou exploitation
          de tout ou partie des éléments du site, par quelque procédé que ce soit, est strictement
          interdite sans l'autorisation écrite préalable de Leenkey.
        </p>

        <h2 id="rgpd">5. Données personnelles (RGPD)</h2>
        <p>
          Les données personnelles collectées sur ce site (nom, prénom, email, téléphone, données
          relatives au bien immobilier) sont traitées par Leenkey en qualité de responsable de
          traitement, dans le respect du Règlement Général sur la Protection des Données
          (Règlement UE 2016/679) et de la loi Informatique et Libertés modifiée.
        </p>

        <h3>Finalités du traitement</h3>
        <ul>
          <li>Établir une analyse de valorisation de votre bien immobilier</li>
          <li>Vous transmettre votre rapport de valorisation personnalisé</li>
          <li>Vous recontacter dans le cadre de votre demande</li>
          <li>Améliorer nos services et notre algorithme</li>
        </ul>

        <h3>Vos droits</h3>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement,
          de limitation, de portabilité et d'opposition au traitement de vos données. Pour exercer
          ces droits, contactez-nous à{" "}
          <a href="mailto:contact.leenkey@gmail.com">contact.leenkey@gmail.com</a>.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
          ).
        </p>

        <h3>Durée de conservation</h3>
        <p>
          Vos données sont conservées <strong>3 ans</strong> à compter du dernier contact, sauf
          obligation légale de conservation plus longue (notamment comptable).
        </p>

        <h2 id="cookies">6. Cookies</h2>
        <p>
          Le site utilise uniquement des cookies <strong>strictement nécessaires</strong> au bon
          fonctionnement de la plateforme (préférences, session). Aucun cookie publicitaire ou
          de traçage tiers n'est utilisé sans votre consentement préalable.
        </p>

        <h2>7. Limitation de responsabilité</h2>
        <p>
          Les rapports de valorisation fournis par Leenkey constituent une{" "}
          <strong>analyse automatisée</strong> à titre informatif uniquement, basée sur les
          informations renseignées et les données de marché disponibles. Ils ne constituent ni une
          expertise immobilière ni une estimation au sens de la loi Hoguet, et ne peuvent
          engager la responsabilité de Leenkey quant au prix réel de vente.
        </p>
        <p>
          Pour une évaluation officielle opposable, il est recommandé de consulter un expert
          immobilier agréé ou un notaire.
        </p>

        <h2>8. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont régies par le droit français. Tout litige relatif à
          l'utilisation du site relève de la compétence exclusive des tribunaux de Paris.
        </p>

        <h2>9. Contact</h2>
        <p>
          Pour toute question relative à ces mentions légales, contactez-nous à{" "}
          <a href="mailto:contact.leenkey@gmail.com">contact.leenkey@gmail.com</a>.
        </p>
      </div>
    </SiteLayout>
  );
}
