import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/cgu")({
  component: CGU,
});

function CGU() {
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
          .lk-legal .lk-toc {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 32px;
          }
          .lk-legal .lk-toc h4 { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1156FC; margin-bottom: 10px; letter-spacing: 0.5px; }
          .lk-legal .lk-toc ol { list-style: decimal; padding-left: 22px; margin: 0; }
          .lk-legal .lk-toc li { margin-bottom: 4px; font-size: 14px; color: #475569; }
          .lk-legal .lk-warning {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 16px 20px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 14px;
          }
          .lk-legal .lk-warning strong { color: #92400E; }
        `}</style>

        <h1>Conditions Générales d'Utilisation</h1>
        <p className="lk-legal-update">Dernière mise à jour : 28 juin 2026 · Version 1.0</p>

        <div className="lk-toc">
          <h4>Sommaire</h4>
          <ol>
            <li>Objet et acceptation</li>
            <li>Définitions</li>
            <li>Description du service</li>
            <li>Inscription et accès</li>
            <li>Tarifs et paiement</li>
            <li>Obligations de l'utilisateur</li>
            <li>Responsabilité de Leenkey</li>
            <li>Propriété intellectuelle</li>
            <li>Données personnelles</li>
            <li>Résiliation</li>
            <li>Droit applicable et litiges</li>
          </ol>
        </div>

        <h2>1. Objet et acceptation</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et
          l'utilisation de la plateforme <strong>Leenkey</strong>, accessible à l'adresse{" "}
          <a href="https://leenkey.fr">leenkey.fr</a> et ses sous-domaines (le « Site »).
        </p>
        <p>
          En accédant au Site et en utilisant les services proposés, l'Utilisateur reconnaît avoir
          pris connaissance des présentes CGU et les accepter sans réserve.
        </p>

        <h2>2. Définitions</h2>
        <ul>
          <li><strong>Leenkey</strong> : éditeur du Site, fournisseur des services décrits ci-dessous</li>
          <li><strong>Utilisateur</strong> : toute personne physique ou morale accédant au Site</li>
          <li><strong>Vendeur</strong> : Utilisateur souhaitant valoriser ou vendre un bien immobilier via la plateforme</li>
          <li><strong>Rapport de valorisation</strong> : document automatisé d'analyse de la valeur d'un bien immobilier</li>
          <li><strong>Service</strong> : ensemble des fonctionnalités proposées par Leenkey (analyse de valeur, accompagnement, diffusion, etc.)</li>
        </ul>

        <h2>3. Description du service</h2>
        <p>
          Leenkey est une plateforme d'<strong>aide à la vente immobilière entre particuliers</strong>.
          Elle propose notamment :
        </p>
        <ul>
          <li>Une analyse automatisée de la valeur d'un bien immobilier (« Rapport de valorisation »)</li>
          <li>Des outils de préparation à la vente (dossier, diagnostics, documents)</li>
          <li>Un accompagnement humain à la demande par des conseillers indépendants</li>
          <li>Une diffusion exclusive de l'annonce sur le portail Leenkey</li>
          <li>Un suivi des visites, des offres et de la coordination avec le notaire</li>
        </ul>

        <div className="lk-warning">
          <p>
            <strong>⚠️ Important :</strong> Leenkey n'est <strong>pas une agence immobilière</strong>{" "}
            au sens de la loi Hoguet du 2 janvier 1970. La plateforme ne réalise aucune
            transaction au nom des Utilisateurs et n'agit pas en qualité de mandataire. Le Vendeur
            reste à tout moment décisionnaire et responsable de sa vente.
          </p>
        </div>

        <h2>4. Inscription et accès</h2>
        <p>
          Certaines fonctionnalités du Site nécessitent la création d'un compte personnel.
          L'Utilisateur s'engage à fournir des informations exactes, complètes et à jour, et à les
          maintenir à jour pendant toute la durée d'utilisation du Service.
        </p>
        <p>
          L'Utilisateur est seul responsable de la confidentialité de ses identifiants et de
          toutes les activités effectuées depuis son compte.
        </p>

        <h2>5. Tarifs et paiement</h2>
        <h3>5.1 Formule Autonomie</h3>
        <p>
          La formule <strong>Autonomie</strong> est proposée <strong>gratuitement</strong> durant
          la phase de lancement, sans engagement ni saisie de carte bancaire. Elle donne accès à
          l'analyse de valeur du bien, à un call stratégique avec un conseiller (30 minutes) et à
          la mise en place du dossier de vente.
        </p>

        <h3>5.2 Formules payantes</h3>
        <p>
          Les formules <strong>Accompagné</strong> (990&nbsp;€ TTC) et <strong>Sérénité</strong>{" "}
          (1&nbsp;500&nbsp;€ TTC) sont facturées en forfait fixe TTC, sans commission au
          pourcentage. Le paiement s'effectue <strong>à la souscription</strong>, dès activation
          des services associés à la formule choisie (création de l'espace personnel, diffusion de
          l'annonce, mobilisation du conseiller dédié).
        </p>

        <h3>5.3 Modalités de paiement</h3>
        <p>
          Le règlement s'effectue par carte bancaire ou virement, au moment de la souscription.
          L'accès aux fonctionnalités payantes est conditionné à la réception effective du
          paiement. Conformément au Code de la consommation, le Vendeur dispose d'un droit de
          rétractation de 14 jours à compter de la souscription, sauf s'il a expressément demandé
          le démarrage immédiat de l'exécution du Service avant l'expiration de ce délai.
        </p>

        <h3>5.4 Remboursement et garantie</h3>
        <p>
          Aucun remboursement n'est dû lorsque le Service a été pleinement exécuté. En cas de
          non-vente du bien, le Vendeur conserve l'accès à son dossier et à son conseiller pendant
          12 mois à compter de la souscription, sans frais additionnels.
        </p>

        <h2>6. Obligations de l'utilisateur</h2>
        <p>L'Utilisateur s'engage à :</p>
        <ul>
          <li>Fournir des informations exactes et sincères sur son bien</li>
          <li>Disposer des droits nécessaires pour mettre le bien en vente</li>
          <li>Respecter la législation en vigueur (notamment les obligations de diagnostics)</li>
          <li>Ne pas utiliser le Site à des fins frauduleuses, malveillantes ou illicites</li>
          <li>Ne pas tenter de contourner les sécurités ou perturber le fonctionnement du Site</li>
          <li>Respecter la propriété intellectuelle de Leenkey et des tiers</li>
        </ul>

        <h2>7. Responsabilité de Leenkey</h2>
        <p>
          Le Rapport de valorisation fourni par Leenkey est une <strong>analyse automatisée</strong>{" "}
          basée sur les informations renseignées par l'Utilisateur et sur des données de marché
          publiques (notamment la base DVF). Il est fourni <strong>à titre informatif</strong> et
          ne constitue ni une expertise immobilière ni une estimation au sens de la loi Hoguet.
        </p>
        <p>
          Leenkey ne peut être tenue responsable :
        </p>
        <ul>
          <li>De l'écart éventuel entre la valeur estimée et le prix réel de vente</li>
          <li>De la non-vente du bien ou des délais de transaction</li>
          <li>Des décisions prises par l'Utilisateur sur la base du Rapport</li>
          <li>Des informations inexactes fournies par l'Utilisateur</li>
          <li>Des interruptions techniques du Service liées à la maintenance ou à un cas de force majeure</li>
        </ul>

        <h2>8. Propriété intellectuelle</h2>
        <p>
          Tous les éléments du Site (textes, graphismes, logo, photos, code, algorithmes) sont la
          propriété exclusive de Leenkey. Toute reproduction ou utilisation non autorisée est
          interdite et pourra faire l'objet de poursuites judiciaires.
        </p>
        <p>
          L'Utilisateur conserve la propriété des contenus qu'il publie (photos de son bien,
          descriptions). Il accorde toutefois à Leenkey une licence d'utilisation gratuite et
          non-exclusive pour la durée nécessaire à la fourniture du Service.
        </p>

        <h2>9. Données personnelles</h2>
        <p>
          Les traitements de données personnelles sont décrits en détail dans nos{" "}
          <a href="/mentions-legales">Mentions Légales</a> et notre Politique de Confidentialité.
        </p>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement,
          de limitation, de portabilité et d'opposition. Pour exercer ces droits :{" "}
          <a href="mailto:contact.leenkey@gmail.com">contact.leenkey@gmail.com</a>.
        </p>

        <h2>10. Résiliation</h2>
        <p>
          L'Utilisateur peut résilier son compte à tout moment en contactant Leenkey à{" "}
          <a href="mailto:contact.leenkey@gmail.com">contact.leenkey@gmail.com</a>. Les sommes éventuellement
          dues au titre d'une vente finalisée avant la résiliation restent exigibles.
        </p>
        <p>
          Leenkey se réserve le droit de suspendre ou de résilier le compte d'un Utilisateur en
          cas de manquement grave aux présentes CGU, sans préavis ni indemnité.
        </p>

        <h2>11. Droit applicable et litiges</h2>
        <p>
          Les présentes CGU sont régies par le <strong>droit français</strong>. En cas de litige,
          une solution amiable sera recherchée en priorité.
        </p>
        <p>
          Conformément aux dispositions du Code de la consommation concernant le règlement
          amiable des litiges, l'Utilisateur peut recourir gratuitement à un médiateur de la
          consommation. À défaut d'accord, les tribunaux compétents seront ceux du ressort de
          Paris.
        </p>

        <h2>12. Modification des CGU</h2>
        <p>
          Leenkey se réserve le droit de modifier les présentes CGU à tout moment. Les
          modifications entrent en vigueur dès leur publication sur le Site. L'Utilisateur est
          invité à consulter régulièrement la version en vigueur.
        </p>

        <p style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: 13 }}>
          Pour toute question relative à ces CGU, contactez-nous à{" "}
          <a href="mailto:contact.leenkey@gmail.com">contact.leenkey@gmail.com</a>.
        </p>
      </div>
    </SiteLayout>
  );
}
