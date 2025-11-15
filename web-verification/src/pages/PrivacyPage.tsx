import React from 'react';
import './PrivacyPage.css';

const PrivacyPage: React.FC = () => {
  return (
    <div className="privacy-page">
      <div className="container">
        <div className="privacy-header">
          <h1 className="privacy-title">Politique de Confidentialité</h1>
          <p className="privacy-subtitle">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div className="privacy-content">
          <section className="privacy-section">
            <h2>1. Collecte d'Informations</h2>
            <p>
              Nous collectons uniquement les informations nécessaires pour fournir nos services :
            </p>
            <ul>
              <li>Informations de base de votre compte Discord (nom d'utilisateur, ID, avatar)</li>
              <li>Données de vérification nécessaires à l'attribution des rôles</li>
              <li>Logs de sécurité pour la protection de nos services</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>2. Utilisation des Données</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul>
              <li>Vérifier votre identité Discord</li>
              <li>Attribuer les rôles appropriés sur notre serveur</li>
              <li>Fournir un support client personnalisé</li>
              <li>Améliorer la sécurité de nos services</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>3. Protection des Données</h2>
            <p>
              Nous mettons en place des mesures de sécurité strictes pour protéger vos données :
            </p>
            <ul>
              <li>Chiffrement SSL/TLS pour toutes les communications</li>
              <li>Stockage sécurisé avec accès restreint</li>
              <li>Surveillance continue des accès</li>
              <li>Sauvegardes régulières et sécurisées</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>4. Partage d'Informations</h2>
            <p>
              Nous ne vendons, ne louons ni ne partageons vos informations personnelles avec des tiers, 
              sauf dans les cas suivants :
            </p>
            <ul>
              <li>Obligation légale ou ordre judiciaire</li>
              <li>Protection de nos droits et de notre sécurité</li>
              <li>Prévention de la fraude ou d'activités illégales</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>5. Cookies et Technologies de Suivi</h2>
            <p>
              Nous utilisons des cookies essentiels pour le fonctionnement de notre site. 
              Aucun cookie de suivi ou de publicité n'est utilisé.
            </p>
          </section>

          <section className="privacy-section">
            <h2>6. Vos Droits</h2>
            <p>Conformément au RGPD, vous avez le droit de :</p>
            <ul>
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier des informations inexactes</li>
              <li>Demander la suppression de vos données</li>
              <li>Limiter le traitement de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>7. Conservation des Données</h2>
            <p>
              Nous conservons vos données uniquement le temps nécessaire à la fourniture de nos services 
              et conformément aux obligations légales. Les données sont automatiquement supprimées après 
              une période d'inactivité de 2 ans.
            </p>
          </section>

          <section className="privacy-section">
            <h2>8. Modifications de cette Politique</h2>
            <p>
              Cette politique de confidentialité peut être modifiée à tout moment. 
              Les modifications importantes seront notifiées via notre serveur Discord.
            </p>
          </section>

          <section className="privacy-section">
            <h2>9. Contact</h2>
            <p>
              Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
              contactez-nous :
            </p>
            <ul>
              <li>Discord : <a href="https://discord.gg/nkny5u8cEc" target="_blank" rel="noopener noreferrer">https://discord.gg/nkny5u8cEc</a></li>
              <li>Email : privacy@emynona.market</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
