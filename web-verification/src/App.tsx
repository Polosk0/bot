import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import OnePage from './pages/OnePage';
import GamePage from './pages/GamePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import './index.css';
import './App.css';

const App: React.FC = () => {
  // Détecter si on est dans un iframe (Discord Activity)
  const isInIframe = window.self !== window.top;
  const isGameRoute = window.location.pathname === '/game' || window.location.pathname === '/activity';
  
  // Rediriger automatiquement vers le jeu si on est dans un iframe et sur la page d'accueil
  React.useEffect(() => {
    if (isInIframe && window.location.pathname === '/') {
      window.location.href = '/game';
    }
  }, [isInIframe]);
  
  return (
    <Router>
      <div className="App">
        {!isGameRoute && <Header />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<OnePage />} />
            <Route path="/verify" element={<OnePage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/activity" element={<GamePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </main>
        {!isGameRoute && <Footer />}
      </div>
    </Router>
  );
};

export default App;

