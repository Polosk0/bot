import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      const sections = ['hero', 'features', 'services', 'verification', 'backup'];
      const scrollPosition = window.scrollY + 150;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsMenuOpen(false);
    }
  };

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-background"></div>
      <div className="header-glow"></div>
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo" onClick={(e) => {
            e.preventDefault();
            handleNavClick(e as any, '#hero');
          }}>
            <div className="logo-icon">
              <div className="logo-icon-inner">
                <img src="/logo.png" alt="Emynona Market" className="logo-image" />
              </div>
              <div className="logo-shine"></div>
            </div>
            <div className="logo-text">
              <span className="logo-name">Emynona</span>
              <span className="logo-market">Market</span>
            </div>
          </Link>

          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <a 
              href="#hero" 
              className={`nav-link ${activeSection === 'hero' ? 'active' : ''}`} 
              onClick={(e) => handleNavClick(e, '#hero')}
            >
              <span className="nav-link-text">Accueil</span>
              <span className="nav-link-indicator"></span>
            </a>
            <a 
              href="#features" 
              className={`nav-link ${activeSection === 'features' ? 'active' : ''}`} 
              onClick={(e) => handleNavClick(e, '#features')}
            >
              <span className="nav-link-text">Fonctionnalités</span>
              <span className="nav-link-indicator"></span>
            </a>
            <a 
              href="#services" 
              className={`nav-link ${activeSection === 'services' ? 'active' : ''}`} 
              onClick={(e) => handleNavClick(e, '#services')}
            >
              <span className="nav-link-text">Services</span>
              <span className="nav-link-indicator"></span>
            </a>
            <a 
              href="#verification" 
              className={`nav-link ${activeSection === 'verification' ? 'active' : ''}`} 
              onClick={(e) => handleNavClick(e, '#verification')}
            >
              <span className="nav-link-text">Vérification</span>
              <span className="nav-link-indicator"></span>
            </a>
            <a 
              href="#backup" 
              className={`nav-link ${activeSection === 'backup' ? 'active' : ''}`} 
              onClick={(e) => handleNavClick(e, '#backup')}
            >
              <span className="nav-link-text">Backup</span>
              <span className="nav-link-indicator"></span>
            </a>
          </nav>

          <button 
            className={`menu-toggle ${isMenuOpen ? 'menu-open' : ''}`} 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className="hamburger hamburger-1"></span>
            <span className="hamburger hamburger-2"></span>
            <span className="hamburger hamburger-3"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
