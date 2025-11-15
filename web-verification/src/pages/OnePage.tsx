import React, { useState, useEffect } from 'react';
import ParticleBackground from '../components/ParticleBackground';
import LoadingSpinner from '../components/LoadingSpinner';
import './OnePage.css';

interface VerificationStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

const OnePage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const success = urlParams.get('success');
    
    if (window.location.pathname === '/verify') {
      if (success === 'true') {
        setVerificationComplete(true);
        setCurrentStep(4);
      } else if (error) {
        console.error('Erreur de vérification:', error);
        setIsVerifying(false);
      } else if (code) {
        handleOAuthCallback(code);
      }
    }
  }, []);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const startDiscordOAuth = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[OAUTH] ========================================');
    console.log('[OAUTH] Démarrage de l\'OAuth Discord...');
    console.log('[OAUTH] ========================================');
    
    setIsVerifying(true);
    setCurrentStep(1);
    
    console.log('[OAUTH] Envoi de la requête à /api/oauth/url...');
    
    fetch('/api/oauth/url', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        console.log('[OAUTH] Réponse reçue:', res.status, res.statusText);
        console.log('[OAUTH] Headers:', res.headers);
        if (!res.ok) {
          return res.json().then(err => {
            console.error('[OAUTH] ❌ Erreur HTTP:', err);
            throw new Error(err.message || `Erreur HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        console.log('[OAUTH] ✅ Données reçues:', data);
        if (data.success && data.authUrl) {
          console.log('[OAUTH] 🔗 Redirection vers Discord:', data.authUrl);
          window.location.href = data.authUrl;
        } else {
          console.error('[OAUTH] ❌ Données invalides:', data);
          throw new Error(data.message || 'Impossible d\'obtenir l\'URL d\'autorisation');
        }
      })
      .catch(error => {
        console.error('[OAUTH] ❌❌❌ ERREUR:', error);
        console.error('[OAUTH] Stack:', error.stack);
        alert(`Erreur: ${error.message}\n\nVérifiez la console (F12) pour plus de détails.`);
        setIsVerifying(false);
        setCurrentStep(0);
      });
  };

  const handleOAuthCallback = async (code: string) => {
    setIsVerifying(true);
    setCurrentStep(2);
    
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setCurrentStep(3);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentStep(4);
        setVerificationComplete(true);
        setIsVerifying(false);
        
        window.history.replaceState({}, '', '/verify?success=true');
      } else {
        throw new Error(result.message || 'Erreur lors de la vérification');
      }
    } catch (error) {
      console.error('Erreur de vérification:', error);
      setIsVerifying(false);
      setCurrentStep(0);
      window.history.replaceState({}, '', `/verify?error=${encodeURIComponent(error instanceof Error ? error.message : 'Erreur inconnue')}`);
    }
  };

  const steps: VerificationStep[] = [
    {
      id: 1,
      title: 'Connexion Discord',
      description: 'Connectez-vous avec votre compte Discord pour commencer la vérification',
      icon: '🔐',
      completed: false
    },
    {
      id: 2,
      title: 'Vérification Automatique',
      description: 'Notre système vérifie automatiquement votre compte et vos permissions',
      icon: '🛡️',
      completed: false
    },
    {
      id: 3,
      title: 'Attribution des Rôles',
      description: 'Les rôles appropriés sont attribués automatiquement à votre compte',
      icon: '✅',
      completed: false
    },
    {
      id: 4,
      title: 'Accès aux Services',
      description: 'Vous pouvez maintenant accéder à tous nos services',
      icon: '🚀',
      completed: false
    }
  ];

  const services = [
    {
      id: 'refund',
      title: 'Refund Services',
      icon: '💰',
      description: 'Services de remboursement sécurisés et rapides pour vos achats en ligne',
      features: [
        'Remboursement rapide (24-48h)',
        'Support 24/7',
        'Garantie de sécurité',
        'Processus automatisé'
      ],
      price: 'Commission de 35%',
      color: '#ffd700'
    },
    {
      id: 'boxing',
      title: 'Boxing Services',
      icon: '📦',
      description: 'Modification des suivis de commandes pour faciliter les remboursements',
      features: [
        'Modification des numéros de suivi',
        'Création de preuves de livraison',
        'Gestion des retours',
        'Support technique avancé'
      ],
      price: 'Tarifs avantageux',
      color: '#5865F2'
    },
    {
      id: 'custom',
      title: 'Services Sur Mesure',
      icon: '🎯',
      description: 'Solutions personnalisées adaptées à vos besoins spécifiques',
      features: [
        'Analyse personnalisée',
        'Solutions innovantes',
        'Support dédié',
        'Évolutif'
      ],
      price: 'Sur demande',
      color: '#00ff88'
    }
  ];

  const features = [
    {
      title: 'Rapidité d\'Exécution',
      description: 'Services rapides avec équipe disponible 24/7',
      icon: '⚡'
    },
    {
      title: 'Qualité Garantie',
      description: 'Services testés et approuvés par la communauté',
      icon: '⭐'
    },
    {
      title: 'Confidentialité Totale',
      description: 'Données privées et sécurisées, aucun partage',
      icon: '🔒'
    },
    {
      title: 'Innovation Continue',
      description: 'Amélioration constante avec les dernières technologies',
      icon: '🚀'
    }
  ];


  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="one-page">
      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-background">
          <div className="hero-particles"></div>
          <div className="hero-grid"></div>
          <ParticleBackground />
        </div>
        <div className="container">
          <div className="hero-content">
            <div className={`hero-text ${isVisible ? 'fade-in-left' : ''}`}>
              <h1 className="hero-title">
                Bienvenue sur
                <span className="hero-brand text-gradient"> Emynona Market</span>
              </h1>
              <p className="hero-subtitle">
                Plateforme sécurisée de services Refund & Boxing avec vérification Discord intégrée.
                Accédez à nos services en toute sécurité et confiance.
              </p>
              <div className="hero-buttons">
                <a href="#verification" className="btn btn-primary btn-large hover-lift" onClick={(e) => handleScrollTo(e, '#verification')}>
                  <span className="btn-icon">🔒</span>
                  Se Vérifier Maintenant
                </a>
                <a href="#services" className="btn btn-secondary btn-large hover-lift" onClick={(e) => handleScrollTo(e, '#services')}>
                  <span className="btn-icon">⚡</span>
                  Découvrir nos Services
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="features-header">
            <h2 className="section-title">Pourquoi Choisir Emynona ?</h2>
            <div className="features-subtitle">
              <span className="subtitle-line"></span>
              <span className="subtitle-text">Excellence & Innovation</span>
              <span className="subtitle-line"></span>
            </div>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                </div>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section">
        <div className="geometric-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        
        <div className="container">
          <div className="services-header">
            <h2 className="section-title">
              Nos <span className="highlight">Services</span>
            </h2>
            <p className="section-subtitle">
              Des solutions professionnelles pour tous vos besoins avec une sécurité maximale
            </p>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <div key={service.id} className="service-card">
                <div className="service-header">
                  <div 
                    className="service-icon"
                    style={{ backgroundColor: service.color + '20', color: service.color }}
                  >
                    {service.icon}
                  </div>
                  <div className="service-price">{service.price}</div>
                </div>
                <div className="service-content">
                  <h3 className="service-title">{service.title}</h3>
                  <p className="service-description">{service.description}</p>
                  <ul className="service-features">
                    {service.features.map((feature, index) => (
                      <li key={index} className="feature-item">
                        <span className="feature-icon">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Section */}
      <section id="verification" className="verification-section">
        <div className="verify-shapes">
          <div className="verify-shape verify-shape-1"></div>
          <div className="verify-shape verify-shape-2"></div>
          <div className="verify-shape verify-shape-3"></div>
        </div>
        
        <div className="container">
          {verificationComplete ? (
            <div className="verification-complete">
              <div className="success-animation">
                <div className="success-icon-wrapper">
                  <svg className="success-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#goldGradient)" strokeWidth="3" className="success-circle"/>
                    <path d="M30 50 L45 65 L70 35" fill="none" stroke="url(#goldGradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="success-check"/>
                    <defs>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#ffd700', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: '#ffed4e', stopOpacity: 1}} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="success-glow"></div>
                </div>
              </div>
              <h1 className="success-title">Vérification Réussie !</h1>
              <p className="success-description">
                Félicitations ! Votre compte a été vérifié avec succès. 
                Vous pouvez maintenant accéder à tous nos services.
              </p>
              <div className="success-features">
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span>Accès aux services Refund & Boxing</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <span>Support client prioritaire</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⚡</span>
                  <span>Services rapides et sécurisés</span>
                </div>
              </div>
              <div className="success-actions">
                <a href="https://discord.gg/nkny5u8cEc" className="btn btn-primary btn-large" target="_blank" rel="noopener noreferrer">
                  <span className="btn-icon">💬</span>
                  Rejoindre le Serveur Discord
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="verification-header">
                <h1 className="verification-title">
                  Vérification <span className="highlight">Discord</span>
                </h1>
                <p className="verification-subtitle">
                  Accédez à nos services en vous vérifiant avec votre compte Discord
                </p>
              </div>

              <div className="verification-content">
                <div className="verification-actions">
                  {!isVerifying && currentStep === 0 && (
                    <div className="verification-card">
                      <div className="card-header">
                        <div className="card-icon">🔒</div>
                        <h3>Vérification Sécurisée</h3>
                      </div>
                      <div className="card-content">
                        <p>
                          Pour accéder à nos services, vous devez vous connecter avec votre compte Discord. 
                          Cette vérification est 100% sécurisée et ne stocke aucune donnée personnelle.
                        </p>
                        <div className="security-features">
                          <div className="security-item">
                            <span className="security-icon">🛡️</span>
                            <span>Chiffrement SSL</span>
                          </div>
                          <div className="security-item">
                            <span className="security-icon">🔐</span>
                            <span>OAuth2 Discord</span>
                          </div>
                          <div className="security-item">
                            <span className="security-icon">✅</span>
                            <span>Vérification Automatique</span>
                          </div>
                        </div>
                      </div>
                      <div className="card-footer">
                        <button 
                          className="btn btn-discord btn-large"
                          onClick={(e) => {
                            console.log('[BUTTON] Bouton cliqué !');
                            startDiscordOAuth(e);
                          }}
                          type="button"
                        >
                          <span className="btn-icon">💬</span>
                          Se Connecter avec Discord
                        </button>
                      </div>
                    </div>
                  )}

                  {isVerifying && (
                    <div className="verification-progress">
                      <div className="progress-animation">
                        <LoadingSpinner size="large" text="Vérification en cours..." />
                      </div>
                      <h3>Vérification en cours...</h3>
                      <p>Veuillez patienter pendant que nous vérifions votre compte.</p>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        ></div>
                      </div>
                      <div className="progress-steps">
                        {steps.map((step, index) => (
                          <div 
                            key={step.id}
                            className={`progress-step ${index < currentStep ? 'completed' : index === currentStep ? 'current' : 'pending'}`}
                          >
                            <div className="progress-step-indicator">
                              {index < currentStep ? '✓' : index + 1}
                            </div>
                            <span className="progress-step-text">{step.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Backup Section */}
      <section id="backup" className="backup-section">
        <div className="backup-shapes">
          <div className="backup-shape backup-shape-1"></div>
          <div className="backup-shape backup-shape-2"></div>
          <div className="backup-shape backup-shape-3"></div>
        </div>
        
        <div className="container">
          <div className="backup-header">
            <h2 className="section-title">
              <span className="highlight-icon">💾</span>
              Backup
            </h2>
            <div className="backup-subtitle">
              <span className="subtitle-line"></span>
              <span className="subtitle-text">Retrouvez-nous facilement</span>
              <span className="subtitle-line"></span>
            </div>
            <p className="backup-description">
              Conservez ces informations importantes pour nous retrouver à tout moment.
              Tous nos moyens de contact sont disponibles ci-dessous.
            </p>
          </div>

          <div className="backup-content">
            <div className="backup-grid">
              {/* Discord */}
              <div className="backup-card">
                <div className="backup-card-icon">💬</div>
                <h3 className="backup-card-title">Discord</h3>
                <p className="backup-card-description">
                  Rejoignez notre serveur Discord pour rester connecté
                </p>
                <div className="backup-card-content">
                  <div className="backup-link-item">
                    <span className="backup-link-label">Serveur:</span>
                    <a 
                      href="https://discord.gg/nkny5u8cEc" 
                      className="backup-link" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      discord.gg/nkny5u8cEc
                    </a>
                  </div>
                </div>
              </div>

              {/* Telegram */}
              <div className="backup-card">
                <div className="backup-card-icon">📱</div>
                <h3 className="backup-card-title">Telegram</h3>
                <p className="backup-card-description">
                  Contactez-nous via Telegram pour un support rapide
                </p>
                <div className="backup-card-content">
                  <div className="backup-link-item">
                    <span className="backup-link-label">Canal/Groupe:</span>
                    <span className="backup-link-placeholder">À ajouter</span>
                  </div>
                  <div className="backup-link-item">
                    <span className="backup-link-label">Support:</span>
                    <span className="backup-link-placeholder">À ajouter</span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="backup-card">
                <div className="backup-card-icon">📧</div>
                <h3 className="backup-card-title">Contact</h3>
                <p className="backup-card-description">
                  Autres moyens de nous contacter
                </p>
                <div className="backup-card-content">
                  <div className="backup-link-item">
                    <span className="backup-link-label">Email:</span>
                    <span className="backup-link-placeholder">À ajouter</span>
                  </div>
                  <div className="backup-link-item">
                    <span className="backup-link-label">Autre:</span>
                    <span className="backup-link-placeholder">À ajouter</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="backup-note">
              <div className="backup-note-icon">ℹ️</div>
              <p className="backup-note-text">
                Cette section sera régulièrement mise à jour avec de nouveaux moyens de contact. 
                N'hésitez pas à la consulter régulièrement pour rester informé.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OnePage;

