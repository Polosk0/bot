import React from 'react';
import './ServicesPage.css';

const ServicesPage: React.FC = () => {
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
      color: '#ff6b6b'
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
      color: '#4ecdc4'
    }
  ];


  return (
    <div className="services-page">
      {/* Formes géométriques animées */}
      <div className="geometric-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
      </div>
      
      {/* Particules flottantes */}
      <div className="floating-particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <div className="container">
        {/* Header */}
        <div className="services-header">
          <h1 className="services-title">
            Nos <span className="highlight">Services</span>
          </h1>
          <p className="services-subtitle">
            Des solutions professionnelles pour tous vos besoins avec une sécurité maximale
          </p>
        </div>


        {/* Services Grid */}
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

        {/* Section Statistiques */}
        <div className="services-stats">
          <div className="stats-container">
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support Disponible</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">48h</div>
              <div className="stat-label">Délai de traitement</div>
            </div>
          </div>
        </div>

        {/* Section Témoignages */}
        <div className="testimonials">
          <div className="testimonials-header">
            <h2 className="testimonials-title">Ce que disent nos clients</h2>
            <p className="testimonials-subtitle">Des témoignages authentiques de notre communauté</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="testimonial-quote">"Service exceptionnel ! Remboursement rapide et sécurisé. Je recommande vivement."</div>
                <div className="testimonial-author">
                  <div className="author-avatar">👤</div>
                  <div className="author-info">
                    <div className="author-name">Alex M.</div>
                    <div className="author-role">Client</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="testimonial-quote">"Équipe professionnelle et réactive. Le processus de vérification est très fluide."</div>
                <div className="testimonial-author">
                  <div className="author-avatar">👤</div>
                  <div className="author-info">
                    <div className="author-name">Sarah L.</div>
                    <div className="author-role">Utilisatrice</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="testimonial-quote">"Support client au top ! Ils m'ont aidé à résoudre mon problème en moins d'une heure."</div>
                <div className="testimonial-author">
                  <div className="author-avatar">👤</div>
                  <div className="author-info">
                    <div className="author-name">Thomas K.</div>
                    <div className="author-role">Client Fidèle</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServicesPage;
