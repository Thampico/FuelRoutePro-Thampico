import FuelRouteApp from './components/FuelRouteApp';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './components/Login';
import HowItWorks from './components/HowItWorks';
import Subscription from './components/Subscription';
import Support from './components/Support';
import Help from './components/Help';
import './App.css';

// API Service - Backend Integration (Production level)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://fuelroutepro-thampico.onrender.com/api';

const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// API functions
const checkApiHealth = () => makeRequest('/health');
const getFuelTypes = () => makeRequest('/fuel-types');
const getRouteHistory = () => makeRequest('/routes');
const calculateRouteCost = (routeData) => makeRequest('/calculate-cost', {
  method: 'POST',
  body: JSON.stringify(routeData),
});

function App() {
  // Backend integration state
  const [apiStatus, setApiStatus] = useState('checking');
  const [fuelTypes, setFuelTypes] = useState(['hydrogen', 'methanol', 'ammonia']);
  const [routeHistory, setRouteHistory] = useState([]);

  useEffect(() => {
    // Backend initialization
    const initializeBackend = async () => {
      try {
        // Check API health
        await checkApiHealth();
        setApiStatus('connected');
        console.log('✅ Backend connected successfully');

        // Load fuel types
        try {
          const fuelTypesResponse = await getFuelTypes();
          setFuelTypes(fuelTypesResponse.data || ['hydrogen', 'methanol', 'ammonia']);
        } catch (error) {
          console.warn('Using default fuel types:', error.message);
        }

        // Load route history
        try {
          const historyResponse = await getRouteHistory();
          setRouteHistory(historyResponse.data || []);
        } catch (error) {
          console.warn('Could not load route history:', error.message);
        }

      } catch (error) {
        console.error('Backend connection failed:', error);
        setApiStatus('error');
      }
    };

    // Smooth scrolling for navigation links
    const handleSmoothScroll = (e) => {
      if (e.target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    };

    // Hide header-top on scroll down
    let lastScrollY = window.scrollY;
    const headerTop = document.querySelector('.header-top');
    const header = document.querySelector('.header');

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        if (headerTop) headerTop.style.transform = 'translateY(-100%)';
        if (header) header.style.top = '0';
      } else {
        if (headerTop) headerTop.style.transform = 'translateY(0)';
        if (header) header.style.top = '40px';
      }
      
      lastScrollY = currentScrollY;
    };

    // Initialize everything
    initializeBackend();
    document.addEventListener('click', handleSmoothScroll);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('click', handleSmoothScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Backend integration functions to pass to FuelRouteApp
  const backendAPI = {
    calculateCost: calculateRouteCost,
    isConnected: apiStatus === 'connected',
    fuelTypes,
    routeHistory,
    refreshHistory: async () => {
      try {
        const historyResponse = await getRouteHistory();
        setRouteHistory(historyResponse.data || []);
      } catch (error) {
        console.warn('Could not refresh route history:', error.message);
      }
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/support" element={<Support />} />
        <Route path="/help" element={<Help />} />
        <Route path="/subscribe" element={<Subscription />} />
        <Route path="/" element={
          <div className="App">

      {/* Header Top */}
      <div className="header-top">
        <div className="header-top-container">
        <Link to="/login">🔐 Hub Login</Link>
          <Link to="/help">❓ Help</Link>
          <Link to="/support">📞 Support</Link>
          <span className={`backend-status ${apiStatus}`}>
            {apiStatus === 'connected' ? '🟢 Backend Online (AI Enhanced)' : 
             apiStatus === 'error' ? '🔴 Backend Offline' : 
             '🟡 Connecting...'}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="nav-container">
          <div className="logo">
            FuelRoute Pro
            <div className="logo-subtitle">By THAMPICO</div>
          </div>
          
          <div className="header-right">
            <div className="search-icon"></div>
            <a href="fuelroute-documentation.html" target="_blank" rel="noopener noreferrer" className="documentation-button">
               Documentation
            </a>
            <a href="#calculator" className="cta-button">Try Calculator</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1>The Future of Fuel Transportation</h1>
            <p className="subtitle">AI-powered cost estimation for hydrogen, methanol, and ammonia logistics across all transport modes</p>
            <p className="description">Calculate transportation costs for hydrogen, methanol, and ammonia across multiple modes. Optimize routes, reduce costs, and accelerate the clean energy transition.</p>
            
            
        

            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">3</div>
                <div className="stat-label">Alternative Fuels</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">2</div>
                <div className="stat-label">Transport Modes</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">AI</div>
                <div className="stat-label">Powered Analysis</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="fuel-cards">
              <div className="fuel-card">
                <div className="fuel-formula">H₂</div>
                <div className="fuel-name">Hydrogen</div>
              </div>
              <div className="fuel-card">
                <div className="fuel-formula">CH₃OH</div>
                <div className="fuel-name">Methanol</div>
              </div>
              <div className="fuel-card">
                <div className="fuel-formula">NH₃</div>
                <div className="fuel-name">Ammonia</div>
              </div>
            </div>
          </div>
        </div>
      </section>







      {/* Calculator Section */}
      <section id="calculator">
        <FuelRouteApp
          backendAPI={backendAPI}
          apiStatus={apiStatus}
        />
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            
            <div className="social-links">
              <a href="mailto:info@thampico.com" title="Email">Email</a>
              <a href="https://www.linkedin.com/company/thampico/" target="_blank" rel="noopener noreferrer" title="LinkedIn">LinkedIn</a>
            
            </div>
          </div>
          
          <div className="footer-section">
            
          </div>

        </div>
        
        <div className="footer-bottom">
          <div>© 2025 FuelRoute Pro. All Rights Reserved. Developed by THAMPICO Capstone Program.</div>
          <div className="footer-bottom-links">
            <a href="#terms">Terms & Conditions</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#cookies">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
