import React, { useState, useEffect } from 'react';
import './FuelForm.css';

const FuelForm = ({ backendAPI, apiStatus }) => {
  const [formData, setFormData] = useState({
    fuelType: 'hydrogen',
    fuelState: 'liquid',
    volume: '',
    volumeUnit: 'tonnes',
    origin: '',
    intermediateHub: '',
    destination: '',
    transportMode1: 'truck',
    transportMode2: 'rail',
    preference: 'cost'
  });

  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Use backend fuel types if available
  const fuelOptions = {
    hydrogen: { name: 'Hydrogen (H₂)', states: ['gas', 'liquid'] },
    methanol: { name: 'Methanol (CH₃OH)', states: ['liquid'] },
    ammonia: { name: 'Ammonia (NH₃)', states: ['gas', 'liquid'] }
  };

  // Replace the existing locations array in FuelForm.js (around line 18)
  const locations = [
  // US Major Cargo Hubs
    'Houston, TX',
    'New Orleans, LA',
    'Mobile, AL',
    'Tampa Bay, FL', 
    'Savannah, GA',
    'Jacksonville, FL',
    'New York/NJ',
    'Philadelphia, PA',
    'Norfolk, VA',
    'Miami, FL',
    'Boston, MA',
    'Long Beach, CA',
    'Los Angeles, CA',
    'Seattle, WA',
    'Portland, OR',
    'San Francisco, CA',
    'Oakland, CA',
    'Chicago, IL',
    'St. Louis, MO',
    'Memphis, TN',
    'Duluth-Superior, MN/WI',
  
  // Legacy locations for backward compatibility
    'LAX (Los Angeles International Airport), CA',
    'Port of Long Beach, CA',
    'Port of Los Angeles, CA',
    'Taipei, Taiwan',
    'Taoyuan International Airport, Taiwan',
    'Kaohsiung Port, Taiwan',
      'Denver, CO'
  ];

  const transportModes = [
    { value: 'truck', label: 'Truck' },
    { value: 'rail', label: 'Rail' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser && !currentUser.isSubscribed && currentUser.searchCount >= 3) {
      alert('Free searches exhausted. Please subscribe to continue.');
      window.location.href = '/subscribe';
      return;
    }
    setIsCalculating(true);
    setShowResults(false);
    
    try {
      // Prepare data for backend
      const backendData = {
        fuelType: formData.fuelType,
        volume: parseFloat(formData.volume),
        origin: formData.origin,
        destination: formData.destination,
        intermediateHub: formData.intermediateHub || null,
        transportMode1: formData.transportMode1,
        transportMode2: formData.transportMode2,
        preference: formData.preference
      };

      if (backendAPI && backendAPI.isConnected && apiStatus === 'connected') {
        console.log('🤖 Using backend AI calculation...');
        const response = await backendAPI.calculateCost(backendData);
        
        // Map backend response to results format
        const calculationResults = {
          totalCost: response.data.totalCost,
          baseCost: response.data.baseCost,
          distance: response.data.distance,
          costBreakdown: response.data.costBreakdown,
          legs: response.data.legs,
          confidence: response.data.confidence,
          aiEnhanced: response.data.aiInsights?.aiUsed || false,
          recommendation: response.data.aiInsights?.recommendation || 'AI-enhanced calculation completed'
        };

        setResults(calculationResults);
        if (currentUser) {
          currentUser.searchCount = (currentUser.searchCount || 0) + 1;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          const allUsers = JSON.parse(localStorage.getItem('fuelrouteUsers') || '[]');
          const idx = allUsers.findIndex(u => u.id === currentUser.id);
          if (idx > -1) {
            allUsers[idx] = currentUser;
            localStorage.setItem('fuelrouteUsers', JSON.stringify(allUsers));
          }
        }
        
        if (backendAPI.refreshHistory) {
          await backendAPI.refreshHistory();
        }
      } else {
        // Fallback calculation
        console.log('🔧 Using local calculation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simple fallback calculation
        const volume = parseFloat(formData.volume);
        const baseCost = volume * 100;
        const totalCost = baseCost * 1.5;
        
        const calculationResults = {
          totalCost: totalCost,
          baseCost: baseCost,
          distance: 1000,
          costBreakdown: {
            fuelHandlingFee: baseCost * 0.1,
            terminalFees: 500,
            hubTransferFee: 200,
            insuranceCost: baseCost * 0.05,
            carbonOffset: baseCost * 0.02
          },
          confidence: 78,
          aiEnhanced: false,
          recommendation: 'Local calculation - connect backend for AI enhancement'
        };

        setResults(calculationResults);
        if (currentUser) {
          currentUser.searchCount = (currentUser.searchCount || 0) + 1;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          const allUsers = JSON.parse(localStorage.getItem('fuelrouteUsers') || '[]');
          const idx = allUsers.findIndex(u => u.id === currentUser.id);
          if (idx > -1) {
            allUsers[idx] = currentUser;
            localStorage.setItem('fuelrouteUsers', JSON.stringify(allUsers));
          }
        }
      }
      
      setShowResults(true);
      
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="calculator-section">
      <div className="calculator-container">
        <div className="calculator-header">
          <h2>AI-Powered Multi-Leg Fuel Transportation Calculator</h2>
          <p>Calculate complex routes with intermediate hubs and multiple transport modes</p>
          <div className="ai-badge">
            <span className="ai-indicator">🤖</span>
            Multi-Modal AI Analysis
            {apiStatus === 'connected' && <span className="enhanced-badge">✨ Enhanced</span>}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="calculator-form">
          
          {/* Fuel Type and State */}
          <div className="form-row">
            <div className="form-group">
              <label>Fuel Type</label>
              <select 
                name="fuelType" 
                value={formData.fuelType}
                onChange={handleChange} 
                required
              >
                {Object.entries(fuelOptions).map(([key, fuel]) => (
                  <option key={key} value={key}>{fuel.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fuel State</label>
              <select 
                name="fuelState" 
                value={formData.fuelState}
                onChange={handleChange} 
                required
              >
                {fuelOptions[formData.fuelType]?.states.map(state => (
                  <option key={state} value={state}>
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Volume and Unit */}
          <div className="form-row">
            <div className="form-group">
              <label>Volume</label>
              <input 
                type="number" 
                name="volume" 
                value={formData.volume}
                onChange={handleChange} 
                placeholder="Enter volume (e.g., 10)"
                required 
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select 
                name="volumeUnit" 
                value={formData.volumeUnit}
                onChange={handleChange}
              >
                <option value="tonnes">Tonnes</option>
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
              </select>
            </div>
          </div>

          {/* Route Planning */}
          <div className="form-row">
            <div className="form-group">
              <label>Origin (Point A)</label>
              <select 
                name="origin" 
                value={formData.origin}
                onChange={handleChange}
                required 
              >
                <option value="">Select origin</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Intermediate Hub (Point B)</label>
              <select 
                name="intermediateHub" 
                value={formData.intermediateHub}
                onChange={handleChange}
              >
                <option value="">Select intermediate hub</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Final Destination (Point C)</label>
              <select 
                name="destination" 
                value={formData.destination}
                onChange={handleChange}
                required 
              >
                <option value="">Select destination</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transport Modes */}
          <div className="form-row">
            <div className="form-group">
              <label>Transport Mode (A → B)</label>
              <select 
                name="transportMode1" 
                value={formData.transportMode1}
                onChange={handleChange} 
                required
              >
                {transportModes.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Transport Mode (B → C)</label>
              <select
                name="transportMode2"
                value={formData.transportMode2}
                onChange={handleChange}
                required
              >
                {transportModes.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Optimization Preference */}
          <div className="form-row">
            <div className="form-group">
              <label>Optimization Preference</label>
              <select
                name="preference"
                value={formData.preference}
                onChange={handleChange}
              >
                <option value="cost">Lowest Cost</option>
                <option value="distance">Shortest Distance</option>
              </select>
            </div>
          </div>

          <button type="submit" className="calculate-btn" disabled={isCalculating}>
            {isCalculating ? (
              <>
                <span className="loading-spinner"></span>
                {apiStatus === 'connected' ? 'AI Calculating Multi-Leg Route...' : 'Calculating Multi-Leg Route...'}
              </>
            ) : (
              <>
                Calculate Multi-Modal Route
                {apiStatus === 'connected' && <span className="ai-icon">🤖</span>}
              </>
            )}
          </button>
        </form>

        {/* Results Panel */}
        {showResults && (
          <div className="results-panel">
            <div className="results-header">
              <h3>
                Multi-Leg Route Analysis
                {results.aiEnhanced && (
                  <span className="ai-enhanced-badge">🤖 AI Enhanced</span>
                )}
              </h3>
              <div className="confidence-score">
                <span className="confidence-label">Confidence Score:</span>
                <span className={`confidence-value ${results.confidence > 85 ? 'high' : results.confidence > 70 ? 'medium' : 'low'}`}>
                  {results.confidence}%
                </span>
              </div>
            </div>
            
            <div className="cost-breakdown">
              <div className="total-cost">
                Total Cost: {formatCurrency(results.totalCost)}
              </div>
              
              <div className="cost-details">
                <div className="cost-item">
                  <span>Base Transport Cost:</span>
                  <span>{formatCurrency(results.baseCost)}</span>
                </div>
                <div className="cost-item">
                  <span>Fuel Handling Fee:</span>
                  <span>{formatCurrency(results.costBreakdown.fuelHandlingFee)}</span>
                </div>
                <div className="cost-item">
                  <span>Terminal Fees:</span>
                  <span>{formatCurrency(results.costBreakdown.terminalFees)}</span>
                </div>
                <div className="cost-item">
                  <span>Hub Transfer Fee:</span>
                  <span>{formatCurrency(results.costBreakdown.hubTransferFee)}</span>
                </div>
                <div className="cost-item">
                  <span>Insurance Cost:</span>
                  <span>{formatCurrency(results.costBreakdown.insuranceCost)}</span>
                </div>
                <div className="cost-item">
                  <span>Carbon Offset:</span>
                  <span>{formatCurrency(results.costBreakdown.carbonOffset)}</span>
                </div>
              </div>
            </div>

            <div className="ai-insights">
              <h4>🤖 AI Insights</h4>
              <p>{results.recommendation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelForm;