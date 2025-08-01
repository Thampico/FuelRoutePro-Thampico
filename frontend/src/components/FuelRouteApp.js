//frontend/src/components/FuelRouteApp.js - ERROR FIXES ONLY
import React, { useState, useEffect } from 'react';
import RouteMap from './RouteMap';
import CostComparisonChart from './CostComparisonChart';
import './RouteMap.css';

// API Service - inlined to avoid external imports
const API_BASE_URL = 'http://localhost:5001/api';

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

// Add these new API functions after your existing API functions
const getRouteVisualization = (routeOptions, routeData) => 
  makeRequest('/routing/visualization', {
    method: 'POST',
    body: JSON.stringify({ 
      routeOptions, 
      origin: routeData.origin, 
      destination: routeData.destination,
      fuelType: routeData.fuelType 
    }),
  });

const getLocationsData = () => makeRequest('/routing/locations');

const FuelRouteApp = ({ backendAPI, apiStatus }) => {
  // Form state
  const [formData, setFormData] = useState({
    fuelType: 'hydrogen',
    volume: '',
    volumeUnit: 'tonnes',
    origin: '',
    destination: '',
    intermediateHub: '',
    transportMode1: 'truck',
    transportMode2: 'truck',
    preference: 'cost',
  });

  // App state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [fuelTypes, setFuelTypes] = useState(['hydrogen', 'methanol', 'ammonia']);
  const [routeHistory, setRouteHistory] = useState([]);
  const [localApiStatus, setLocalApiStatus] = useState('checking');
  const [routeInsights, setRouteInsights] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState({});
  const [aiValidating, setAiValidating] = useState(false);
  const [mapData, setMapData] = useState({
    routeVisualizations: [],
    selectedRoute: null,
    showMap: false,
    locations: []
  });

  // AI-powered location suggestions (common locations for quick selection)
  // 1. UPDATE: Replace your existing commonLocations array (around line 40-80)
  const commonLocations = [
    // Gulf Coast Ports
    'Houston, TX',
    'New Orleans, LA',
    'Mobile, AL',
    'Tampa Bay, FL',
    
    // Southeast Atlantic Ports  
    'Savannah, GA',
    'Jacksonville, FL',
    'Miami, FL',
    
    // Northeast Corridor Ports
    'New York/NJ',
    'Philadelphia, PA',
    'Norfolk, VA',
    'Boston, MA',
    
    // West Coast Ports
    'Long Beach, CA',
    'Los Angeles, CA',
    'Seattle, WA',
    'Portland, OR',
    'San Francisco/Oakland, CA',
    
    // Inland Transportation Hubs
    'Chicago, IL',
    'St. Louis, MO',
    'Memphis, TN',
    'Duluth-Superior, MN/WI'
  ];

  const volumeUnits = [
    { value: 'tonnes', label: 'Tonnes (metric tons)', factor: 1 },
    { value: 'kg', label: 'Kilograms', factor: 0.001 },
    { value: 'liters', label: 'Liters', factor: 0.001 }, // Approximate for liquid fuels
    { value: 'gallons', label: 'Gallons (US)', factor: 0.00378 }
  ];

  const transportModes = [
    { value: 'truck', label: 'Truck', suitable: ['local', 'regional'] },
    { value: 'rail', label: 'Rail', suitable: ['regional', 'continental'] }
  ];

  // Check API health on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (backendAPI && backendAPI.isConnected) {
          setLocalApiStatus('connected');
          setFuelTypes(backendAPI.fuelTypes || ['hydrogen', 'methanol', 'ammonia']);
          setRouteHistory(backendAPI.routeHistory || []);
        } else {
          await checkApiHealth();
          setLocalApiStatus('connected');

          const fuelTypesResponse = await getFuelTypes();
          setFuelTypes(fuelTypesResponse.data || ['hydrogen', 'methanol', 'ammonia']);

          const historyResponse = await getRouteHistory();
          setRouteHistory(historyResponse.data || []);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLocalApiStatus('error');
        setError('Unable to connect to backend server. Make sure it\'s running on port 5001.');
        // Ensure fuel types are always available even if API fails
        setFuelTypes(['hydrogen', 'methanol', 'ammonia']);
      }
    };

    initializeApp();
  }, [backendAPI]);

  // Add this new useEffect after your existing useEffect hooks (around line 80)
useEffect(() => {
  const loadMapData = async () => {
    if (result && result.routeOptions && Array.isArray(result.routeOptions) && result.routeOptions.length > 0) {
      try {
        console.log('🗺️ Loading route visualization data...');
        
        const mapResponse = await getRouteVisualization(result.routeOptions, formData);
        
        if (mapResponse.success && mapResponse.visualizations) {
          setMapData(prev => ({
            ...prev,
            routeVisualizations: mapResponse.visualizations,
            showMap: true,
            selectedRoute: mapResponse.visualizations[0] || null
          }));
          console.log('✅ Map data loaded:', mapResponse.visualizations.length, 'routes');
        }
      } catch (error) {
        console.error('❌ Failed to load map data:', error);
        // Map is optional - don't show error to user
      }
    } else {
      setMapData(prev => ({ ...prev, showMap: false, routeVisualizations: [] }));
    }
  };

  loadMapData();
}, [result, formData.origin, formData.destination, formData.fuelType]);

// Add this function after your existing helper functions (around line 200)
const handleMapRouteSelect = (selectedRoute) => {
  console.log('🗺️ Map route selected:', selectedRoute.id);
  setMapData(prev => ({ ...prev, selectedRoute }));
  
  // Find matching route option and trigger detailed calculation
  const matchingRouteOption = result.routeOptions?.find(route => 
    route.id === selectedRoute.id || route.name === selectedRoute.name
  );
  
  if (matchingRouteOption) {
    calculateDetailedCost(matchingRouteOption);
  }
};
  // Track route history changes
  useEffect(() => {
    console.log('🔄 Route history state updated:', routeHistory.length, 'entries');
  }, [routeHistory]);

  // Route validation and insights
  useEffect(() => {
    if (formData.origin && formData.destination) {
      validateRoute();
    }
  }, [formData.origin, formData.destination, formData.intermediateHub, formData.volume, formData.volumeUnit, locationSuggestions]);

  // REPLACE with this simple validation:
