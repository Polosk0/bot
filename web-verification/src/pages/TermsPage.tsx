import React from 'react';
import './TermsPage.css';

const TermsPage: React.FC = () => {
  return (
    <div className="terms-page">
      <div className="container">
        <div className="terms-header">
          <h1 className="terms-title">Conditions d'Utilisation</h1>
          <p className="terms-subtitle">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div className="terms-content">
          <section className="terms-section">
            <h2>1. Acceptation des Conditions</h2>
            <p>
              En accédant et en utilisant les services d'Emynona Market, vous acceptez d'être lié par ces conditions d'utilisation. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Description des Services</h2>
            <p>
              Emynona Market propose des services de vérification Discord et des services incluant :
            </p>
            <ul>
              <li>Services de remboursement (Refund Services)</li>
              <li>Services de boxe et combat (Boxing Services)</li>
              <li>Services personnalisés sur mesure</li>
              <li>Support client 24/7</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>3. Vérification Discord</h2>
            <p>
              L'accès à nos services nécessite une vérification via votre compte Discord. Cette vérification :
            </p>
            <ul>
              <li>Est 100% sécurisée et utilise OAuth2</li>
              <li>Ne stocke aucune donnée personnelle sensible</li>
              <li>Permet l'attribution automatique des rôles appropriés</li>
              <li>Peut être révoquée à tout moment</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>4. Utilisation des Services</h2>
            <p>Vous vous engagez à :</p>
            <ul>
              <li>Utiliser nos services de manière légale et éthique</li>
              <li>Ne pas tenter de contourner nos systèmes de sécurité</li>
              <li>Respecter les droits d'autrui</li>
              <li>Fournir des informations exactes et à jour</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>5. Limitation de Responsabilité</h2>
            <p>
              Emynona Market ne peut être tenu responsable des dommages indirects, consécutifs ou spéciaux résultant de 
              l'utilisation de nos services. Notre responsabilité est limitée au montant payé pour le service concerné.
            </p>
          </section>

          <section className="terms-section">
            <h2>6. Propriété Intellectuelle</h2>
            <p>
              Tous les contenus, marques et propriétés intellectuelles d'Emynona Market sont protégés par le droit d'auteur 
              et ne peuvent être utilisés sans autorisation écrite préalable.
            </p>
          </section>

          <section className="terms-section">
            <h2>7. Modification des Conditions</h2>
            <p>
              Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet 
              immédiatement après leur publication sur cette page.
            </p>
          </section>

          <section className="terms-section">
            <h2>8. Contact</h2>
            <p>
              Pour toute question concernant ces conditions d'utilisation, vous pouvez nous contacter via :
            </p>
            <ul>
              <li>Discord : <a href="https://discord.gg/nkny5u8cEc" target="_blank" rel="noopener noreferrer">https://discord.gg/nkny5u8cEc</a></li>
              <li>Email : support@emynona.market</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;






