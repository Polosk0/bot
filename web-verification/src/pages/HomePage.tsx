import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <div className="hero-particles"></div>
          <div className="hero-grid"></div>
          <ParticleBackground />
        </div>
        <div className="container">
          <div className="hero-content">
            <div className={`hero-text ${isVisible ? 'fade-in-left' : ''}`}>
              <div className="hero-badge">
                <span className="badge-icon">🚀</span>
                <span>Plateforme</span>
              </div>
              <h1 className="hero-title">
                Bienvenue sur
                <span className="hero-brand text-gradient"> Emynona Market</span>
              </h1>
              <p className="hero-subtitle">
                Plateforme sécurisée de services Refund & Boxing avec vérification Discord intégrée.
                Accédez à nos services en toute sécurité et confiance.
              </p>
              <div className="hero-buttons">
                <Link to="/verify" className="btn btn-primary btn-large hover-lift">
                  <span className="btn-icon">🔒</span>
                  Se Vérifier Maintenant
                </Link>
                <Link to="/services" className="btn btn-secondary btn-large hover-lift">
                  <span className="btn-icon">⚡</span>
                  Découvrir nos Services
                </Link>
              </div>
            </div>
            <div className={`hero-visual ${isVisible ? 'fade-in-right' : ''}`}>
              <div className="verification-card hover-lift">
                <div className="card-header">
                  <div className="card-icon">🛡️</div>
                  <div>
                    <h3>Vérification Sécurisée</h3>
                    <p className="card-subtitle">Processus automatisé et sécurisé</p>
                  </div>
                </div>
                <div className="card-content">
                  <div className="verification-step">
                    <div className="step-content">
                      <span className="step-title">Connexion Discord</span>
                      <span className="step-desc">Authentification OAuth2</span>
                    </div>
                  </div>
                  <div className="verification-step">
                    <div className="step-content">
                      <span className="step-title">Vérification Automatique</span>
                      <span className="step-desc">Analyse de sécurité</span>
                    </div>
                  </div>
                  <div className="verification-step">
                    <div className="step-content">
                      <span className="step-title">Accès aux Services</span>
                      <span className="step-desc">Activation immédiate</span>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <div className="security-badge">
                    <span className="badge-icon">✅</span>
                    <span>100% Sécurisé & Chiffré</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="features-header">
            <h2 className="section-title">Pourquoi Choisir Emynona ?</h2>
            <div className="features-subtitle">
              <span className="subtitle-line"></span>
              <span className="subtitle-text">Excellence & Innovation</span>
              <span className="subtitle-line"></span>
            </div>
          </div>
          
          <div className="features-scroll-container">
            <div className="features-scroll-track">
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Sécurité Maximale</h3>
                <p>Vérification Discord intégrée, chiffrement de bout en bout</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Rapidité d'Exécution</h3>
                <p>Services rapides avec équipe disponible 24/7</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Qualité Garantie</h3>
                <p>Services testés et approuvés par la communauté</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Support</h3>
                <p>Support dédié avec solutions personnalisées</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Confidentialité Totale</h3>
                <p>Données privées et sécurisées, aucun partage</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Innovation Continue</h3>
                <p>Amélioration constante avec les dernières technologies</p>
              </div>
              
              {/* Duplication pour l'effet de boucle infinie */}
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Sécurité Maximale</h3>
                <p>Vérification Discord intégrée, chiffrement de bout en bout</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Rapidité d'Exécution</h3>
                <p>Services rapides avec équipe disponible 24/7</p>
              </div>
              
              <div className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                  <div className="particle particle-5"></div>
                </div>
                <h3>Qualité Garantie</h3>
                <p>Services testés et approuvés par la communauté</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
