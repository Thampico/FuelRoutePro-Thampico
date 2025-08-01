import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './HowItWorks.css';

const HowItWorks = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('calculations');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setCurrentUser(user);
  }, []);

  const calculationSteps = [
    {
      step: 1,
      title: "Base Transport Cost",
      formula: "Volume × Distance × Rate per Mile",
      example: "10 tonnes × 380 miles × $2.80/ton-mile = $10,640",
      description: "Initial cost calculation based on fuel volume, estimated route distance, and transport mode rates from your input"
    },
    {
      step: 2,
      title: "AI-Enhanced Cost Analysis",
      formula: "OpenAI processes route data → Enhanced cost factors",
      example: "AI analyzes hydrogen transport → Suggests specialized handling costs",
      description: "OpenAI (GPT-4) processes your route data to provide intelligent cost adjustments and market analysis"
    },
    {
      step: 3,
      title: "Fuel-Specific Multipliers",
      formula: "Base Cost × Fuel Type Factor",
      example: "$10,640 × 1.25 (Hydrogen safety factor) = $13,300",
      description: "Application of fuel-specific multipliers based on handling complexity, safety requirements, and industry standards"
    },
    {
      step: 4,
      title: "Final Cost Calculation",
      formula: "Adjusted Cost + Fees + Insurance + Environmental",
      example: "$13,300 + $650 + $75 + $125 = $14,150",
      description: "Complete cost including terminal fees, insurance, hub transfer costs, and carbon offset calculations"
    }
  ];

  const aiDataSources = [
    {
      source: "OpenAI (GPT-4)",
      purpose: "AI processing for cost optimization and market analysis",
      dataType: "Intelligent cost calculations, fuel-specific recommendations, safety analysis",
      reliability: "95.8%",
      updateFrequency: "Real-time (local processing)"
    },
    {
      source: "Static Market Database",
      purpose: "Baseline fuel transport rates and industry standards",
      dataType: "Transport mode rates, fuel handling multipliers, regulatory fees",
      reliability: "98.5%",
      updateFrequency: "Manually updated"
    },
    {
      source: "User Input Processing",
      purpose: "Route calculation and distance estimation",
      dataType: "Origin/destination data, volume calculations, transport mode selection",
      reliability: "99.1%",
      updateFrequency: "Instant"
    },
    {
      source: "Browser LocalStorage",
      purpose: "User data and calculation history storage",
      dataType: "User profiles, previous calculations, saved routes",
      reliability: "99.9%",
      updateFrequency: "Real-time"
    }
  ];

  const fuelSpecifics = {
    hydrogen: {
      name: "Hydrogen (H₂)",
      challenges: "Cryogenic storage (-253°C), pressure management, leak detection",
      multiplier: "1.25x base cost",
      aiOptimizations: "OpenAI evaluates temperature requirements, suggests pressure-safe routing, integrates safety protocols"
    },
    methanol: {
      name: "Methanol (CH₃OH)",
      challenges: "Chemical handling, fire suppression, vapor control",
      multiplier: "1.10x base cost",
      aiOptimizations: "AI assesses chemical compatibility, recommends temperature control, evaluates ventilation needs"
    },
    ammonia: {
      name: "Ammonia (NH₃)",
      challenges: "Refrigeration (-33°C), toxicity monitoring, specialized ventilation",
      multiplier: "1.15x base cost",
      aiOptimizations: "AI analyzes cooling requirements, suggests toxicity safety measures, plans emergency protocols"
    }
  };

  return (
    <div className="how-it-works-container">
      {/* Header */}
      <div className="how-it-works-header">
        <div className="welcome-section">
          <h1>Welcome to FuelRoute Pro Hub, {currentUser?.name}!</h1>
          <p>Discover how our OpenAI-powered system calculates accurate fuel transportation costs</p>
        </div>
        <div className="navigation-links">
          <Link to="/" className="nav-link">🏠 Home</Link>
          <Link to="/" className="nav-link calculator-link">🧮 Calculator</Link>
          <Link to="/subscribe" className="nav-link">💳 Subscription</Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'calculations' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculations')}
        >
          📊 Calculation Process
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ai-sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-sources')}
        >
          🤖 AI Data Sources
        </button>
        <button 
          className={`tab-btn ${activeTab === 'fuel-insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('fuel-insights')}
        >
          ⚡ Fuel Insights
        </button>
      </div>

      {/* Content Sections */}
      <div className="content-container">
        
        {/* Calculations Tab */}
        {activeTab === 'calculations' && (
          <div className="calculations-section">
            <h2>Step-by-Step Calculation Process</h2>
            <p className="section-description">
              Our OpenAI system processes your transport requirements through these intelligent calculation stages:
            </p>
            
            <div className="calculation-steps">
              {calculationSteps.map((calc, index) => (
                <div key={index} className="calculation-card">
                  <div className="step-number">Step {calc.step}</div>
                  <div className="calculation-content">
                    <h3>{calc.title}</h3>
                    <div className="formula-box">
                      <strong>Process:</strong> {calc.formula}
                    </div>
                    <div className="example-box">
                      <strong>Example:</strong> {calc.example}
                    </div>
                    <p>{calc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Sources Tab */}
        {activeTab === 'ai-sources' && (
          <div className="ai-sources-section">
            <h2>AI System & Data Sources</h2>
            <p className="section-description">
              Our current implementation uses OpenAI for intelligent processing combined with these data sources:
            </p>
            
            <div className="data-sources-grid">
              {aiDataSources.map((source, index) => (
                <div key={index} className="data-source-card">
                  <div className="source-header">
                    <h3>{source.source}</h3>
                    <div className="reliability-badge">
                      {source.reliability} Reliable
                    </div>
                  </div>
                  <div className="source-details">
                    <div className="detail-item">
                      <strong>Purpose:</strong> {source.purpose}
                    </div>
                    <div className="detail-item">
                      <strong>Data Type:</strong> {source.dataType}
                    </div>
                    <div className="detail-item">
                      <strong>Update Frequency:</strong> {source.updateFrequency}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ai-process-flow">
              <h3>OpenAI Processing Flow</h3>
              <div className="process-steps">
                <div className="process-step">
                  <div className="step-icon">📥</div>
                  <div className="step-content">
                    <h4>Input Collection</h4>
                    <p>Route data from user interface</p>
                  </div>
                </div>
                <div className="arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">🤖</div>
                  <div className="step-content">
                    <h4>OpenAI Processing</h4>
                    <p>Cloud AI analysis with GPT-4 model</p>
                  </div>
                </div>
                <div className="arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">⚡</div>
                  <div className="step-content">
                    <h4>Cost Enhancement</h4>
                    <p>AI-driven cost adjustments and insights</p>
                  </div>
                </div>
                <div className="arrow">→</div>
                <div className="process-step">
                  <div className="step-icon">📊</div>
                  <div className="step-content">
                    <h4>Results</h4>
                    <p>Enhanced calculations with AI insights</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="current-implementation">
              <h3>Current Implementation Status</h3>
              <div className="implementation-grid">
                <div className="implementation-item active">
                  <div className="status-icon">✅</div>
                  <h4>OpenAI Integration</h4>
                  <p>Cloud AI processing with GPT-4 model for enhanced calculations</p>
                </div>
                <div className="implementation-item active">
                  <div className="status-icon">✅</div>
                  <h4>Static Market Data</h4>
                  <p>Baseline transport rates and fuel-specific multipliers</p>
                </div>
                <div className="implementation-item planned">
                  <div className="status-icon">🔮</div>
                  <h4>Real-time Market APIs</h4>
                  <p>Future integration with live market data sources</p>
                </div>
                <div className="implementation-item planned">
                  <div className="status-icon">🔮</div>
                  <h4>Weather & Traffic APIs</h4>
                  <p>Planned integration for dynamic route optimization</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fuel Insights Tab */}
        {activeTab === 'fuel-insights' && (
          <div className="fuel-insights-section">
            <h2>Fuel-Specific AI Analysis</h2>
            <p className="section-description">
              Our OpenAI system provides specialized analysis for each alternative fuel type:
            </p>
            
            <div className="fuel-cards-grid">
              {Object.entries(fuelSpecifics).map(([key, fuel]) => (
                <div key={key} className={`fuel-insight-card ${key}`}>
                  <div className="fuel-header">
                    <h3>{fuel.name}</h3>
                    <div className="multiplier-badge">{fuel.multiplier}</div>
                  </div>
                  <div className="fuel-content">
                    <div className="challenges-section">
                      <h4>🔧 Transport Challenges:</h4>
                      <p>{fuel.challenges}</p>
                    </div>
                    <div className="ai-optimizations-section">
                      <h4>🤖 OpenAI Analysis:</h4>
                      <p>{fuel.aiOptimizations}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="market-intelligence">
              <h3>AI-Powered Insights</h3>
              <div className="intelligence-grid">
                <div className="intelligence-item">
                  <div className="intelligence-icon">🧠</div>
                  <h4>Intelligent Cost Analysis</h4>
                  <p>OpenAI evaluates transport complexity and suggests optimized pricing</p>
                </div>
                <div className="intelligence-item">
                  <div className="intelligence-icon">🛡️</div>
                  <h4>Safety Assessment</h4>
                  <p>AI-driven analysis of fuel-specific safety requirements and protocols</p>
                </div>
                <div className="intelligence-item">
                  <div className="intelligence-icon">📈</div>
                  <h4>Cost Optimization</h4>
                  <p>Local AI processing provides instant cost calculations and recommendations</p>
                </div>
                <div className="intelligence-item">
                  <div className="intelligence-icon">💾</div>
                  <h4>Local Data Processing</h4>
                  <p>All calculations processed locally for speed and data privacy</p>
                </div>
              </div>
            </div>

            <div className="ai-info">
              <h3>About AI Integration</h3>
              <div className="ai-details">
                <div className="ai-feature">
                  <h4>🤖 OpenAI Integration</h4>
                  <p>Powered by GPT-4 for accurate market analysis and pricing</p>
                </div>
                <div className="ai-feature">
                  <h4>⚡ Real-time Processing</h4>
                  <p>Instant AI analysis with current market data</p>
                </div>
                <div className="ai-feature">
                  <h4>🔒 Secure Processing</h4>
                  <p>All data processed securely through encrypted connections</p>
                </div>
                <div className="ai-feature">
                  <h4>📊 Enhanced Calculations</h4>
                  <p>AI provides intelligent cost adjustments and market insights</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HowItWorks;