const validateLocationBasic = (location, fieldName) => {
  const isValid = commonLocations.some(validLocation => 
    validLocation.toLowerCase().includes(location.toLowerCase()) ||
    location.toLowerCase().includes(validLocation.toLowerCase())
  );
  
  const suggestions = { ...locationSuggestions };
  
  if (isValid) {
    const matchedLocation = commonLocations.find(validLocation => 
      validLocation.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(validLocation.toLowerCase())
    );
    
    suggestions[fieldName] = {
      valid: true,
      corrected: matchedLocation || location
    };
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  } else {
    suggestions[fieldName] = {
      valid: false,
      error: 'Please select from the 20 major US ports/hubs'
    };
  }
  
  setLocationSuggestions(suggestions);
};
  
  // ✅ NEW: Generate location insights based on validation results
  const generateLocationInsights = (result, transportMode, fuelType) => {
    const insights = [];
    
    // Transport mode insights
    if (!result.transportMode?.suitable) {
      insights.push(`⚠️ ${transportMode} transport may not be available at this location`);
    } else if (result.transportMode.infrastructure === 'major_port') {
      insights.push('Major port facility');
    } else if (result.transportMode.infrastructure === 'major_rail_hub') {
      insights.push(`🚂 Major rail hub - excellent for rail transport`);
    }
    
    // Fuel-specific insights
    if (result.fuelRequirements) {
      const reqs = result.fuelRequirements.requirements;
      if (fuelType === 'hydrogen') {
        insights.push('❄️ Cryogenic facilities required for hydrogen');
      } else if (fuelType === 'ammonia') {
        insights.push(`🧊 Refrigerated storage required for ammonia`);
      }
    }
    
    // Warnings
    if (result.transportMode?.warnings?.length > 0) {
      insights.push(...result.transportMode.warnings.map(w => `⚠️ ${w}`));
    }
    
    return insights;
  };

  const setLocationBasicValidation = (location, fieldName) => {
    // Enhanced fallback validation for the 20 US port/hub locations
    const isValid = commonLocations.some(validLocation => 
      validLocation.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(validLocation.toLowerCase())
    );
    
    const suggestions = { ...locationSuggestions };
    
    if (isValid) {
      // Find the matching location from our list
      const matchedLocation = commonLocations.find(validLocation => 
        validLocation.toLowerCase().includes(location.toLowerCase()) ||
        location.toLowerCase().includes(validLocation.toLowerCase())
      );
      
      let region = 'Unknown';
      let type = 'port';
      let state = '';
      
      // Determine region based on location
      const locationLower = location.toLowerCase();
      if (locationLower.includes('houston') || locationLower.includes('new orleans') || 
          locationLower.includes('mobile') || locationLower.includes('tampa')) {
        region = 'Gulf Coast';
      } else if (locationLower.includes('savannah') || locationLower.includes('jacksonville') || 
                 locationLower.includes('miami')) {
        region = 'Southeast';
      } else if (locationLower.includes('new york') || locationLower.includes('philadelphia') || 
                 locationLower.includes('norfolk') || locationLower.includes('boston')) {
        region = 'Northeast';
      } else if (locationLower.includes('long beach') || locationLower.includes('los angeles') || 
                 locationLower.includes('seattle') || locationLower.includes('portland') || 
                 locationLower.includes('san francisco') || locationLower.includes('oakland')) {
        region = 'West Coast';
      } else if (locationLower.includes('chicago') || locationLower.includes('st. louis') || 
                 locationLower.includes('memphis') || locationLower.includes('duluth')) {
        region = 'Inland';
      }
      
      // Extract state
      if (locationLower.includes('tx')) state = 'TX';
      else if (locationLower.includes('la')) state = 'LA';
      else if (locationLower.includes('al')) state = 'AL';
      else if (locationLower.includes('fl')) state = 'FL';
      else if (locationLower.includes('ga')) state = 'GA';
      else if (locationLower.includes('ny')) state = 'NY';
      else if (locationLower.includes('nj')) state = 'NJ';
      else if (locationLower.includes('pa')) state = 'PA';
      else if (locationLower.includes('va')) state = 'VA';
      else if (locationLower.includes('ma')) state = 'MA';
      else if (locationLower.includes('ca')) state = 'CA';
      else if (locationLower.includes('wa')) state = 'WA';
      else if (locationLower.includes('or')) state = 'OR';
      else if (locationLower.includes('il')) state = 'IL';
      else if (locationLower.includes('mo')) state = 'MO';
      else if (locationLower.includes('tn')) state = 'TN';
      else if (locationLower.includes('mn')) state = 'MN';
      else if (locationLower.includes('wi')) state = 'WI';
      
      // Determine type
      if (locationLower.includes('chicago') || locationLower.includes('st. louis') || 
          locationLower.includes('memphis') || locationLower.includes('duluth')) {
        type = 'hub';
      }
      
      suggestions[fieldName] = {
        valid: true,
        corrected: matchedLocation || location,
        region: region,
        type: type,
        state: state
      };
      
      // Clear validation errors for this field when location is valid
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    } else {
      suggestions[fieldName] = {
        valid: false,
        error: 'Please select a location from the list of 20 major US ports/hubs'
      };
    }
    
    setLocationSuggestions(suggestions);
  };

  const validateRoute = () => {
    const errors = {};
    let insights = '';
    
    if (formData.origin && formData.destination) {
      // Check if origin and destination are the same
      if (formData.origin.toLowerCase() === formData.destination.toLowerCase()) {
        errors.destination = 'Destination cannot be the same as origin';
      }
      
      const originInfo = locationSuggestions.origin;
      const destInfo = locationSuggestions.destination;
      
      // AI-enhanced route type calculation
      let routeType = 'unknown';
      if (originInfo && destInfo && originInfo.valid && destInfo.valid) {
        if (originInfo.region === destInfo.region) {
          routeType = 'regional';
        } else if (originInfo.region !== destInfo.region) {
          routeType = 'long';
        }
        
        // Enhanced insights based on AI analysis
        const volume = parseFloat(formData.volume);
        const volumeUnit = formData.volumeUnit;
        
        if (volume > 0) {
          const volumeInTonnes = volume * (volumeUnits.find(u => u.value === volumeUnit)?.factor || 1);
          
          if (routeType === 'regional' && volumeInTonnes <= 5) {
            insights = `🚛 Short distance within ${originInfo.region}: Truck transport recommended for cost efficiency.`;
          } else if (volumeInTonnes > 10) {
            insights = `🚢 For 10+ tonnes: Rail transport recommended for cost efficiency and environmental benefits. Large volumes benefit from bulk transport modes with lower per-unit costs.`;
          } else if (routeType === 'long') {
            insights = `Long route (${originInfo.region} → ${destInfo.region}): Rail transport recommended via intermediate hub for optimal cost and safety.`;
          } else if (volumeInTonnes > 15) {
            insights = `🚆 Large volume transport: Consider rail for cost efficiency.`;
          }
          
          // Add fuel-specific insights
          if (formData.fuelType === 'hydrogen') {
            insights += ' Hydrogen requires specialized cryogenic handling protocols.';
          } else if (formData.fuelType === 'ammonia') {
            insights += ' Ammonia transport requires specialized safety and ventilation systems.';
          }
        }
      } else {
        // Fallback to basic validation for non-AI validated locations
        const volume = parseFloat(formData.volume);
        const volumeUnit = formData.volumeUnit;
        
        if (volume > 0) {
          const volumeInTonnes = volume * (volumeUnits.find(u => u.value === volumeUnit)?.factor || 1);
          
          if (volumeInTonnes <= 5) {
            insights = 'Small volume: Truck transport typically most cost-effective for shorter distances.';
          } else if (volumeInTonnes > 10) {
            insights = 'For 10+ tonnes: Rail transport recommended for cost efficiency and environmental benefits.';
          }
        }
      }
      
      // Validate transport modes with AI insights
      if (routeType === 'long' && formData.transportMode1 === 'truck' && !formData.intermediateHub) {
        errors.transport = 'Long truck transport requires an intermediate hub or consider rail transport for cross-continental delivery';
      }
    }
    
    setValidationErrors(errors);
    setRouteInsights(insights);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific validation errors when user starts fixing them
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (['origin', 'destination', 'intermediateHub'].includes(name) && value.length > 2) {
      validateLocationBasic(value, name);
    }
  };

  // FIXED: Enhanced isShortRoute function with improved California detection
  // REPLACE the isShortRoute() function in FuelRouteApp.js with this enhanced version

  const isShortRoute = () => {
    if (!formData.origin || !formData.destination) return false;
  
    const origin = formData.origin.toLowerCase();
    const dest = formData.destination.toLowerCase();
  
    console.log('🔍 Route check:', { origin, dest });
  
  // **PRIORITY 1: California Routes (Same State - Most Common)**
    const californiaRoutes = [
      ['los angeles', 'long beach'],        // ~20 miles - VERY SHORT
      ['los angeles', 'san francisco'],     // ~380 miles
      ['los angeles', 'oakland'],           // ~380 miles  
      ['long beach', 'san francisco'],      // ~400 miles
      ['long beach', 'oakland'],            // ~400 miles
      ['san francisco', 'oakland'],         // ~15 miles - VERY SHORT
    ];
  
    const isCaliforniaRoute = californiaRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isCaliforniaRoute) {
      console.log('✅ California short route detected');
      return true;
    }
  
  // **PRIORITY 2: Northeast Corridor (Very Close)**
    const northeastRoutes = [
      ['new york', 'philadelphia'],        // ~95 miles
      ['new york', 'boston'],              // ~215 miles
      ['philadelphia', 'boston'],          // ~300 miles
    ];
  
    const isNortheastRoute = northeastRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isNortheastRoute) {
      console.log('✅ Northeast corridor short route detected');
      return true;
    }
  
  // **PRIORITY 3: Southeast Coast (Regional)**
    const southeastRoutes = [
      ['tampa', 'miami'],                   // ~280 miles
      ['jacksonville', 'miami'],           // ~350 miles
      ['savannah', 'jacksonville'],        // ~140 miles
      ['tampa', 'jacksonville'],           // ~200 miles
    ];
  
    const isSoutheastRoute = southeastRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isSoutheastRoute) {
      console.log('✅ Southeast regional short route detected');
      return true;
    }
  
  // **PRIORITY 4: Gulf Coast (Regional)**
    const gulfRoutes = [
      ['houston', 'new orleans'],          // ~350 miles
      ['new orleans', 'mobile'],           // ~150 miles
      ['houston', 'mobile'],               // ~350 miles
    ];
  
    const isGulfRoute = gulfRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isGulfRoute) {
      console.log('✅ Gulf coast short route detected');
      return true;
    }
  
  // **PRIORITY 5: Pacific Northwest (Regional)**
    const pacificNorthwestRoutes = [
      ['seattle', 'portland'],             // ~170 miles
    ];
  
    const isPacificNorthwestRoute = pacificNorthwestRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isPacificNorthwestRoute) {
      console.log('✅ Pacific Northwest short route detected');
      return true;
    }
  
  // **PRIORITY 6: Midwest/Great Lakes (Regional)**
    const midwestRoutes = [
      ['chicago', 'st. louis'],            // ~300 miles
      ['chicago', 'memphis'],              // ~530 miles
      ['memphis', 'st. louis'],            // ~300 miles
      ['chicago', 'duluth'],               // ~350 miles
      ['chicago', 'superior'],             // ~350 miles
    ];
  
    const isMidwestRoute = midwestRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isMidwestRoute) {
      console.log('✅ Midwest regional short route detected');
      return true;
    }
  
  // **PRIORITY 7: Mid-Atlantic (Regional)**
    const midAtlanticRoutes = [
      ['norfolk', 'philadelphia'],         // ~300 miles
      ['norfolk', 'new york'],             // ~350 miles
    ];
  
    const isMidAtlanticRoute = midAtlanticRoutes.some(([city1, city2]) => 
      (origin.includes(city1) && dest.includes(city2)) ||
      (origin.includes(city2) && dest.includes(city1))
    );
  
    if (isMidAtlanticRoute) {
      console.log('✅ Mid-Atlantic short route detected');
      return true;
    }
  
  // **FALLBACK: Check AI validation if available**
    const originInfo = locationSuggestions.origin;
    const destInfo = locationSuggestions.destination;
  
    if (originInfo && destInfo && originInfo.valid && destInfo.valid) {
      const isDomestic = originInfo.region === destInfo.region && 
                        originInfo.country === destInfo.country;
    
      console.log('🤖 AI route check:', { 
        originRegion: originInfo.region, 
        destRegion: destInfo.region,
        originCountry: originInfo.country,
        destCountry: destInfo.country,
        isDomestic 
      });
    
      return isDomestic;
    }
  
  // **FINAL FALLBACK: General US domestic detection**
    const usStates = ['ca', 'california', 'wa', 'washington', 'ny', 'new york', 'texas', 'tx', 
                    'florida', 'fl', 'illinois', 'il', 'oregon', 'or', 'massachusetts', 'ma',
                    'pennsylvania', 'pa', 'virginia', 'va', 'georgia', 'ga', 'louisiana', 'la',
                    'alabama', 'al', 'missouri', 'mo', 'tennessee', 'tn', 'minnesota', 'mn', 
                    'wisconsin', 'wi'];
  
    const usCities = ['los angeles', 'san francisco', 'oakland', 'seattle', 'houston', 'chicago',
                    'new york', 'miami', 'boston', 'philadelphia', 'long beach', 'portland',
                    'memphis', 'st. louis', 'norfolk', 'savannah', 'tampa', 'mobile', 'duluth'];
  
    const originUS = usStates.some(state => origin.includes(state)) || 
                    usCities.some(city => origin.includes(city)) ||
                    origin.includes('usa') || origin.includes('united states');
                   
    const destUS = usStates.some(state => dest.includes(state)) || 
                  usCities.some(city => dest.includes(city)) ||
                  dest.includes('usa') || dest.includes('united states');
  
    if (originUS && destUS) {
      console.log('✅ General Short route detected');
      return true;
    }
  
    console.log('❌ Long route detected');
    return false;
  };

  // FIXED: Function to determine if second transport mode should be shown
  const shouldShowSecondTransportMode = () => {
    const hasIntermediateHub = formData.intermediateHub && formData.intermediateHub.trim() !== '';
    const isShort = isShortRoute();
    
    console.log('🚦 Transport mode check:', { hasIntermediateHub, isShort });
    
    // Show second transport mode ONLY if:
    // 1. There's an actual intermediate hub provided, OR
    // 2. It's NOT a short route (meaning it's long route) AND no intermediate hub
    const shouldShow = hasIntermediateHub || (!isShort && !hasIntermediateHub);
    
    console.log('🚦 Should show second transport mode:', shouldShow);
    return shouldShow;
  };

  // Updated handleSubmit with proper validation
  const handleSubmit = async (mode = 'options') => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Validate required fields
      const errors = {};
      
      if (!formData.fuelType) errors.fuelType = 'Please select a fuel type';
      if (!formData.volume) errors.volume = 'Please enter volume';
      if (!formData.origin) errors.origin = 'Please enter origin';
      if (!formData.destination) errors.destination = 'Please enter destination';
      
      // Validate locations - check if they are in the common locations list
      if (formData.origin && !commonLocations.some(loc => 
        loc.toLowerCase() === formData.origin.toLowerCase() ||
        loc.toLowerCase().includes(formData.origin.toLowerCase()) ||
        formData.origin.toLowerCase().includes(loc.toLowerCase())
      )) {
        // Only set error if AI validation also failed
        if (locationSuggestions.origin && locationSuggestions.origin.valid === false) {
          errors.origin = 'Please enter a valid origin location';
        }
      }
      
      if (formData.destination && !commonLocations.some(loc => 
        loc.toLowerCase() === formData.destination.toLowerCase() ||
        loc.toLowerCase().includes(formData.destination.toLowerCase()) ||
        formData.destination.toLowerCase().includes(loc.toLowerCase())
      )) {
        // Only set error if AI validation also failed
        if (locationSuggestions.destination && locationSuggestions.destination.valid === false) {
          errors.destination = 'Please enter a valid destination location';
        }
      }
      
      // Only validate intermediate hub if it's actually provided
      if (formData.intermediateHub && formData.intermediateHub.trim() !== '') {
        if (!commonLocations.some(loc => 
          loc.toLowerCase() === formData.intermediateHub.toLowerCase() ||
          loc.toLowerCase().includes(formData.intermediateHub.toLowerCase()) ||
          formData.intermediateHub.toLowerCase().includes(loc.toLowerCase())
        )) {
          // Only set error if AI validation also failed
          if (locationSuggestions.intermediateHub && locationSuggestions.intermediateHub.valid === false) {
            errors.intermediateHub = 'Please enter a valid intermediate hub location';
          }
        }
      }
      
      // Add existing validation errors (only if they exist)
      Object.assign(errors, validationErrors);
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        throw new Error('Please fix the validation errors above');
      }

      // Convert volume to tonnes for API
      const volumeInTonnes = parseFloat(formData.volume) * (volumeUnits.find(u => u.value === formData.volumeUnit)?.factor || 1);

      // Prepare data for API
      const requestData = {
        ...formData,
        volume: volumeInTonnes, // Always send in tonnes to backend
        volumeUnit: 'tonnes', // Backend expects tonnes
        requestType: mode, // 'options' for multiple routes, 'single' for best recommendation
        preference: formData.preference
      };

      console.log(`Sending ${mode} request:`, requestData);

      if (backendAPI && backendAPI.isConnected && apiStatus === 'connected') {
        console.log(`🤖 Using backend AI calculation (${mode} mode)...`);
        const response = await backendAPI.calculateCost(requestData);
        
        console.log('Received response:', response);
        setResult(response);

        if (backendAPI.refreshHistory) {
          await backendAPI.refreshHistory();
        }
      } else {
        console.log(`🔧 Using direct API call (${mode} mode)...`);
        const response = await calculateRouteCost(requestData);
        
        console.log('Received response:', response);
        setResult(response);

        const historyResponse = await getRouteHistory();
        console.log('📊 Route history updated:', historyResponse.data?.length || 0, 'entries');
        setRouteHistory(historyResponse.data || []);
      }

    } catch (error) {
      setError(error.message);
      console.error('Calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: calculateDetailedCost function with proper debugging and variable declaration
  const calculateDetailedCost = async (selectedRouteOption) => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 FRONTEND DEBUG - Selected route option:');
      console.log('   - ID:', selectedRouteOption.id);
      console.log('   - Name:', selectedRouteOption.name);
      console.log('   - Transport modes:', selectedRouteOption.transportModes);
      console.log('   - Estimated cost:', selectedRouteOption.estimatedCost);
      console.log('🎯 Getting detailed cost for route:', selectedRouteOption.id);

      // Convert volume to tonnes for API
      const volumeInTonnes = parseFloat(formData.volume) * (volumeUnits.find(u => u.value === formData.volumeUnit)?.factor || 1);

      // Prepare data for detailed calculation
      const requestData = {
        ...formData,
        volume: volumeInTonnes,
        volumeUnit: 'tonnes',
        requestType: 'single', // This tells backend to return detailed calculation
        selectedRoute: selectedRouteOption,
        preference: formData.preference
      };

      console.log('Requesting detailed calculation:', requestData);

      // ✅ FIXED: Properly declare detailedResponse variable
      let detailedResponse;
      if (backendAPI && backendAPI.isConnected && apiStatus === 'connected') {
        console.log('🤖 Using backend API for detailed calculation...');
        detailedResponse = await backendAPI.calculateCost(requestData);
      } else {
        console.log('🔧 Using direct API call for detailed calculation...');
        detailedResponse = await calculateRouteCost(requestData);
      }

      console.log('Detailed calculation response:', detailedResponse);

      // Update result to show detailed calculation
      setResult(detailedResponse);

      // Refresh history
      if (backendAPI && backendAPI.refreshHistory) {
        await backendAPI.refreshHistory();
      } else {
        const historyResponse = await getRouteHistory();
        console.log('📊 Detailed calc - Route history updated:', historyResponse.data?.length || 0, 'entries');
        setRouteHistory(historyResponse.data || []);
      }

    } catch (error) {
      setError(`Failed to get detailed calculation: ${error.message}`);
      console.error('Detailed calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTrucks = (count) => {
    if (!count) return '';
    return count === 1 ? '1 truck' : `${count} trucks`;
  };

  const currentApiStatus = apiStatus || localApiStatus;

  // API Status indicator with AI enhancement
  const ApiStatusIndicator = () => (
    <div className={`flex items-center gap-2 mb-4 p-2 rounded ${
      currentApiStatus === 'connected' ? 'bg-green-100 text-green-800' :
      currentApiStatus === 'error' ? 'bg-red-100 text-red-800' :
      'bg-yellow-100 text-yellow-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        currentApiStatus === 'connected' ? 'bg-green-500' :
        currentApiStatus === 'error' ? 'bg-red-500' :
        'bg-yellow-500'
      }`}></div>
      <span className="text-sm font-medium">
        {currentApiStatus === 'connected' ? 'Backend Connected (AI Enhanced) - 20 US Ports/Hubs' :
        currentApiStatus === 'error' ? 'Backend Disconnected' :
        'Checking Connection...'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          FuelRoute Pro Cost Calculator
        </h1>
        
        <ApiStatusIndicator />

        <div className="space-y-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto relative overflow-hidden">
            {/* Floating Background Circles */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-8 w-12 h-12 bg-blue-100 rounded-full opacity-30 animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
              <div className="absolute top-16 right-12 w-8 h-8 bg-green-100 rounded-full opacity-40 animate-pulse" style={{animationDelay: '1s', animationDuration: '2s'}}></div>
              <div className="absolute bottom-20 left-16 w-6 h-6 bg-purple-100 rounded-full opacity-35 animate-bounce" style={{animationDelay: '2s', animationDuration: '4s'}}></div>
              <div className="absolute bottom-8 right-8 w-10 h-10 bg-indigo-100 rounded-full opacity-25 animate-pulse" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}></div>
              <div className="absolute top-32 left-4 w-4 h-4 bg-teal-100 rounded-full opacity-45 animate-bounce" style={{animationDelay: '1.5s', animationDuration: '2.5s'}}></div>
              <div className="absolute bottom-32 right-20 w-14 h-14 bg-cyan-100 rounded-full opacity-20 animate-pulse" style={{animationDelay: '3s', animationDuration: '4s'}}></div>
            </div>
            
          <h2 className="text-xl font-semibold mb-4 relative z-10">Calculate Transport Cost - US Ports & Hubs</h2>
            
            <div className="space-y-6 relative z-10">
              {/* Fuel Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Type *
                </label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {console.log('🔍 Fuel Types:', fuelTypes)}
                  {fuelTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
                {validationErrors.fuelType && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.fuelType}</p>
                )}
              </div>

              {/* Volume and Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volume *
                  </label>
                  <input
                    type="number"
                    name="volume"
                    value={formData.volume}
                    onChange={handleInputChange}
                    min="0.1"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter volume"
                    required
                  />
                  {validationErrors.volume && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.volume}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="volumeUnit"
                    value={formData.volumeUnit}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {volumeUnits.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ✅ NEW: Real-time Truck Requirements Display */}
              {formData.volume && parseFloat(formData.volume) > 0 && formData.fuelType && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600">🚛</span>
                    <h4 className="font-medium text-blue-800">Quick Truck Requirements</h4>
                  </div>
                  {(() => {
                    const volumeInTonnes = parseFloat(formData.volume) * (volumeUnits.find(u => u.value === formData.volumeUnit)?.factor || 1);
                    const truckCapacities = {
                      hydrogen: 8,
                      methanol: 12,
                      ammonia: 10,
                      gasoline: 12,
                      diesel: 12,
                      ethanol: 12
                    };
                    const maxCapacity = truckCapacities[formData.fuelType] || 10;
                    const trucksNeeded = Math.max(1, Math.ceil(volumeInTonnes / maxCapacity));
                    const utilizationPercent = Math.round((volumeInTonnes / (trucksNeeded * maxCapacity)) * 100);
                    
                    return (
                      <div className="text-sm text-blue-700">
                        <div className="font-medium">
                          {trucksNeeded} truck{trucksNeeded > 1 ? 's' : ''} required for {volumeInTonnes.toFixed(1)} tonnes of {formData.fuelType}
                        </div>
                        <div className="text-xs mt-1">
                          {maxCapacity} tonnes capacity per truck • {utilizationPercent}% utilization
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Origin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origin * {aiValidating && <span className="text-blue-500">🤖 AI Validating...</span>}
                </label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter origin"
                  required
                  list="origin-suggestions"
                />
                <datalist id="origin-suggestions">
                  {commonLocations.map((location, index) => (
                    <option key={index} value={location} />
                  ))}
                </datalist>
                {locationSuggestions.origin && locationSuggestions.origin.valid && (
                  <div className="mt-1 text-sm text-green-600">
                    ✅ {locationSuggestions.origin.corrected} 
                    {locationSuggestions.origin.country && ` (${locationSuggestions.origin.country})`}
                    <br />
                    <span className="text-xs">
                      📍 {locationSuggestions.origin.region} • {locationSuggestions.origin.type}
                    </span>
                  </div>
                )}
                {locationSuggestions.origin && !locationSuggestions.origin.valid && (
                  <div className="mt-1 text-sm text-red-600">
                    ❌ {locationSuggestions.origin.error}
                  </div>
                )}
                {validationErrors.origin && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.origin}</p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination * {aiValidating && <span className="text-blue-500">🤖 AI Validating...</span>}
                </label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter destination"
                  required
                  list="destination-suggestions"
                />
                <datalist id="destination-suggestions">
                  {commonLocations.map((location, index) => (
                    <option key={index} value={location} />
                  ))}
                </datalist>
                {locationSuggestions.destination && locationSuggestions.destination.valid && (
                  <div className="mt-1 text-sm text-green-600">
                    ✅ {locationSuggestions.destination.corrected}
                    {locationSuggestions.destination.country && ` (${locationSuggestions.destination.country})`}
                    <br />
                    <span className="text-xs">
                      📍 {locationSuggestions.destination.region} • {locationSuggestions.destination.type}
                    </span>
                  </div>
                )}
                {locationSuggestions.destination && !locationSuggestions.destination.valid && (
                  <div className="mt-1 text-sm text-red-600">
                    ❌ {locationSuggestions.destination.error}
                  </div>
                )}
                {validationErrors.destination && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.destination}</p>
                )}
              </div>

              {/* Intermediate Hub */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intermediate Hub (Optional) {aiValidating && <span className="text-blue-500">🤖 AI Validating...</span>}
                </label>
                <input
                  type="text"
                  name="intermediateHub"
                  value={formData.intermediateHub}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter intermediate hub (optional)"
                  list="hub-suggestions"
                />
                <datalist id="hub-suggestions">
                  {commonLocations.map((location, index) => (
                    <option key={index} value={location} />
                  ))}
                </datalist>
                {locationSuggestions.intermediateHub && locationSuggestions.intermediateHub.valid && (
                  <div className="mt-1 text-sm text-green-600">
                    ✅ {locationSuggestions.intermediateHub.corrected}
                    {locationSuggestions.intermediateHub.country && ` (${locationSuggestions.intermediateHub.country})`}
                    <br />
                    <span className="text-xs">
                      📍 {locationSuggestions.intermediateHub.region} • {locationSuggestions.intermediateHub.type}
                    </span>
                  </div>
                )}
                {locationSuggestions.intermediateHub && !locationSuggestions.intermediateHub.valid && (
                  <div className="mt-1 text-sm text-red-600">
                    ❌ {locationSuggestions.intermediateHub.error}
                  </div>
                )}
                {validationErrors.intermediateHub && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.intermediateHub}</p>
                )}
              </div>

              {/* Transport Mode 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Mode {(formData.intermediateHub && formData.intermediateHub.trim() !== '') ? '(First Leg)' : ''}
                </label>
                <select
                  name="transportMode1"
                  value={formData.transportMode1}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {transportModes.map(mode => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
              </div>

              {/* FIXED: Transport Mode 2 - Only show when actually needed */}
              {shouldShowSecondTransportMode() ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Mode (Second Leg) 
                    {(formData.intermediateHub && formData.intermediateHub.trim() !== '') ? 
                      ' (To Final Destination)' : 
                      ' (Long Route)'}
                  </label>
                  <select
                    name="transportMode2"
                    value={formData.transportMode2}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {transportModes.map(mode => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                  
                  {/* Show helpful text for long routes without intermediate hub */}
                  {!isShortRoute() && (!formData.intermediateHub || formData.intermediateHub.trim() === '') && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Long route: Rail transport recommended via intermediate hub for optimal cost and safety.
                    </p>
                  )}
                </div>
              ) : (
                /* FIXED: Show info for short routes */
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-green-400">✅</span>
                    </div>
                    <div className="ml-2">
                      <p className="text-green-700 text-sm">
                        <strong>Short Domestic Route Detected:</strong> Single transport mode sufficient. 
                        No intermediate hub or second transport mode required for this {locationSuggestions.origin?.region || 'domestic'} route.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Route Insights */}
              {routeInsights && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-blue-400">💡</span>
                    </div>
                    <div className="ml-2">
                      <p className="text-blue-700 text-sm">{routeInsights}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transport Error */}
              {validationErrors.transport && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm">{validationErrors.transport}</p>
                </div>
              )}

              {/* Calculator Mode Selection */}
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="space-y-2">
                </div>
              </div>

              {/* Optimization Preference */}
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optimization Preference
                </label>
                <select
                  name="preference"
                  value={formData.preference}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cost">Lowest Cost</option>
                  <option value="distance">Shortest Distance</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="space-y-4 mt-6">
                <button
                  onClick={() => handleSubmit('options')}
                  disabled={loading || currentApiStatus !== 'connected' || Object.keys(validationErrors).length > 0}
                  className="calculate-with-ai-btn"
                >
                  <span className="button-text">
                    {loading ? 'CALCULATING WITH AI ENHANCEMENT...' : 'CALCULATE WITH AI ENHANCEMENT'}
                  </span>
                  {currentApiStatus === 'connected' && !loading && (
                    <span className="button-subtitle">
                      Multiple Route Options
                    </span>
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <React.Fragment>
              {/* Route Options with FIXED AI Enhancement Indicators */}
              {result && result.routeOptions && Array.isArray(result.routeOptions) && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-700">
                    Route Options ({result.routeOptions.length} found)
                    {result.aiEnhanced && (
                      <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        🤖 AI Enhanced
                      </span>
                    )}
                    {result.aiRecommendation && (
                      <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✨ AI Optimized
                      </span>
                    )}
                  </h3>
                  
                  {/* ✅ FIXED: AI Processing Info with accurate status */}
                  {result.processingInfo && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600">🤖</span>
                        <h4 className="font-medium text-blue-800">AI Enhancement Status</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                        <div>
                          <span className="font-medium">Dynamic Pricing:</span> 
                          <span className="ml-1">
                            {result.routeOptions.some(r => r.aiEnhanced) ? '✅ Active' : '⚠️ Fallback'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Distance Calculation:</span> 
                          <span className="ml-1">✅ AI-Enhanced</span>
                        </div>
                        <div>
                          <span className="font-medium">Market Factors:</span> 
                          <span className="ml-1">
                            {result.routeOptions.some(r => r.aiFactors && !r.aiFactors.error) ? 'Real-time' : 'Static'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">AI-Enhanced Options:</span> 
                          <span className="ml-1">
                            {result.routeOptions.filter(r => r.aiEnhanced).length}/{result.routeOptions.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
        
                  {/* Search Summary */}
                  {result.searchQuery && (
                    <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                      <strong>Search:</strong> {result.searchQuery.from} → {result.searchQuery.to} | 
                      {result.searchQuery.volume} tonnes {result.searchQuery.fuelType}
                    </div>
                  )}

                  {/* Route Options Display - Updated for All-In Costs */}
                  <div className="space-y-4">
                    {result.routeOptions.map((option, index) => (
                      <div 
                        key={option.id || index} 
                        className={`border rounded-lg p-4 transition-all cursor-pointer ${
                          mapData.selectedRoute && mapData.selectedRoute.id === option.id
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : index === 0 || option.recommended ? 'border-green-500 bg-green-50' : 
                              option.aiEnhanced ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50 hover:border-blue-300'
                        }`}
                        onClick={() => {
                          // Add this click handler to route option cards
                          const mapRoute = mapData.routeVisualizations.find(r => 
                            r.id === option.id || r.name === option.name
                          );
                          if (mapRoute) {
                            handleMapRouteSelect(mapRoute);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900">{option.name || 'Unknown Route'}</h4>
                              {(index === 0 || option.recommended) && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  🎯 RECOMMENDED
                                </span>
                              )}
                              {option.aiEnhanced && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  🤖 AI ENHANCED
                                </span>
                              )}
                              
                              {/* ✅ NEW: All-In Cost Badge */}
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                💰 ALL-IN PRICE
                              </span>
                              {/* ✅ ADD: Map selection indicator */}
                              {mapData.selectedRoute && mapData.selectedRoute.id === option.id && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  🗺️ SELECTED ON MAP
                                </span>
                              )}
                            </div>
                          
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>⏱️ Estimated Time: {option.estimatedTime || 'Unknown'}</div>
                              <div>📍 Distance: {option.distance || 'Unknown'} miles</div>
                              <div>⚠️ Risk Level: <span className={`capitalize ${
                                option.riskLevel === 'low' ? 'text-green-600' : 
                                option.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                              }`}>{option.riskLevel || 'Unknown'}</span></div>
                              
                              {/* ✅ NEW: Cost Breakdown Preview */}
                              {option.costBreakdown && (
                                <div className="bg-gray-50 rounded p-2 mt-2">
                                  <div className="text-xs font-medium text-gray-700 mb-1">💰 Cost Breakdown:</div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div className="flex justify-between">
                                      <span>🚛 Transport & Logistics:</span>
                                      <span className="font-medium">{formatCurrency(option.costBreakdown.transportCost || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>⛽ Fuel Purchase ({formData.volume} tonnes):</span>
                                      <span className="font-medium">{formatCurrency(option.costBreakdown.commodityCost || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 font-semibold">
                                      <span>💰 Total Project Cost:</span>
                                      <span className="text-green-600">{formatCurrency(option.costBreakdown.totalCost || option.estimatedCost)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {option.description && (
                                <div className="italic mt-2">💡 {option.description}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            {/* ✅ UPDATED: Emphasize All-In Cost */}
                            <div className="text-xs text-gray-500 mb-1">TOTAL PROJECT COST</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(option.estimatedCost || 0)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Transport + Fuel Included
                            </div>
                            {option.aiEnhanced && (
                              <div className="text-xs text-blue-600 mb-1">🤖 AI Pricing</div>
                            )}
                            <button 
                              onClick={() => calculateDetailedCost(option)}
                              className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                              Get Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result?.routeOptions && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <CostComparisonChart routes={result.routeOptions} />
                </div>
              )}

              {/* Detailed Calculation Results with CLEAR cost separation */}
              {result && result.calculation && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-700">
                    Detailed Cost Calculation
                    {result.aiEnhanced && (
                      <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        🤖 AI Enhanced
                      </span>
                    )}
                  </h3>
                  
                  {/* Selected Route Info */}
                  {result.selectedRoute && (
                    <div className="bg-blue-50 p-3 rounded mb-4">
                      <h4 className="font-medium text-blue-800">{result.selectedRoute.name}</h4>
                      <p className="text-blue-700 text-sm">{result.selectedRoute.description}</p>
                      { (result.selectedRoute.trucksNeeded || result.calculation?.trucksNeeded) && (
                        <p className="text-blue-700 text-sm">🚚 {formatTrucks(result.selectedRoute.trucksNeeded || result.calculation.trucksNeeded)}</p>
                      )}
                    </div>
                  )}

                  {result && result.calculation && result.selectedRoute && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-4 text-blue-700">
                        📍 Detailed Route Visualization
                      </h3>
                      <RouteMap 
                        routeOptions={[result.selectedRoute]}
                        selectedRoute={result.selectedRoute}
                        origin={formData.origin}
                        destination={formData.destination}
                        onRouteSelect={() => {}}
                        showAllRoutes={false}
                        height="500px"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {/* ✅ MAIN: Total Project Cost */}
                    <div className="text-3xl font-bold text-green-600 text-center p-4 bg-green-50 rounded">
                      Total Project Cost: {formatCurrency(result.calculation.totalCost)}
                    </div>
                    
                    {/* ✅ CLEAR: Cost Summary - Transport vs Commodity */}
                    {result.calculation.costSummary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                          <h4 className="font-medium text-blue-800 mb-1">🚛 Pure Transport</h4>
                          <div className="text-xl font-bold text-blue-600">
                            {formatCurrency(result.calculation.costSummary.pureTransportCosts)}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Logistics & Delivery
                          </div>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
                          <h4 className="font-medium text-orange-800 mb-1">⛽ Commodity</h4>
                          <div className="text-xl font-bold text-orange-600">
                            {formatCurrency(result.calculation.costSummary.commodityCosts)}
                          </div>
                          <div className="text-xs text-orange-600 mt-1">
                            Fuel Purchase
                          </div>
                        </div>
                        
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                          <h4 className="font-medium text-green-800 mb-1">💰 Total Project</h4>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(result.calculation.costSummary.totalProjectCosts)}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            Complete Solution
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* ✅ BREAKDOWN: Transport Costs Only */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      <h4 className="font-medium mb-3 text-blue-800">🚛 Transport & Logistics Breakdown:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Transport Cost:</span>
                          <span className="font-semibold">{formatCurrency(result.calculation.baseCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fuel Handling Fee:</span>
                          <span>{formatCurrency(result.calculation.costBreakdown.fuelHandlingFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Terminal Fees:</span>
                          <span>{formatCurrency(result.calculation.costBreakdown.terminalFees)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hub Transfer Fee:</span>
                          <span>{formatCurrency(result.calculation.costBreakdown.hubTransferFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insurance Cost:</span>
                          <span>{formatCurrency(result.calculation.costBreakdown.insuranceCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carbon Offset:</span>
                          <span>{formatCurrency(result.calculation.costBreakdown.carbonOffset)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold text-blue-800">
                          <span>Total Transport:</span>
                          <span>{formatCurrency(result.calculation.costSummary.pureTransportCosts)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ✅ BREAKDOWN: Commodity Costs */}
                    <div className="bg-orange-50 border border-orange-200 rounded p-4">
                      <h4 className="font-medium mb-3 text-orange-800">⛽ Commodity Purchase Breakdown:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Volume:</span>
                          <span>{formData.volume} tonnes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Market Price per Tonne:</span>
                          <span>${result.calculation.costBreakdown.commodityPricePerTonne}/tonne</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold text-orange-800">
                          <span>Total Commodity Cost:</span>
                          <span>{formatCurrency(result.calculation.costBreakdown.commodityCost)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ✅ SUMMARY: Cost per Unit Analysis */}
                    <div className="bg-gray-50 border border-gray-200 rounded p-4">
                      <h4 className="font-medium mb-3 text-gray-800">📊 Cost per Unit Analysis:</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Transport Cost per Tonne:</span><br />
                          <span className="text-lg font-bold text-blue-600">
                            ${(result.calculation.costSummary.pureTransportCosts / parseFloat(formData.volume)).toFixed(2)}/tonne
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Total Cost per Tonne:</span><br />
                          <span className="text-lg font-bold text-green-600">
                            ${(result.calculation.totalCost / parseFloat(formData.volume)).toFixed(2)}/tonne
                          </span>
                        </div>
                      </div>
                    </div>

                    

                    {/* Confidence & Metadata */}
                    <div className="flex justify-between items-center text-sm text-gray-600 pt-4 border-t">
                      <div>
                        <strong>Confidence Score:</strong> {result.calculation.confidence}%
                      </div>
                      <div>
                        Route ID: {result.routeId} | Calculated: {formatDate(result.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy Single Result Support (Fallback) */}
              {result && result.data && !result.routeOptions && !result.calculation && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-700">
                    Cost Calculation Results
                    {result.data.aiInsights?.aiUsed && (
                      <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        🤖 AI Enhanced
                      </span>
                    )}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-green-600">
                      Total Cost: {formatCurrency(result.data.totalCost)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Base Cost:</strong><br />
                        {formatCurrency(result.data.baseCost)}
                      </div>
                      <div>
                        <strong>Distance:</strong><br />
                        {result.data.distance} miles
                      </div>
                      {result.data.trucksNeeded && (
                        <div>
                          <strong>Trucks Needed:</strong><br />
                          {formatTrucks(result.data.trucksNeeded)}
                        </div>
                      )}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Cost Breakdown:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Fuel Handling Fee:</span>
                          <span>{formatCurrency(result.data.costBreakdown.fuelHandlingFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Terminal Fees:</span>
                          <span>{formatCurrency(result.data.costBreakdown.terminalFees)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hub Transfer Fee:</span>
                          <span>{formatCurrency(result.data.costBreakdown.hubTransferFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insurance Cost:</span>
                          <span>{formatCurrency(result.data.costBreakdown.insuranceCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carbon Offset:</span>
                          <span>{formatCurrency(result.data.costBreakdown.carbonOffset)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Route Legs */}
                    {result.data.legs && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Route Details:</h4>
                        <div className="space-y-1 text-sm">
                          <div>Leg 1: {result.data.legs.leg1.distance} miles via {result.data.legs.leg1.mode} - {formatCurrency(result.data.legs.leg1.cost)}</div>
                          <div>Leg 2: {result.data.legs.leg2.distance} miles via {result.data.legs.leg2.mode} - {formatCurrency(result.data.legs.leg2.cost)}</div>
                        </div>
                      </div>
                    )}

                    {/* AI Insights */}
                    {result.data.aiInsights?.recommendation && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <h4 className="font-medium mb-1 text-blue-800">🤖 AI Insights:</h4>
                        <p className="text-blue-700 text-sm">{result.data.aiInsights.recommendation}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-4">
                      Confidence: {result.data.confidence}% | Calculated: {formatDate(result.data.timestamp)}
                    </div>
                  </div>
                </div>
              )}

              {/* Route History */}
              {routeHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Calculations</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {routeHistory.slice(0, 5).map((route) => (
                      <div key={route._id} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="text-sm">
                            <div className="font-medium">
                              {route.origin} → {route.destination}
                            </div>
                            <div className="text-gray-600">
                              {route.volume} tonnes {route.fuelType}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-bold text-green-600">
                              {formatCurrency(route.calculatedCost)}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {formatDate(route.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelRouteApp;