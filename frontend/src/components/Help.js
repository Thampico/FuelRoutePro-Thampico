import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Help.css';

const Help = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setCurrentUser(user);
  }, []);

  // Comprehensive search suggestions with actions
  const searchSuggestionsData = [
    // Calculator & Main Functions
    { text: 'Calculate fuel costs', action: 'navigate', target: '/#calculator', description: 'Go to cost calculator' },
    { text: 'Cost calculator', action: 'navigate', target: '/#calculator', description: 'Access the main calculator' },
    { text: 'Fuel calculator', action: 'navigate', target: '/#calculator', description: 'Calculate transportation costs' },
    { text: 'Transportation calculator', action: 'navigate', target: '/#calculator', description: 'Calculate fuel transport costs' },
    
    // Fuel Types
    { text: 'Hydrogen transportation', action: 'faq', target: 'ai-features', description: 'Learn about hydrogen transport' },
    { text: 'Methanol logistics', action: 'faq', target: 'transport-modes', description: 'Methanol transportation info' },
    { text: 'Alternative fuels', action: 'faq', target: 'getting-started', description: 'Information about supported fuels' },
    
    // Transport Modes
    { text: 'Transport modes', action: 'faq', target: 'transport-modes', description: 'Learn about transport options' },
    { text: 'Multi-modal transport', action: 'faq', target: 'transport-modes', description: 'Multiple transport modes' },
    { text: 'Truck transport', action: 'faq', target: 'transport-modes', description: 'Truck transportation info' },
    { text: 'Rail transport', action: 'faq', target: 'transport-modes', description: 'Rail transportation info' },
    { text: 'Pipeline transport', action: 'faq', target: 'transport-modes', description: 'Pipeline transportation info' },
    
    // AI Features
    { text: 'AI enhanced calculations', action: 'faq', target: 'ai-features', description: 'Learn about AI features' },
    { text: 'AI insights', action: 'faq', target: 'ai-features', description: 'Understanding AI recommendations' },
    { text: 'OpenAI integration', action: 'faq', target: 'ai-features', description: 'About our AI technology' },
    { text: 'AI recommendations', action: 'faq', target: 'ai-features', description: 'How AI improves calculations' },
    
    // Support & Help
    { text: 'Support', action: 'navigate', target: '/support', description: 'Contact customer support' },
    { text: 'Customer support', action: 'navigate', target: '/support', description: 'Get help from our team' },
    { text: 'Contact us', action: 'navigate', target: '/support', description: 'Contact support team' },
    { text: 'Help center', action: 'navigate', target: '/help', description: 'Browse help articles' },
    { text: 'FAQ', action: 'faq', target: 'getting-started', description: 'Frequently asked questions' },
    { text: 'Getting started', action: 'faq', target: 'getting-started', description: 'Basic usage guide' },
    
    // Login & Account - AI HUB REDIRECTS TO LOGIN
    { text: 'Login', action: 'navigate', target: '/login', description: 'Access your account' },
    { text: 'Hub login', action: 'navigate', target: '/login', description: 'Login to access AI Hub' },
    { text: 'AI hub', action: 'navigate', target: '/login', description: 'Login required to access AI Hub' },
    { text: 'AI Hub', action: 'navigate', target: '/login', description: 'Login required to access AI Hub' },
    { text: 'Account', action: 'navigate', target: '/login', description: 'Manage your account' },
    { text: 'Sign in', action: 'navigate', target: '/login', description: 'Sign into your account' },
    { text: 'Sign up', action: 'navigate', target: '/login', description: 'Create new account' },
    
    // Technical Issues
    { text: 'Backend offline', action: 'faq', target: 'troubleshooting', description: 'Fix connection issues' },
    { text: 'Connection issues', action: 'faq', target: 'troubleshooting', description: 'Troubleshoot connectivity' },
    { text: 'Location not recognized', action: 'faq', target: 'troubleshooting', description: 'Fix location validation' },
    { text: 'Troubleshooting', action: 'faq', target: 'troubleshooting', description: 'Solve common problems' },
    { text: 'Technical support', action: 'navigate', target: '/support', description: 'Get technical help' },
    
    // Calculations & Accuracy
    { text: 'Cost accuracy', action: 'faq', target: 'calculations', description: 'How accurate are calculations' },
    { text: 'Calculation factors', action: 'faq', target: 'calculations', description: 'What affects transport costs' },
    { text: 'Cost breakdown', action: 'faq', target: 'calculations', description: 'Understanding cost components' },
    { text: 'Distance estimation', action: 'faq', target: 'calculations', description: 'How distance is calculated' },
    { text: 'Volume conversion', action: 'faq', target: 'getting-started', description: 'Converting volume units' },
    
    // Company & About
    { text: 'About THAMPICO', action: 'external', target: 'https://www.thampico.com/about', description: 'Learn about our organization' },
    { text: 'THAMPICO program', action: 'external', target: 'https://www.thampico.com', description: 'About THAMPICO' },
    { text: 'About us', action: 'external', target: 'https://www.thampico.com/about', description: 'Company information' },
    
    // Features
    { text: 'Intermediate hub', action: 'faq', target: 'transport-modes', description: 'Using intermediate hubs' },
    { text: 'Route optimization', action: 'faq', target: 'ai-features', description: 'Optimize your routes' },
    { text: 'Safety requirements', action: 'faq', target: 'calculations', description: 'Fuel safety considerations' },
    { text: 'Insurance costs', action: 'faq', target: 'calculations', description: 'Transportation insurance' },
    
    // API & Technical
    { text: 'API documentation', action: 'section', target: 'api-docs', description: 'Technical API documentation' },
    { text: 'API integration', action: 'navigate', target: '/support', description: 'Get help with API integration' }
  ];

  const faqData = [
    {
      category: 'getting-started',
      question: 'How do I calculate fuel transportation costs?',
      answer: 'Simply enter your fuel type (hydrogen, methanol, or ammonia), volume, origin, destination, and transport mode in our calculator. Our AI will provide accurate cost estimates with detailed breakdowns.'
    },
    {
      category: 'getting-started',
      question: 'What fuel types are supported?',
      answer: 'We support three alternative fuels: Hydrogen (H₂), Methanol (CH₃OH), and Ammonia (NH₃). Each has specific handling requirements and cost multipliers.'
    },
    {
      category: 'calculations',
      question: 'How accurate are the cost calculations?',
      answer: 'Our AI-powered calculations achieve 85-95% accuracy by analyzing transport modes, distances, fuel-specific handling requirements, insurance, and regulatory compliance costs.'
    },
    {
      category: 'calculations',
      question: 'What factors influence transportation costs?',
      answer: 'Key factors include: fuel type and volume, transport distance, transport modes (truck, rail), fuel handling complexity, safety requirements, insurance, and regulatory compliance.'
    },
    {
      category: 'ai-features',
      question: 'What is AI Enhancement?',
      answer: 'Our OpenAI integration (GPT-4) processes your route data to provide intelligent cost adjustments, market analysis, and optimization recommendations for fuel transportation.'
    },
    {
      category: 'ai-features',
      question: 'How does the AI improve calculations?',
      answer: 'The AI analyzes fuel-specific requirements, route complexity, safety protocols, and market conditions to provide enhanced cost estimates and intelligent recommendations.'
    },
    {
      category: 'transport-modes',
      question: 'Which transport mode should I choose?',
      answer: 'Truck: Best for short distances (<500 miles). Rail: Cost-effective for medium distances. Pipeline: Most efficient for established routes.'
    },
    {
      category: 'transport-modes',
      question: 'Can I use multiple transport modes?',
      answer: 'Yes! Our multi-modal calculator supports complex routes with intermediate hubs. For example: truck to rail terminal then rail to destination, with truck delivery at the end.'
    },
    {
      category: 'troubleshooting',
      question: 'Why am I getting "Backend Offline" status?',
      answer: 'This indicates the AI backend server is not running. The calculator will use manual calculations instead. Contact support if this persists.'
    },
    {
      category: 'troubleshooting',
      question: 'What if my location is not recognized?',
      answer: 'Our AI validates locations in real-time. Try using full city names, major ports, or airports. Example: "Los Angeles, CA" or "Port of Long Beach, CA".'
    }
  ];

  const quickGuides = [
    {
      title: 'Getting Started Guide',
      description: 'Learn the basics of fuel cost calculation',
      icon: '🚀',
      steps: [
        'Select your fuel type (hydrogen, methanol, or ammonia)',
        'Enter volume and choose appropriate units',
        'Specify origin and destination locations',
        'Choose transport modes for your route',
        'Review AI-enhanced cost breakdown'
      ]
    },
    {
      title: 'Multi-Modal Transport',
      description: 'Calculate complex routes with multiple transport modes',
      icon: '🚛',
      steps: [
        'Enter origin, intermediate hub, and final destination',
        'Select first transport mode (origin to hub)',
        'Select second transport mode (hub to destination)',
        'Let AI optimize your multi-modal route',
        'Compare costs with direct transport'
      ]
    },
    {
      title: 'Understanding AI Insights',
      description: 'Make the most of our AI recommendations',
      icon: '🤖',
      steps: [
        'Check the "AI Enhanced" badge in results',
        'Review confidence scores (85%+ is excellent)',
        'Read AI-generated route recommendations',
        'Consider safety and efficiency suggestions',
        'Save successful routes for future reference'
      ]
    }
  ];

  // Handle search input changes and show suggestions
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.length > 0) {
      const filtered = searchSuggestionsData.filter(suggestion =>
        suggestion.text.toLowerCase().includes(value.toLowerCase()) ||
        suggestion.description.toLowerCase().includes(value.toLowerCase())
      );
      setSearchSuggestions(filtered.slice(0, 8)); // Show top 8 suggestions
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  };

  // Handle suggestion click with actions
  const handleSuggestionClick = (suggestion) => {
    console.log('Suggestion clicked:', suggestion);
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    setSearchSuggestions([]);
    
    // Execute the action based on suggestion type
    setTimeout(() => {
      switch (suggestion.action) {
        case 'navigate':
          if (suggestion.target.startsWith('/#')) {
            // Navigate to home page with anchor
            navigate('/');
            setTimeout(() => {
              const element = document.querySelector(suggestion.target.substring(1));
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          } else {
            // Navigate to different page
            navigate(suggestion.target);
          }
          break;
          
        case 'faq':
          // Switch to FAQ section and category
          setActiveSection(suggestion.target);
          setTimeout(() => {
            const faqSection = document.querySelector('.faq-section');
            if (faqSection) {
              faqSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
          break;
          
        case 'external':
          // Open external link
          window.open(suggestion.target, '_blank');
          break;
          
        case 'section':
          // Scroll to specific section on current page
          setTimeout(() => {
            const element = document.querySelector('.resources-section');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
          break;
          
        default:
          // Default: just filter FAQs
          break;
      }
      
      // Focus back on input
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchQuery.length > 0 && searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur - Delayed to allow click to register
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle clicks outside of search to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = faqData.filter(
        faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFaqs(filtered);
    } else {
      setFilteredFaqs(faqData.filter(faq => faq.category === activeSection));
    }
  }, [searchQuery, activeSection]);

  const sections = [
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'calculations', name: 'Cost Calculations', icon: '🧮' },
    { id: 'ai-features', name: 'AI Features', icon: '🤖' },
    { id: 'transport-modes', name: 'Transport Modes', icon: '🚛' },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧' }
  ];

  return (
    <div className="help-container">
      {/* Header */}
      <div className="help-header">
        <div className="help-nav">
          <Link to="/" className="help-nav-link">🏠 Home</Link>
          <Link to="/support" className="help-nav-link">📞 Support</Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="help-hero">
        <div className="help-hero-content">
          <h1>Help Center</h1>
          <p>Everything you need to know about FuelRoute Pro's AI-powered cost calculator</p>
          
          {/* Search Bar with Suggestions */}
          <div ref={searchContainerRef} className="help-search">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%', position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for help, features, or navigate to pages..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="help-search-input"
                autoComplete="off"
              />
              <button type="submit" className="help-search-btn">🔍</button>
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="search-suggestions">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="suggestion-text">{suggestion.text}</div>
                      <div className="suggestion-description">{suggestion.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="help-content">
        {/* Quick Guides */}
        <div className="quick-guides-section">
          <h2>Quick Start Guides</h2>
          <div className="quick-guides-grid">
            {quickGuides.map((guide, index) => (
              <div key={index} className="guide-card">
                <div className="guide-icon">{guide.icon}</div>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <div className="guide-steps">
                  {guide.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="guide-step">
                      <span className="step-number">{stepIndex + 1}</span>
                      <span className="step-text">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          
          {/* Category Navigation */}
          <div className="faq-categories">
            {sections.map(section => (
              <button
                key={section.id}
                className={`category-btn ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="category-icon">{section.icon}</span>
                {section.name}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="faq-items">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <h3 className="faq-question">{faq.question}</h3>
                <p className="faq-answer">{faq.answer}</p>
              </div>
            ))}
          </div>

          {searchQuery && filteredFaqs.length === 0 && (
            <div className="no-results">
              <h3>No results found</h3>
              <p>Try different keywords or browse our categories above.</p>
            </div>
          )}
        </div>

        {/* Additional Resources */}
        <div className="resources-section">
          <h2>Additional Resources</h2>
          <div className="resources-grid">
            <div className="resource-card">
              <div className="resource-icon">📚</div>
              <h3>API Documentation</h3>
              <p>Integrate FuelRoute Pro into your applications</p>
              <a href="#api" className="resource-link">View Docs →</a>
            </div>
            <div className="resource-card">
              <div className="resource-icon">🏢</div>
              <h3>About THAMPICO</h3>
              <p>Learn more about our organization and mission</p>
              <a href="https://www.thampico.com/about" target="_blank" rel="noopener noreferrer" className="resource-link">Visit Site →</a>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="help-contact-section">
          <div className="help-contact-card">
            <h3>Still need help?</h3>
            <p>Our support team is ready to assist you with any questions about FuelRoute Pro.</p>
            <div className="contact-options">
              <Link to="/support" className="contact-btn primary">
                📞 Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;