import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import './VerificationPage.css';

interface VerificationStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

const VerificationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  const handleDiscordLogin = () => {
    setIsVerifying(true);
    
    // Simuler le processus de vérification
    simulateVerification();
  };

  const simulateVerification = async () => {
    // Étape 1: Connexion Discord
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCurrentStep(1);
    updateStepCompletion(0, true);

    // Étape 2: Vérification automatique
    await new Promise(resolve => setTimeout(resolve, 3000));
    setCurrentStep(2);
    updateStepCompletion(1, true);

    // Étape 3: Attribution des rôles
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCurrentStep(3);
    updateStepCompletion(2, true);

    // Étape 4: Finalisation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCurrentStep(4);
    updateStepCompletion(3, true);
    setVerificationComplete(true);
    setIsVerifying(false);
  };

  const updateStepCompletion = (stepIndex: number, completed: boolean) => {
    steps[stepIndex].completed = completed;
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  if (verificationComplete) {
    return (
      <div className="verification-page">
        <div className="container">
          <div className="verification-complete">
            <div className="success-animation">
              <div className="success-icon">✅</div>
              <div className="success-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page">
      {/* Formes de vérification animées */}
      <div className="verify-shapes">
        <div className="verify-shape verify-shape-1"></div>
        <div className="verify-shape verify-shape-2"></div>
        <div className="verify-shape verify-shape-3"></div>
        <div className="verify-shape verify-shape-4"></div>
        <div className="verify-shape verify-shape-5"></div>
      </div>
      
      {/* Particules de sécurité */}
      <div className="security-particles">
        <div className="security-particle"></div>
        <div className="security-particle"></div>
        <div className="security-particle"></div>
        <div className="security-particle"></div>
        <div className="security-particle"></div>
        <div className="security-particle"></div>
        <div className="security-particle"></div>
        <div className="security-particle"></div>
      </div>
      
      {/* Lignes de connexion */}
      <div className="connection-lines">
        <div className="connection-line connection-line-1"></div>
        <div className="connection-line connection-line-2"></div>
        <div className="connection-line connection-line-3"></div>
      </div>
      
      <div className="container">
        <div className="verification-header">
          <h1 className="verification-title">
            Vérification <span className="highlight">Discord</span>
          </h1>
          <p className="verification-subtitle">
            Accédez à nos services en vous vérifiant avec votre compte Discord
          </p>
        </div>

        <div className="verification-content">
          <div className="verification-steps">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`verification-step ${getStepStatus(index)}`}
              >
                <div className="step-indicator">
                  <div className="step-icon">
                    {step.completed ? '✅' : step.icon}
                  </div>
                  <div className="step-number">{step.id}</div>
                </div>
                <div className="step-content">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="step-connector"></div>
                )}
              </div>
            ))}
          </div>

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
                    onClick={handleDiscordLogin}
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
      </div>
    </div>
  );
};

export default VerificationPage;
