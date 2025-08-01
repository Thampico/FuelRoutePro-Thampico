// backend/controllers/routeController.js - UPDATED WITH ROUTING SERVICES
const path = require('path');

// Import Route model with error handling
let Route;
try {
  Route = require(path.join(__dirname, '..', 'models', 'Route'));
  console.log('✅ Route model loaded');
} catch (error) {
  console.log('⚠️ Route model not available:', error.message);
  Route = null;
}

// Import routing services
const routingService = require('../services/routingService');

// Initialize OpenAI service with better error handling
let openaiService = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openaiService = require('../services/openaiService');
    if (openaiService && openaiService.isAvailable) {
      console.log('✅ OpenAI service loaded for dynamic pricing');
    } else {
      console.log('⚠️ OpenAI service initialized but not available');
      openaiService = null;
    }
  } else {
    console.log('⚠️ OPENAI_API_KEY not found in environment variables');
  }
} catch (error) {
  console.log('⚠️ OpenAI service not available:', error.message);
  openaiService = null;
}

// ✅ HELPER: Validate and sanitize numbers
function validateNumber(value, fieldName = 'value', defaultValue = 0) {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    console.warn(`⚠️ Invalid ${fieldName}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  
  if (value < 0) {
    console.warn(`⚠️ Negative ${fieldName}: ${value}, using absolute value`);
    return Math.abs(value);
  }
  
  return value;
}

// ✅ HELPER: Get fuel multiplier
function getFuelMultiplier(fuelType) {
  const multipliers = {
    hydrogen: 1.4,
    ammonia: 1.3,
    methanol: 1.15,
    gasoline: 1.0,
    diesel: 1.05
  };
  
  return multipliers[fuelType] || 1.2;
}

// ✅ NEW: Calculate truck requirements with detailed information
function calculateTruckRequirements(volume, fuelType) {
  try {
    // Truck capacity based on fuel type (in tonnes)
    const truckCapacities = {
      hydrogen: 8,    // Compressed hydrogen trucks
      methanol: 12,   // Standard liquid fuel trucks
      ammonia: 10,    // Refrigerated trucks for ammonia
      gasoline: 12,   // Standard fuel trucks
      diesel: 12,     // Standard fuel trucks
      ethanol: 12     // Standard fuel trucks
    };
    
    const maxCapacity = truckCapacities[fuelType] || 10; // Default capacity
    const trucksNeeded = Math.max(1, Math.ceil(volume / maxCapacity));
    const utilizationPercent = Math.round((volume / (trucksNeeded * maxCapacity)) * 100);
    
    // Generate detailed message
    let message = `🚛 **${trucksNeeded} truck${trucksNeeded > 1 ? 's' : ''} required** for ${volume} tonnes of ${fuelType}`;
    
    if (trucksNeeded === 1) {
      message += ` (${utilizationPercent}% truck utilization)`;
    } else {
      message += ` (${maxCapacity} tonnes capacity per truck)`;
    }
    
    // Add fuel-specific handling requirements
    const handlingRequirements = {
      hydrogen: "⚠️ Requires specialized cryogenic transport (-253°C)",
      methanol: "⚠️ Requires hazmat certified drivers and equipment",
      ammonia: "⚠️ Requires refrigerated transport and toxic gas protocols",
      gasoline: "Standard fuel transport protocols",
      diesel: "Standard fuel transport protocols",
      ethanol: "Standard fuel transport with ethanol compatibility"
    };
    
    const handlingNote = handlingRequirements[fuelType] || "Standard transport protocols";
    
    return {
      trucksNeeded,
      maxCapacity,
      totalCapacity: trucksNeeded * maxCapacity,
      utilizationPercent,
      excessCapacity: (trucksNeeded * maxCapacity) - volume,
      message,
      handlingNote,
      fuelType,
      volume
    };
    
  } catch (error) {
    console.error('❌ Truck requirements calculation error:', error);
    return {
      trucksNeeded: Math.max(1, Math.ceil(volume / 10)),
      maxCapacity: 10,
      message: `🚛 Approximately ${Math.max(1, Math.ceil(volume / 10))} trucks required`,
      handlingNote: "Standard transport protocols",
      error: error.message
    };
  }
}

// ✅ UPDATED: Enhanced cost calculation with proper validation and AI integration
async function calculateBasicCost(volume, distance, mode, fuelType) {
  try {
    console.log('🔍 PRICING DEBUG START:', {
      openaiAvailable: !!(openaiService && openaiService.isAvailable),
      fuelType,
      volume,
      distance,
      mode,
      openaiKey: !!process.env.OPENAI_API_KEY
    });
    // ✅ Validate inputs first
    const validVolume = validateNumber(volume, 'volume', 1);
    const validDistance = validateNumber(distance, 'distance', 100);
    
    console.log(`🤖 Calculating cost for ${validVolume} tonnes, ${validDistance} miles via ${mode} for ${fuelType}`);
    console.log('🔍 PRICING DEBUG:', {
      openaiAvailable: !!(openaiService && openaiService.isAvailable),
      fuelType,
      volume: validVolume,
      distance: validDistance,
      mode
    });
    
    let fuelPrice = null;
    let transportFactors = null;
    let aiEnhanced = false;
    
    // Get OpenAI dynamic pricing and transport factors with proper error handling
    if (openaiService && openaiService.isAvailable) {
      try {
        console.log(`🤖 Attempting OpenAI pricing for ${fuelType}...`);
        
        // Get price with timeout
        const pricePromise = openaiService.getPriceEstimate(fuelType);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Price request timeout')), 15000)
        );
        
        const priceData = await Promise.race([pricePromise, timeoutPromise]);
        
        if (priceData && typeof priceData.price === 'number' && !isNaN(priceData.price)) {
          fuelPrice = priceData.price;
          aiEnhanced = true;
          console.log(`✅ OpenAI dynamic price for ${fuelType}: $${fuelPrice}/tonne`);
        } else {
          console.log(`⚠️ Invalid price data from OpenAI:`, priceData);
        }
        
        // Get transport factors with timeout
        console.log(`🤖 Attempting OpenAI transport factors for ${mode}...`);
        const transportPromise = openaiService.getTransportCostFactors(mode, fuelType, validDistance);
        const transportTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transport factors timeout')), 15000)
        );
        
        const transportData = await Promise.race([transportPromise, transportTimeoutPromise]);
        
        if (transportData && typeof transportData === 'object' && !transportData.error) {
          transportFactors = transportData;
          aiEnhanced = true;
          console.log(`✅ OpenAI transport factors for ${mode}:`, transportFactors);
        } else {
          console.log(`⚠️ Invalid transport data from OpenAI:`, transportData);
        }
        
      } catch (error) {
        console.log(`⚠️ OpenAI services failed: ${error.message}`);
        // For critical failures, we should still try to get some AI data
        // Only use fallback if OpenAI is completely unavailable
        if (error.message.includes('API key') || error.message.includes('authentication')) {
          console.log('❌ OpenAI authentication failed - using fallback');
        } else {
          console.log('🔄 OpenAI temporary failure - will retry on next request');
        }
      }
    } else {
      console.log('⚠️ OpenAI service not available, using static pricing');
    }

    // Route to specific calculation function and attach fuel price
    let result;
    if (mode === 'truck') {
      result = calculateTruckCost(validVolume, validDistance, fuelType, transportFactors, aiEnhanced);
    } else if (mode === 'rail') {
      result = calculateRailCost(validVolume, validDistance, fuelType, transportFactors, aiEnhanced);
    } else {
      // Fallback for unknown modes
      result = calculateGenericCost(validVolume, validDistance, mode, fuelType, aiEnhanced);
    }

    return { ...result, fuelPrice };
    
  } catch (error) {
    console.error('❌ Enhanced cost calculation error:', error);
    return {
      cost: calculateRealisticFallback(volume, distance, mode, fuelType),
      aiEnhanced: false,
      aiFactors: { error: error.message },
      fuelPrice
    };
  }
}

// ✅ NEW: Truck cost calculation
function calculateTruckCost(volume, distance, fuelType, transportFactors, aiEnhanced) {
  try {
    // Calculate number of trucks needed
    const maxTruckCapacity = fuelType === 'hydrogen' ? 8 : 12;
    const trucksNeeded = Math.max(1, Math.ceil(volume / maxTruckCapacity));
    
    console.log(`🚛 Trucks needed: ${trucksNeeded} (${volume} tonnes ÷ ${maxTruckCapacity} tonnes/truck)`);
    
    // Base rate per truck per mile
    let baseRatePerTruckMile = 2.75;
    let fuelSurcharge = 0.15;
    let specialHandlingMultiplier = 1.0;
    
    if (distance > 1000) {
      baseRatePerTruckMile *= 0.85; // Better efficiency for long hauls
    }

    // Apply AI factors if available
    if (transportFactors && typeof transportFactors === 'object' && !transportFactors.error) {
      if (validateNumber(transportFactors.base_rate_per_mile)) {
        baseRatePerTruckMile = Math.max(3.5, Math.min(6.0, transportFactors.base_rate_per_mile * 1.5));
      }
      if (validateNumber(transportFactors.fuel_surcharge)) {
        fuelSurcharge = transportFactors.fuel_surcharge;
      }
      if (validateNumber(transportFactors.special_handling_multiplier)) {
        specialHandlingMultiplier = transportFactors.special_handling_multiplier;
      }
    }
    
    // Distance-based adjustments
    if (distance > 1000) {
      baseRatePerTruckMile *= 0.9;
    } else if (distance < 100) {
      baseRatePerTruckMile *= 1.2;
    }
    
    baseRatePerTruckMile *= specialHandlingMultiplier;
    
    // Calculate costs
    const baseTransportCost = trucksNeeded * distance * baseRatePerTruckMile;
    const fuelSurchargeCost = baseTransportCost * fuelSurcharge;
    const loadingFee = trucksNeeded * 200;
    const hazmatFee = trucksNeeded * 150;
    
    const totalCost = baseTransportCost + fuelSurchargeCost + loadingFee + hazmatFee;
    
    console.log(`🚛 Truck cost breakdown:`, {
      trucksNeeded,
      baseRatePerTruck: `$${baseRatePerTruckMile.toFixed(2)}/truck/mile`,
      totalCost: `$${totalCost.toFixed(2)}`,
      aiEnhanced
    });
    
    return {
      cost: validateNumber(totalCost, 'truck cost', 1000),
      trucksNeeded,
      aiEnhanced,
      aiFactors: transportFactors || { note: 'Static truck pricing' }
    };
  } catch (error) {
    console.error('❌ Truck cost calculation error:', error);
    const fallbackCost = calculateRealisticFallback(volume, distance, 'truck', fuelType);
    return {
      cost: fallbackCost,
      trucksNeeded: Math.max(1, Math.ceil(volume / (fuelType === 'hydrogen' ? 8 : 12))),
      aiEnhanced: false,
      aiFactors: { error: error.message }
    };
  }
}

// ✅ NEW: Rail cost calculation - FIXED for NaN issues
function calculateRailCost(volume, distance, fuelType, transportFactors, aiEnhanced) {
  try {
    let rate = 0.15; // Base rate per tonne-mile
    let fuelMultiplier = getFuelMultiplier(fuelType);
    
    // Apply AI factors if available
    if (transportFactors && typeof transportFactors === 'object' && !transportFactors.error) {
      if (validateNumber(transportFactors.base_rate_per_mile)) {
        rate = Math.max(0.10, Math.min(0.25, transportFactors.base_rate_per_mile / 10)); // Convert to per-tonne-mile
      }
      if (validateNumber(transportFactors.fuel_surcharge)) {
        fuelMultiplier *= (1 + transportFactors.fuel_surcharge);
      }
      if (validateNumber(transportFactors.special_handling_multiplier)) {
        fuelMultiplier *= transportFactors.special_handling_multiplier;
      }
    }
    
    // Distance optimization for rail
    let distanceMultiplier = 1.0;
    if (distance > 1000) {
      distanceMultiplier = 0.85; // Efficiency at longer distances
    }
    
    const transportCost = distance * rate * volume * fuelMultiplier * distanceMultiplier;
    const terminalFees = volume * 50; // $50 per tonne terminal handling
    const totalCost = transportCost + terminalFees;
    
    console.log(`🚂 Rail cost breakdown:`, {
      rate: `$${rate}/tonne-mile`,
      fuelMultiplier: fuelMultiplier.toFixed(2),
      transportCost: `$${transportCost.toFixed(2)}`,
      terminalFees: `$${terminalFees.toFixed(2)}`,
      totalCost: `$${totalCost.toFixed(2)}`,
      aiEnhanced
    });
    
    return {
      cost: validateNumber(totalCost, 'rail cost', 500),
      aiEnhanced,
      aiFactors: transportFactors || { note: 'Static rail pricing' }
    };
  } catch (error) {
    console.error('❌ Rail cost calculation error:', error);
    const fallbackCost = calculateRealisticFallback(volume, distance, 'rail', fuelType);
    return {
      cost: fallbackCost,
      aiEnhanced: false,
      aiFactors: { error: error.message }
    };
  }
}

// ✅ NEW: Generic cost calculation for unknown modes
function calculateGenericCost(volume, distance, mode, fuelType, aiEnhanced) {
  try {
    const rate = 0.1; // Generic rate
    const fuelMultiplier = getFuelMultiplier(fuelType);
    const cost = distance * rate * volume * fuelMultiplier;
    
    console.log(`🔧 Generic cost calculation for ${mode}: $${cost.toFixed(2)}`);
    
    return {
      cost: validateNumber(cost, 'generic cost', 500),
      aiEnhanced: false,
      aiFactors: { note: `Generic calculation for ${mode}` }
    };
  } catch (error) {
    console.error('❌ Generic cost calculation error:', error);
    return {
      cost: calculateRealisticFallback(volume, distance, mode, fuelType),
      aiEnhanced: false,
      aiFactors: { error: error.message }
    };
  }
}

// ✅ UPDATED: US Major Port/Hub locations with accurate coordinates
const cityDatabase = {
  // Gulf Coast Ports
  'Houston, TX': [29.7050, -95.0030],
  'New Orleans, LA': [29.9355, -90.0572],
  'Mobile, AL': [30.6944, -88.0431],
  'Tampa Bay, FL': [27.9506, -82.4572],
  
  // Southeast Atlantic Ports
  'Savannah, GA': [32.0835, -81.0998],
  'Jacksonville, FL': [30.3322, -81.6557],
  'Miami, FL': [25.7617, -80.1918],
  
  // Northeast Corridor Ports
  'New York/NJ': [40.7128, -74.0060],
  'Philadelphia, PA': [39.9526, -75.1652],
  'Norfolk, VA': [36.8468, -76.2852],
  'Boston, MA': [42.3601, -71.0589],
  
  // West Coast Ports
  'Long Beach, CA': [33.7542, -118.2165],
  'Los Angeles, CA': [33.7292, -118.2620],
  'Seattle, WA': [47.6062, -122.3321],
  'Portland, OR': [45.5152, -122.6784],
  'San Francisco/Oakland, CA': [37.8044, -122.2712],
  
  // Inland Transportation Hubs
  'Chicago, IL': [41.8781, -87.6298],
  'St. Louis, MO': [38.6270, -90.1994],
  'Memphis, TN': [35.1495, -90.0490],
  'Duluth-Superior, MN/WI': [46.7867, -92.1005]
};

// ✅ Use realistic market rates
const transportRates = {
  truck: 0.25,    // $0.25 per tonne-mile
  rail: 0.15     // $0.15 per tonne-mile
};

// ✅ Enhanced commodity pricing with market data
const commodityPrices = {
  hydrogen: 2500,
  methanol: 450,
  ammonia: 550,
  gasoline: 700,
  diesel: 750,
  ethanol: 600
};


// ✅ FIXED: Distance calculation with proper validation and AI integration

// ✅ UPDATED: Multi-modal cost calculation with routing service

// ✅ FIXED: Enhanced deterministic distance calculation

// ✅ REALISTIC fallback calculation
function calculateRealisticFallback(volume, distance, mode, fuelType) {
  try {
    const validVolume = validateNumber(volume, 'volume', 1);
    const validDistance = validateNumber(distance, 'distance', 100);
    
    console.log(`🔧 Using REALISTIC fallback calculation for ${validVolume} tonnes, ${validDistance} miles via ${mode}`);
    
    if (mode === 'truck') {
      // Realistic truck calculation
      const maxTruckCapacity = fuelType === 'hydrogen' ? 8 : 12;
      const trucksNeeded = Math.ceil(validVolume / maxTruckCapacity);
      const costPerTruckMile = 4.50; // Realistic rate
      const baseCost = trucksNeeded * validDistance * costPerTruckMile;
      const fuelSurcharge = baseCost * 0.15; // 15% fuel surcharge
      const fees = trucksNeeded * 350; // Loading + hazmat fees
      
      const totalCost = baseCost + fuelSurcharge + fees;
      console.log(`   Truck fallback: ${trucksNeeded} trucks × ${validDistance} miles × $${costPerTruckMile} = $${totalCost.toFixed(2)}`);
      return Math.round(totalCost * 100) / 100;
      
    } else if (mode === 'rail') {
      // Realistic rail calculation
      const rate = 0.15; // $0.15 per tonne-mile
      const fuelMultiplier = fuelType === 'hydrogen' ? 1.4 : 1.2;
      const cost = validDistance * rate * validVolume * fuelMultiplier;
      console.log(`   Rail fallback: ${validDistance} miles × $${rate}/tonne-mile × ${validVolume} tonnes × ${fuelMultiplier} = $${cost.toFixed(2)}`);
      return Math.round(cost * 100) / 100;
      
    } else {
      // Generic fallback
      const cost = validDistance * 0.1 * validVolume * 1.2;
      console.log(`   Generic fallback for ${mode}: $${cost.toFixed(2)}`);
      return Math.round(cost * 100) / 100;
    }
    
  } catch (error) {
    console.error('❌ Fallback calculation error:', error);
    const emergencyCost = 5000; // $5000 emergency fallback
    console.log(`🚨 Emergency fallback: $${emergencyCost}`);
    return emergencyCost;
  }
}

// ✅ Get commodity cost with market fluctuation
function getCommodityCost(fuelType, volume, openaiPrice = null) {
  let basePrice = commodityPrices[fuelType] || commodityPrices.gasoline;
  
  // If OpenAI provided a price, use it directly
  if (openaiPrice && openaiPrice > 0) {
    basePrice = openaiPrice;
    console.log(`💰 Using OpenAI price: $${openaiPrice}/tonne`);
  }
  
  // Use the price directly without any artificial adjustment
  const currentPrice = basePrice;
  
  const totalCommodityCost = currentPrice * volume;
  
  console.log(`💰 REALISTIC Commodity cost: ${volume} tonnes × $${currentPrice.toFixed(2)}/tonne = $${totalCommodityCost.toFixed(2)}`);
  
  return {
    pricePerTonne: Math.round(currentPrice * 100) / 100,
    totalCost: Math.round(totalCommodityCost * 100) / 100,
    volume: volume
  };
}

// ✅ Realistic time calculation functions
function calculateRailTransitTime(distance) {
  const transitDays = Math.ceil(distance / (25 * 24)); // 25 mph average
  const terminalProcessing = 2; // Days for loading/unloading
  const totalDays = transitDays + terminalProcessing;
  
  console.log(`🚂 Rail time: ${distance} miles ÷ 600 miles/day = ${transitDays} days + ${terminalProcessing} processing = ${totalDays} days`);
  return Math.max(2, totalDays);
}


// ✅ UPDATED: Enhanced deterministic distance calculation with specific US route knowledge
function estimateDistanceFromNames(origin, destination) {
  const locations = [origin, destination].map(loc => loc.toLowerCase());
  
  // ✅ PRIORITY 1: California Routes (Same State - Most Common)
  if (locations.some(l => l.includes('los angeles')) && locations.some(l => l.includes('long beach'))) {
    return 25; // LA to Long Beach - Very short
  }
  if (locations.some(l => l.includes('los angeles') || l.includes('long beach')) && 
      locations.some(l => l.includes('san francisco') || l.includes('oakland'))) {
    return 380; // LA/Long Beach to SF/Oakland
  }
  if (locations.some(l => l.includes('san francisco')) && locations.some(l => l.includes('oakland'))) {
    return 15; // SF to Oakland - Very short
  }
  
  // ✅ PRIORITY 2: Northeast Corridor
  if (locations.some(l => l.includes('new york')) && locations.some(l => l.includes('philadelphia'))) {
    return 95; // NY to Philadelphia
  }
  if (locations.some(l => l.includes('new york')) && locations.some(l => l.includes('boston'))) {
    return 215; // NY to Boston
  }
  if (locations.some(l => l.includes('philadelphia')) && locations.some(l => l.includes('boston'))) {
    return 300; // Philadelphia to Boston
  }
  
  // ✅ PRIORITY 3: Southeast Routes
  if (locations.some(l => l.includes('tampa')) && locations.some(l => l.includes('miami'))) {
    return 280; // Tampa to Miami
  }
  if (locations.some(l => l.includes('jacksonville')) && locations.some(l => l.includes('miami'))) {
    return 350; // Jacksonville to Miami
  }
  if (locations.some(l => l.includes('savannah')) && locations.some(l => l.includes('jacksonville'))) {
    return 140; // Savannah to Jacksonville
  }
  
  // ✅ PRIORITY 4: Gulf Coast Routes
  if (locations.some(l => l.includes('houston')) && locations.some(l => l.includes('new orleans'))) {
    return 350; // Houston to New Orleans
  }
  if (locations.some(l => l.includes('new orleans')) && locations.some(l => l.includes('mobile'))) {
    return 150; // New Orleans to Mobile
  }
  if (locations.some(l => l.includes('houston')) && locations.some(l => l.includes('mobile'))) {
    return 350; // Houston to Mobile
  }
  
  // ✅ PRIORITY 5: Pacific Northwest
  if (locations.some(l => l.includes('seattle')) && locations.some(l => l.includes('portland'))) {
    return 170; // Seattle to Portland
  }
  
  // ✅ PRIORITY 6: Midwest/Great Lakes
  if (locations.some(l => l.includes('chicago')) && locations.some(l => l.includes('st. louis'))) {
    return 300; // Chicago to St. Louis
  }
  if (locations.some(l => l.includes('chicago')) && locations.some(l => l.includes('memphis'))) {
    return 530; // Chicago to Memphis
  }
  if (locations.some(l => l.includes('chicago')) && locations.some(l => l.includes('duluth'))) {
    return 350; // Chicago to Duluth-Superior
  }
  
  // ✅ PRIORITY 7: Cross-Country Routes
  if (locations.some(l => l.includes('los angeles') || l.includes('long beach')) && 
      locations.some(l => l.includes('new york') || l.includes('boston'))) {
    return 2600; // West Coast to East Coast
  }
  if (locations.some(l => l.includes('houston')) && 
      locations.some(l => l.includes('los angeles') || l.includes('long beach'))) {
    return 1550; // Houston to LA/Long Beach
  }
  if (locations.some(l => l.includes('seattle')) && 
      locations.some(l => l.includes('miami'))) {
    return 3100; // Seattle to Miami
  }
  
  // Default reasonable distance for unmatched routes
  return 1200;
}

// Enhanced distance calculation with OpenAI for unknown locations


// ✅ UPDATED: Generate route options with routing service
async function generateRouteOptions(routeData) {
  const { origin, destination, volume, fuelType, transportMode1, transportMode2 } = routeData;
  
  console.log('🚦 Generating enhanced route options with routing services...');
  
  try {
    // Use routing service to get comprehensive route options
    const preferredModes = [transportMode1, transportMode2].filter(mode => mode && mode.trim() !== '');
    
    const routeOptions = await routingService.getRouteOptions(
      origin, 
      destination, 
      fuelType, 
      preferredModes.length > 0 ? preferredModes : ['truck', 'rail']
    );
    
    console.log(`✅ Routing service found ${routeOptions.routes.length} route options`);
    
    // Convert routing service results to our format
    const formattedOptions = [];
    
    for (const route of routeOptions.routes) {
      try {
        // Calculate cost for this route
        const costResult = await calculateBasicCost(volume, route.distance_miles, route.mode, fuelType);
        const transportCost = typeof costResult === 'object' ? costResult.cost : costResult;
        const aiEnhanced = typeof costResult === 'object' ? costResult.aiEnhanced : false;
        
        // Get commodity cost using dynamic fuel price
        const commodityInfo = getCommodityCost(fuelType, volume, costResult.fuelPrice);
        const allInCost = transportCost + commodityInfo.totalCost;
        
        // Format route option
        const formattedRoute = {
          id: `${route.mode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'direct',
          name: `${route.mode.charAt(0).toUpperCase() + route.mode.slice(1)} Route`,
          transportModes: [route.mode],
          estimatedTime: `${Math.round(route.duration_hours)} hours`,
          estimatedCost: allInCost,
          distance: route.distance_miles,
          riskLevel: route.feasible > 0.8 ? 'low' : route.feasible > 0.6 ? 'medium' : 'high',
          description: `${route.routing_method} - Feasibility: ${Math.round(route.feasible * 100)}%`,
          
          // Enhanced route data
          routingMethod: route.routing_method,
          feasibilityScore: route.feasible,
          routeType: route.route_type,
          routePath: route.route_path,
          
          // Cost breakdown
          costBreakdown: {
            transportCost: transportCost,
            commodityCost: commodityInfo.totalCost,
            totalCost: allInCost
          },

          // Truck info
          trucksNeeded: costResult.trucksNeeded,
          
          // AI enhancement indicators
          aiEnhanced: aiEnhanced,
          aiFactors: typeof costResult === 'object' ? costResult.aiFactors : null,
          
          // Route-specific advantages
          advantages: generateRouteAdvantages(route),
          
          // Fallback indicator
          fallback: route.fallback || false,
          fallbackReason: route.fallback_reason
        };
        
        formattedOptions.push(formattedRoute);
        
      } catch (routeError) {
        console.error(`Failed to process route ${route.mode}:`, routeError.message);
      }
    }
    
    // Add multi-modal options if intermediate hub provided
    if (routeData.intermediateHub && routeData.intermediateHub.trim() !== '') {
      console.log('🔄 Adding multi-modal route option...');
      
      try {
        const multiModalCost = await calculateMultiModalCost(
          volume, 
          origin, 
          routeData.intermediateHub, 
          destination, 
          transportMode1, 
          transportMode2, 
          fuelType
        );
        
        const commodityInfo = getCommodityCost(fuelType, volume);
        const multiModalAllInCost = multiModalCost + commodityInfo.totalCost;
        
        const multiModalRoute = {
          id: `multimodal-${Date.now()}`,
          type: 'multimodal',
          name: `${transportMode1.charAt(0).toUpperCase() + transportMode1.slice(1)} + ${transportMode2.charAt(0).toUpperCase() + transportMode2.slice(1)} Route`,
          transportModes: [transportMode1, transportMode2],
          estimatedTime: 'Variable',
          estimatedCost: multiModalAllInCost,
          distance: 'Multi-leg',
          riskLevel: 'medium',
          description: `Multi-modal route via ${routeData.intermediateHub}`,
          
          costBreakdown: {
            transportCost: multiModalCost,
            commodityCost: commodityInfo.totalCost,
            totalCost: multiModalAllInCost
          },
          
          advantages: ['Flexible routing', 'Cost optimization', 'Mode specialization'],
          aiEnhanced: false,
          routingMethod: 'multi_modal_routing_service'
        };
        
        formattedOptions.push(multiModalRoute);
        
      } catch (multiModalError) {
        console.error('Failed to add multi-modal option:', multiModalError.message);
      }
    }
    
    // Sort options by user preference
    formattedOptions.sort((a, b) => {
      // Prioritize non-fallback routes
      if (a.fallback !== b.fallback) return a.fallback - b.fallback;

      if (routeData.preference === 'distance') {
        const distA = typeof a.distance === 'number' ? a.distance : Number.MAX_VALUE;
        const distB = typeof b.distance === 'number' ? b.distance : Number.MAX_VALUE;
        return distA - distB;
      }

      // Default to cost
      return a.estimatedCost - b.estimatedCost;
    });
    
    console.log(`✅ Generated ${formattedOptions.length} enhanced route options`);
    return formattedOptions;
    
  } catch (error) {
    console.error('❌ Routing service failed, using fallback generation:', error.message);
    
    // Fallback to old method
    return generateFallbackRouteOptions(routeData);
  }
}

// ✅ NEW: Generate route advantages based on routing data
function generateRouteAdvantages(route) {
  const advantages = [];
  
  // Mode-specific advantages
  if (route.mode === 'truck') {
    advantages.push('Fast delivery', 'Door-to-door service', 'Flexible scheduling');
  } else if (route.mode === 'rail') {
    advantages.push('Environmentally friendly', 'High capacity', 'Weather independent');
  }
  
  // Route-specific advantages
  if (route.feasible > 0.9) {
    advantages.push('High feasibility');
  }
  
  if (route.distance_miles < 500) {
    advantages.push('Short distance');
  }
  
  if (route.routing_method && route.routing_method.includes('google_maps')) {
    advantages.push('Optimized routing');
  }
  
  return advantages;
}

// ✅ FALLBACK: Generate route options using old method
async function generateFallbackRouteOptions(routeData) {
  console.log('🔧 Using fallback route option generation');
  
  const { origin, destination, volume, fuelType, transportMode1, transportMode2 } = routeData;
  const options = [];
  
  // Generate basic options for selected modes
  const selectedModes = [transportMode1, transportMode2].filter(mode => mode && mode.trim() !== '');
  
  for (const mode of selectedModes) {
    try {
      const distance = await calculateDistance(origin, destination, mode, fuelType);
      const costResult = await calculateBasicCost(volume, distance, mode, fuelType);
      const transportCost = typeof costResult === 'object' ? costResult.cost : costResult;
      
      const commodityInfo = getCommodityCost(fuelType, volume, costResult.fuelPrice);
      const allInCost = transportCost + commodityInfo.totalCost;
      
      options.push({
        id: `fallback-${mode}`,
        type: 'direct',
        name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Route (Estimated)`,
        transportModes: [mode],
        estimatedTime: `${Math.round(distance / getEstimatedSpeed(mode))} hours`,
        estimatedCost: allInCost,
        distance: distance,
        riskLevel: 'medium',
        description: 'Estimated route - routing service unavailable',
        fallback: true,
        costBreakdown: {
          transportCost: transportCost,
          commodityCost: commodityInfo.totalCost,
          totalCost: allInCost
        }
      });
      
    } catch (error) {
      console.error(`Failed to generate fallback option for ${mode}:`, error.message);
    }
  }
  
  return options;
}

// ✅ HELPER: Get estimated speed for fallback calculations
function getEstimatedSpeed(transportMode) {
  const speeds = {
    truck: 55,
    rail: 25,
  };
  return speeds[transportMode] || 30;
}

// ✅ Cache systems for performance
const distanceCache = new Map();
const routeMetadataCache = new Map();

// Clear caches periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  // Clear old distance cache entries
  for (const [key, value] of distanceCache.entries()) {
    const metadata = routeMetadataCache.get(key);
    if (metadata && (now - metadata.calculated_at.getTime()) > maxAge) {
      distanceCache.delete(key);
      routeMetadataCache.delete(key);
    }
  }
  
  console.log(`🧹 Cache cleanup: ${distanceCache.size} entries remaining`);
}, 60 * 60 * 1000); // Run every hour

// ✅ UPDATED: Check if route is domestic US (all locations are now US-only)
function isDomesticRoute(origin, destination) {
  // Since all locations are now US ports/hubs, all routes are domestic
  return true;
}

function getCachedDistance(origin, destination, transportMode, baseDistance) {
  const cacheKey = `${origin.toLowerCase()}-${destination.toLowerCase()}-${transportMode}`;
  
  if (distanceCache.has(cacheKey)) {
    console.log(`📋 Using cached distance for ${transportMode}: ${distanceCache.get(cacheKey)} miles`);
    return distanceCache.get(cacheKey);
  }
  
  // Use deterministic multipliers
  const modeMultipliers = {
    truck: 1.0,     // Direct route
    rail: 1.15     // Rail network routing (+15%)
  };
  
  const calculatedDistance = Math.round(baseDistance * (modeMultipliers[transportMode] || 1.0));
  
  // Cache the result
  distanceCache.set(cacheKey, calculatedDistance);
  console.log(`💾 Cached new distance for ${transportMode}: ${calculatedDistance} miles`);
  
  return calculatedDistance;
}


// FIXED: Properly await distance calculations
function calculateTruckTransitTime(distance, truckCount = 1) {
  // Ensure distance is a number
  const distanceNum = typeof distance === 'number' ? distance : parseInt(distance) || 1000;
  
  const maxDailyMiles = 11 * 55; // 605 miles per day max (DOT regulations)
  const baseDays = Math.ceil(distanceNum / maxDailyMiles);
  const coordinationDelay = truckCount > 1 ? Math.ceil(truckCount / 3) : 0;
  const totalDays = baseDays + coordinationDelay;
  
  console.log(`🚛 Truck time: ${distanceNum} miles ÷ ${maxDailyMiles} miles/day = ${baseDays} days + ${coordinationDelay} coordination = ${totalDays} days`);
  return Math.max(1, totalDays);
}

// Generate truck configuration options (FIXED to handle async distance)
async function generateTruckOptions(volume, baseDistance, fuelType) {
  const maxTruckCapacity = fuelType === 'hydrogen' ? 8 : 12;
  const options = [];
  
  const distance = typeof baseDistance === 'number' ? baseDistance : 
                   typeof baseDistance === 'string' ? parseInt(baseDistance) : 1000;
  
  
  // Single truck option
  if (volume <= maxTruckCapacity) {
    const utilizationPercent = Math.round((volume / maxTruckCapacity) * 100);
    const efficiency = utilizationPercent > 80 ? 'High Efficiency' : utilizationPercent > 60 ? 'Good Efficiency' : 'Standard Efficiency';
    
    const costResult = await calculateBasicCost(volume, distance, 'truck', fuelType);
    const transportCost = typeof costResult === 'object' ? costResult.cost : costResult;
    const aiEnhanced = typeof costResult === 'object' ? costResult.aiEnhanced : false;
    const aiFactors = typeof costResult === 'object' ? costResult.aiFactors : null;
    
    // ✅ CALCULATE ALL-IN COST (Transport + Commodity)
    const commodityInfo = getCommodityCost(fuelType, volume, costResult.fuelPrice);
    const allInCost = transportCost + commodityInfo.totalCost;
    
    options.push({
      id: 'truck-single',
      type: 'direct',
      name: 'Single Truck - Direct Route',
      transportModes: ['truck'],
      vehicles: [{
        type: 'truck',
        count: 1,
        capacity: volume,
        utilization: utilizationPercent
      }],
      trucksNeeded: costResult.trucksNeeded || 1,
      estimatedTime: calculateTruckTransitTime(distance, 1) + ' days',
      
      // ✅ MAIN CHANGE: Show all-in cost instead of just transport
      estimatedCost: allInCost,
      
      // ✅ ADD: Breakdown for transparency
      costBreakdown: {
        transportCost: transportCost,
        commodityCost: commodityInfo.totalCost,
        totalCost: allInCost
      },
      
      distance: distance,
      riskLevel: 'low',
      description: `${efficiency} (${utilizationPercent}% capacity) - All-in pricing${aiEnhanced ? ' - AI Enhanced' : ''}`,
      advantages: ['Fastest delivery', 'Direct handling', 'Lower coordination complexity', 'Includes fuel cost'],
      aiEnhanced: aiEnhanced,
      aiFactors: aiFactors
    });
  }
  
  // Multiple trucks option
  if (volume > maxTruckCapacity) {
    const trucksNeeded = Math.ceil(volume / maxTruckCapacity);
    const totalCapacity = maxTruckCapacity * trucksNeeded;
    const utilizationPercent = Math.round((volume / totalCapacity) * 100);
    
    let convoyDescription = '';
    let convoyPremium = 1.1;
    
    if (trucksNeeded <= 3) {
      convoyDescription = `Coordinated ${trucksNeeded}-truck convoy - manageable fleet size`;
      convoyPremium = 1.08;
    } else if (trucksNeeded <= 6) {
      convoyDescription = `Large ${trucksNeeded}-truck convoy - requires logistics coordination`;
      convoyPremium = 1.12;
    } else {
      convoyDescription = `Major ${trucksNeeded}-truck operation - consider rail alternative`;
      convoyPremium = 1.15;
    }
    
    const costResult = await calculateBasicCost(volume, distance, 'truck', fuelType);
    const baseTransportCost = typeof costResult === 'object' ? costResult.cost : costResult;
    const transportCostWithPremium = baseTransportCost * convoyPremium;
    const aiEnhanced = typeof costResult === 'object' ? costResult.aiEnhanced : false;
    const aiFactors = typeof costResult === 'object' ? costResult.aiFactors : null;
    
    // ✅ CALCULATE ALL-IN COST (Transport + Commodity)
    const commodityInfo = getCommodityCost(fuelType, volume, costResult.fuelPrice);
    const allInCost = transportCostWithPremium + commodityInfo.totalCost;
    
    options.push({
      id: 'truck-multiple',
      type: 'direct',
      name: `${trucksNeeded} Trucks - Convoy Route`,
      transportModes: ['truck'],
      vehicles: [{
        type: 'truck',
        count: trucksNeeded,
        capacity: volume,
        utilization: utilizationPercent
      }],
      trucksNeeded: trucksNeeded,
      estimatedTime: calculateTruckTransitTime(distance, trucksNeeded) + ' days',
      
      // ✅ MAIN CHANGE: Show all-in cost
      estimatedCost: allInCost,
      
      // ✅ ADD: Breakdown for transparency  
      costBreakdown: {
        transportCost: transportCostWithPremium,
        commodityCost: commodityInfo.totalCost,
        totalCost: allInCost
      },
      
      distance: distance,
      riskLevel: trucksNeeded <= 3 ? 'medium' : 'high',
      description: `${convoyDescription} - All-in pricing${aiEnhanced ? ' - AI Enhanced' : ''}`,
      advantages: trucksNeeded <= 3 ? 
        ['Handles large volume', 'Flexible scheduling', 'Redundancy', 'Includes fuel cost'] :
        ['Handles very large volume', 'Dedicated convoy management', 'Includes fuel cost'],
      considerations: trucksNeeded > 6 ?
        ['Consider rail transport for cost efficiency', 'Complex logistics coordination required'] :
        ['Requires convoy coordination', 'Weather-dependent scheduling'],
      aiEnhanced: aiEnhanced,
      aiFactors: aiFactors
    });
  }
  
  return options;
}

// ✅ UPDATED: Pure rail option with all-in pricing
async function generateRailOption(routeData, baseDistance) {
  const { volume, fuelType, origin, destination } = routeData;
  
  try {
    const railDistance = await calculateDistance(origin, destination, 'rail');
    
    const transportCost = await calculateBasicCost(volume, railDistance, 'rail', fuelType);
    const discountedTransportCost = transportCost.cost * 0.9;
    
    // ✅ ADD COMMODITY COST
    const commodityInfo = getCommodityCost(fuelType, volume, transportCost.fuelPrice);
    const allInCost = discountedTransportCost + commodityInfo.totalCost;
    
    return {
      id: 'rail-primary',
      type: 'rail-focused',
      name: 'Premium Rail Route',
      transportModes: ['rail'],
      estimatedTime: calculateRailTransitTime(railDistance) + ' days',
      
      // ✅ SHOW ALL-IN COST
      estimatedCost: allInCost,
      
      // ✅ ADD BREAKDOWN
      costBreakdown: {
        transportCost: discountedTransportCost,
        commodityCost: commodityInfo.totalCost,
        totalCost: allInCost
      },
      
      distance: Math.round(railDistance),
      riskLevel: 'low',
      description: 'Premium rail transport with all-in pricing including fuel',
      advantages: ['Environmentally friendly', 'High capacity', 'Weather independent', 'Includes fuel cost'],
      aiEnhanced: transportCost.aiEnhanced,
      aiFactors: transportCost.aiFactors
    };
    
  } catch (error) {
    console.error('Rail option generation failed:', error);
    // Fallback with commodity costs
    const commodityInfo = getCommodityCost(fuelType, volume);
    const fallbackTransportCost = calculateRealisticFallback(volume, baseDistance * 1.15, 'rail', fuelType);
    
    return {
      id: 'rail-primary',
      type: 'rail-focused',
      name: 'Premium Rail Route',
      transportModes: ['rail'],
      estimatedTime: calculateRailTransitTime(baseDistance * 1.15) + ' days',
      estimatedCost: fallbackTransportCost + commodityInfo.totalCost,
      distance: Math.round(baseDistance * 1.15),
      riskLevel: 'low',
      description: 'Rail transport with all-in pricing including fuel',
      aiEnhanced: false,
      aiFactors: null
    };
  }
}



// ✅ NEW: Truck cost calculation
async function calculateDistance(origin, destination, transportMode = 'truck', fuelType = 'methanol') {
  const cacheKey = `${origin}-${destination}-${transportMode}-${fuelType}`;
  
  // Check if we have cached distance
  if (distanceCache.has(cacheKey)) {
    const cachedDistance = distanceCache.get(cacheKey);
    console.log(`📋 Using cached distance: ${cachedDistance} miles`);
    return validateNumber(cachedDistance, 'cached distance', 1000);
  }
  
  try {
    console.log(`🗺️ Getting ${transportMode} route via routing service: ${origin} → ${destination}`);
    
    // Use routing service to get actual route
    const route = await routingService.getRoute(origin, destination, transportMode, fuelType);
    
    const distance = validateNumber(route.distance_miles, 'routing service distance', 1000);
    
    // Cache the result
    distanceCache.set(cacheKey, distance);
    console.log(`✅ ${transportMode} route calculated: ${distance} miles (${route.routing_method})`);
    
    // Store additional route metadata for later use
    routeMetadataCache.set(cacheKey, {
      distance: distance,
      duration: route.duration_hours,
      routeType: route.route_type,
      routingMethod: route.routing_method,
      routePath: route.route_path,
      fallback: route.fallback || false,
      calculated_at: new Date()
    });
    
    return distance;
    
  } catch (error) {
    console.error(`❌ Routing service failed for ${transportMode}:`, error.message);
    
    // Fallback to old estimation method
    console.log('🔧 Using fallback distance estimation');
    const fallbackDistance = estimateDistanceFromNames(origin, destination, transportMode);
    
    // Cache the fallback result
    distanceCache.set(cacheKey, fallbackDistance);
    console.log(`⚠️ Fallback distance: ${fallbackDistance} miles`);
    
    return fallbackDistance;
  }
}

// ✅ FIXED: Multi-modal cost calculation with validation
async function calculateMultiModalCost(volume, totalDistance, modes, fuelType) {
  let totalCost = 0;
  const validVolume = validateNumber(volume, 'volume', 1);
  const validDistance = validateNumber(totalDistance, 'total distance', 1000);
  const segmentDistance = validDistance / modes.length;
  
  console.log(`🔄 Calculating multi-modal cost for ${modes.join(' → ')}`);
  console.log(`   Total distance: ${validDistance} miles, segment distance: ${segmentDistance} miles each`);
  
  try {
    // Calculate cost for each mode segment
    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i];
      console.log(`   Calculating segment ${i + 1} for ${mode}: ${segmentDistance} miles`);
      
      try {
        const costResult = await calculateBasicCost(validVolume, segmentDistance, mode, fuelType);
        const segmentCost = validateNumber(
          typeof costResult === 'object' ? costResult.cost : costResult,
          `${mode} segment cost`,
          1000
        );
        
        totalCost += segmentCost;
        console.log(`   Valid cost for ${mode}: $${segmentCost.toFixed(2)}`);
        
      } catch (modeError) {
        console.log(`⚠️ Error calculating ${mode} cost:`, modeError.message);
        const fallbackCost = calculateRealisticFallback(validVolume, segmentDistance, mode, fuelType);
        totalCost += fallbackCost;
        console.log(`   Fallback cost for ${mode}: $${fallbackCost.toFixed(2)}`);
      }
    }
    
    // Add transfer fees
    const transferFees = (modes.length - 1) * 500; // $500 per transfer
    totalCost += transferFees;
    
    const finalCost = validateNumber(totalCost, 'multi-modal total cost', 2000);
    
    console.log(`🔄 Multi-modal cost completed: $${finalCost.toFixed(2)}`);
    return finalCost;
    
  } catch (error) {
    console.error('❌ Multi-modal cost calculation error:', error);
    const emergencyCost = validDistance * 2.0 * validVolume;
    console.log(`🚨 Using emergency cost calculation: $${emergencyCost.toFixed(2)}`);
    return validateNumber(emergencyCost, 'emergency cost', 5000);
  }
}


// FIXED: AI optimization with better JSON handling
async function getAIRouteRecommendation(routeOptions, routeData) {
  const { volume, fuelType, origin, destination } = routeData;
  
  try {
    console.log('🤖 Getting AI route recommendation...');
    
    const routeSummary = routeOptions.map(route => ({
      name: route.name || 'Unknown Route',
      cost: route.estimatedCost || 0,
      time: route.estimatedTime || 'Unknown',
      modes: Array.isArray(route.transportModes) ? route.transportModes.join(' + ') : 'Unknown',
      risk: route.riskLevel || 'medium'
    }));
    
    const preferenceText = routeData.preference === 'distance' ? 'shortest distance' : 'lowest cost';
    const prompt = `Analyze these fuel transportation route options for ${volume} tonnes of ${fuelType} from ${origin} to ${destination}. The user wants the ${preferenceText} option:

${JSON.stringify(routeSummary, null, 2)}

Consider:
- Cost efficiency and total budget impact
- Time sensitivity and delivery urgency  
- Risk factors and reliability
- Environmental impact
- Fuel-specific requirements for ${fuelType}

Provide recommendation in this exact JSON format (no extra text):
{
  "recommended_route": "route_name_here",
  "reason": "brief explanation",
  "cost_benefit": "cost analysis summary"
}`;

    const aiResponse = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { 
          role: 'system', 
          content: 'You are a logistics optimization expert. Provide data-driven route recommendations. Respond with valid JSON only. Keep all text simple without quotes or special characters.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
      temperature: 0.3
    });

    let recommendation;
    try {
      recommendation = JSON.parse(aiResponse.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ AI recommendation JSON parse error:', parseError.message);
      
      // Try to clean and parse again
      let cleanedContent = aiResponse.choices[0].message.content
        .replace(/[\n\r]/g, ' ')
        .replace(/"/g, '\\"')
        .replace(/\\"/g, '"')
        .trim();
      
      try {
        recommendation = JSON.parse(cleanedContent);
      } catch (secondError) {
        console.error('❌ Second AI recommendation parse failed');
        // Return default recommendation
        const fallbackRoute = routeOptions[0]?.name || "First Option";
        const prefReason = routeData.preference === 'distance' ? 'shortest distance' : 'lowest cost';
        recommendation = {
          recommended_route: fallbackRoute,
          reason: `AI analysis unavailable, selecting ${prefReason} option`,
          cost_benefit: routeData.preference === 'distance' ? 'Distance optimized selection' : 'Cost optimized selection'
        };
      }
    }
    
    console.log('✅ AI route recommendation generated:', recommendation);
    return recommendation;
    
  } catch (error) {
    console.error('❌ AI route recommendation failed:', error.message);
    const fallbackRoute = routeOptions[0]?.name || "First Option";
    const prefReason = routeData.preference === 'distance' ? 'shortest distance' : 'lowest cost';
    return {
      recommended_route: fallbackRoute,
      reason: `AI analysis unavailable, selecting ${prefReason} option`,
      cost_benefit: routeData.preference === 'distance' ? 'Distance optimized selection' : 'Default cost optimization'
    };
  }
}


// Main calculation function with AI-enhanced route options
const calculateCost = async (req, res) => {
  try {
    console.log('🚀 AI-Enhanced route calculation request received');
    console.log('📦 Request data:', req.body);
    
    // Add timeout to the entire request
    const requestTimeout = setTimeout(() => {
      console.log('⏰ Request timeout - sending error response');
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, 30000); // 30 second timeout for AI processing
    
    const { fuelType, volume, origin, destination, requestType = 'options' } = req.body;
    
    // Validate required fields
    if (!fuelType || !volume || !origin || !destination) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fuelType', 'volume', 'origin', 'destination']
      });
    }

    const routeData = {
      fuelType: fuelType.toLowerCase(),
      volume: parseFloat(volume),
      origin: origin.trim(),
      destination: destination.trim(),
      transportMode1: req.body.transportMode1 || 'truck',
      transportMode2: req.body.transportMode2 || null,
      preference: req.body.preference === 'distance' ? 'distance' : 'cost'
    };

    // Check if OpenAI is available for enhanced processing
    const aiAvailable = openaiService && openaiService.isAvailable;
    console.log(`🤖 AI Enhancement: ${aiAvailable ? 'ENABLED' : 'DISABLED'}`);

    // Generate route options with AI enhancement
    console.log('🛣️ Generating AI-enhanced route options...');
    const routeOptions = await generateRouteOptions(routeData);
    console.log('✅ AI-enhanced route options generated:', routeOptions.length);
    
    let aiOptimizedOptions = null;
    let aiRecommendation = null;
    
    // AI optimization for route selection
if (aiAvailable && routeOptions.length > 1) {
  try {
    const recommendation = await getAIRouteRecommendation(routeOptions, routeData);
    aiRecommendation = `${recommendation.reason} ${recommendation.cost_benefit}`;
    
    // Reorder options to put recommended first
    const recommendedIndex = routeOptions.findIndex(route => 
      route.name && route.name.toLowerCase().includes(recommendation.recommended_route.toLowerCase()) ||
      recommendation.recommended_route.toLowerCase().includes(route.name?.toLowerCase() || '')
    );
    
    if (recommendedIndex > 0) {
      const recommendedRoute = routeOptions.splice(recommendedIndex, 1)[0];
      recommendedRoute.recommended = true;
      aiOptimizedOptions = [recommendedRoute, ...routeOptions];
    } else {
      aiOptimizedOptions = routeOptions.map((route, index) => ({
        ...route,
        recommended: index === 0
      }));
    }
    
    console.log('✅ AI route recommendation applied');
    
  } catch (aiError) {
    console.log('⚠️ AI route optimization failed:', aiError.message);
    aiRecommendation = 'AI analysis unavailable - showing cost-optimized results';
  }
}

    // If requestType is 'single', return the recommended route calculation
    if (requestType === 'single') {
      const selectedRoute = req.body.selectedRoute;
      
      if (selectedRoute) {
        console.log('🎯 Using frontend-selected route:', selectedRoute.name);
        clearTimeout(requestTimeout);
        return await calculateSingleRoute(selectedRoute, routeData, res);
      } else {
        console.log('⚠️ No selected route provided, using recommended option');
        const recommendedRoute = aiOptimizedOptions ? aiOptimizedOptions[0] : routeOptions[0];
        clearTimeout(requestTimeout);
        return await calculateSingleRoute(recommendedRoute, routeData, res);
      }
    }

    // Calculate truck requirements for the shipment
    const truckRequirements = calculateTruckRequirements(routeData.volume, routeData.fuelType);
    
    // Return multiple route options with AI enhancement indicators
    const responseData = {
      success: true,
      aiEnhanced: aiAvailable,
      searchQuery: {
        from: origin,
        to: destination,
        fuelType: fuelType,
        volume: volume,
        timestamp: new Date()
      },
      routeOptions: aiOptimizedOptions || routeOptions,
      aiRecommendation: aiRecommendation,
      
      // ✅ NEW: Prominent truck requirements information
      truckRequirements: truckRequirements,
      
      summary: {
        totalOptions: routeOptions.length,
        aiEnhanced: routeOptions.filter(r => r.aiEnhanced).length,
        priceRange: {
          min: Math.min(...routeOptions.map(r => r.estimatedCost)),
          max: Math.max(...routeOptions.map(r => r.estimatedCost))
        },
        timeRange: {
          fastest: routeOptions.reduce((min, r) => 
            parseInt(r.estimatedTime) < parseInt(min.estimatedTime) ? r : min
          ).estimatedTime,
          slowest: routeOptions.reduce((max, r) => 
            parseInt(r.estimatedTime) > parseInt(max.estimatedTime) ? r : max
          ).estimatedTime
        }
      },
      // AI processing metadata
      processingInfo: {
        aiAvailable: aiAvailable,
        enhancedPricing: routeOptions.some(r => r.aiFactors),
        dynamicDistances: true,
        marketFactors: aiAvailable ? 'real-time' : 'static'
      }
    };

    console.log('📊 AI-enhanced route options response ready:', responseData.routeOptions.length, 'options');
    clearTimeout(requestTimeout);
    res.json(responseData);

  } catch (error) {
    console.error('❌ AI-enhanced route calculation error:', error);
    clearTimeout(requestTimeout);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'AI-enhanced route calculation failed',
        message: error.message,
        fallback: 'Try again or use standard calculation',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};

// Calculate detailed cost for a specific route option with cost preservation
const calculateSingleRoute = async (routeOption, routeData, res) => {
  try {
    console.log('🔍 DEBUGGING calculateSingleRoute:');
    console.log('   - Route option ID:', routeOption.id);
    console.log('   - Route option name:', routeOption.name);
    console.log('   - Route option transport modes:', routeOption.transportModes);
    console.log('   - Route option estimated cost:', routeOption.estimatedCost);
    console.log('   - Route option distance:', routeOption.distance);
    console.log('🎯 Calculating detailed cost for selected route:', routeOption.id);
    
    let detailedCalculation;
    let aiUsed = false;

    // Use standard detailed calculation
    console.log('🔧 Using standard detailed calculation');
    detailedCalculation = calculateDetailedFallbackForRoute(routeOption, routeData);
    aiUsed = false;

    // Critical validation: Ensure math is correct
    const calculatedTotal = detailedCalculation.baseCost + 
      Object.values(detailedCalculation.costBreakdown).reduce((sum, val) => sum + val, 0);
    
    if (Math.abs(detailedCalculation.totalCost - calculatedTotal) > 0.01) {
      console.log('🔧 FIXING MATH ERROR:');
      detailedCalculation.totalCost = Math.round(calculatedTotal * 100) / 100;
    }

    // Final validation: Base cost must equal original route cost
    if (Math.abs(detailedCalculation.baseCost - routeOption.estimatedCost) > 0.01) {
      console.log('🚨 CRITICAL FIX: Base cost mismatch detected!');
      detailedCalculation.baseCost = routeOption.estimatedCost;
      const breakdownSum = Object.values(detailedCalculation.costBreakdown).reduce((sum, val) => sum + val, 0);
      detailedCalculation.totalCost = detailedCalculation.baseCost + breakdownSum;
    }

    // Try to save to database if available
    let savedRoute = null;
    if (Route) {
      try {
        const route = new Route({
          fuelType: routeData.fuelType,
          volume: routeData.volume,
          origin: routeData.origin,
          destination: routeData.destination,
          transportMode1: routeOption.transportModes[0],
          transportMode2: routeOption.transportModes[1] || null,
          calculatedCost: detailedCalculation.totalCost,
          baseCost: detailedCalculation.baseCost,
          distance: routeOption.distance,
          confidence: detailedCalculation.confidence,
          costBreakdown: detailedCalculation.costBreakdown,
          aiEnhanced: aiUsed,
          marketInsights: {
            trend: detailedCalculation.marketInsights?.trend || 'stable',
            recommendation: detailedCalculation.marketInsights?.recommendation || 'Standard calculation'
          }
        });

        savedRoute = await route.save();
        console.log('✅ Route saved to database:', savedRoute._id);
      } catch (dbError) {
        console.log('⚠️ Could not save to database:', dbError.message);
      }
    }

    const responseData = {
      success: true,
      routeId: savedRoute?._id || 'temp-' + Date.now(),
      selectedRoute: routeOption,
      calculation: detailedCalculation,
      aiEnhanced: aiUsed,
      timestamp: new Date()
    };

    res.json(responseData);
  } catch (error) {
    throw error;
  }
};

// Route-specific fallback calculation with commodity costs
// ✅ FIXED: Route-specific detailed calculation with clear cost separation
function calculateDetailedFallbackForRoute(routeOption, routeData) {
  const { volume, fuelType } = routeData;
  
  // ✅ SEPARATE: Pure transport cost (NO commodity cost here)
  const baseTransportCost = routeOption.estimatedCost;
  
  console.log(`🔧 Detailed calculation for ${routeOption.name}:`);
  console.log(`   - PURE Transport cost: $${baseTransportCost}`);
  console.log(`   - Transport modes: ${routeOption.transportModes.join(' + ')}`);
  console.log(`   - Route distance: ${routeOption.distance} miles`);
  
  // ✅ SEPARATE: Calculate commodity cost separately
  const commodityInfo = getCommodityCost(fuelType, volume);
  
  // ✅ TRANSPORT-ONLY: Additional transport/logistics fees (no commodity)
  let fuelHandlingFee, terminalFees, hubTransferFee;

  // Route-specific fee calculations based on transport mode
  if (routeOption.name.toLowerCase().includes('rail')) {
    fuelHandlingFee = baseTransportCost * 0.06; // 6% for rail handling
    terminalFees = baseTransportCost * 0.03;    // 3% for rail terminals  
    hubTransferFee = baseTransportCost * 0.02;  // 2% for rail yard transfers
    console.log('💰 Using rail-focused fee calculation');
  } else if (routeOption.transportModes.includes('truck')) {
    fuelHandlingFee = baseTransportCost * 0.05; // 5% for truck handling
    terminalFees = baseTransportCost * 0.02;    // 2% for truck terminals
    hubTransferFee = 0;                         // No hub transfers for direct truck
    console.log('💰 Using truck-specific fee calculation');
  } else {
    fuelHandlingFee = baseTransportCost * 0.04;
    terminalFees = baseTransportCost * 0.03;
    hubTransferFee = baseTransportCost * 0.01;
    console.log('💰 Using default fee calculation');
  }
  
  // ✅ TRANSPORT-ONLY: Standard transport fees
  const insuranceCost = baseTransportCost * 0.015; // 1.5% insurance on transport
  const carbonOffset = volume * 10;                // $10 per tonne
  
  // ✅ CALCULATE: Total transport vs commodity costs
  const totalTransportFees = fuelHandlingFee + terminalFees + hubTransferFee + insuranceCost + carbonOffset;
  const totalTransportCosts = baseTransportCost + totalTransportFees;
  const totalProjectCost = totalTransportCosts + commodityInfo.totalCost;
  
  console.log(`💰 COST BREAKDOWN:`);
  console.log(`   - Base Transport: $${baseTransportCost.toFixed(2)}`);
  console.log(`   - Transport Fees: $${totalTransportFees.toFixed(2)}`);
  console.log(`   - Total Transport: $${totalTransportCosts.toFixed(2)}`);
  console.log(`   - Commodity Cost: $${commodityInfo.totalCost.toFixed(2)}`);
  console.log(`   - TOTAL PROJECT: $${totalProjectCost.toFixed(2)}`);
  
  return {
    totalCost: Math.round(totalProjectCost * 100) / 100,
    baseCost: Math.round(baseTransportCost * 100) / 100,
    confidence: 85,
    trucksNeeded: routeOption.trucksNeeded || (Array.isArray(routeOption.vehicles) ? routeOption.vehicles[0]?.count : undefined),
    
    // ✅ CLEAR BREAKDOWN: Transport fees only
    costBreakdown: {
      // ✅ TRANSPORT COSTS ONLY (no commodity here)
      fuelHandlingFee: Math.round(fuelHandlingFee * 100) / 100,
      terminalFees: Math.round(terminalFees * 100) / 100,
      hubTransferFee: Math.round(hubTransferFee * 100) / 100,
      insuranceCost: Math.round(insuranceCost * 100) / 100,
      carbonOffset: Math.round(carbonOffset * 100) / 100,
      
      // ✅ COMMODITY COSTS (separate section)
      commodityCost: commodityInfo.totalCost,
      commodityPricePerTonne: commodityInfo.pricePerTonne
    },
    
    // ✅ CLEAR SUMMARY: Transport vs Commodity
    costSummary: {
      pureTransportCosts: Math.round(totalTransportCosts * 100) / 100,
      commodityCosts: commodityInfo.totalCost,
      totalProjectCosts: Math.round(totalProjectCost * 100) / 100
    },
    
    marketInsights: {
      trend: 'stable',
      recommendation: `${routeOption.name}: $${totalTransportCosts.toFixed(2)} transport + $${commodityInfo.totalCost.toFixed(2)} commodity (${volume} tonnes ${fuelType} @ $${commodityInfo.pricePerTonne}/tonne)`,
      commodityNote: `Current ${fuelType} market price: $${commodityInfo.pricePerTonne}/tonne`,
      transportNote: `Transport cost: $${(totalTransportCosts/volume).toFixed(2)} per tonne over ${routeOption.distance} miles`
    }
  };
}

// Route optimization removed (was dependent on Ollama AI)
const optimizeRoute = async (req, res) => {
  res.status(503).json({
    error: 'Route optimization feature not available',
    message: 'This feature has been removed. Use standard route calculation instead.'
  });
};

const getRouteHistory = async (req, res) => {
  try {
    if (!Route) {
      return res.json({ 
        success: true, 
        data: [],
        message: 'Database not available - no history to display'
      });
    }

    const routes = await Route.find().sort({ timestamp: -1 }).limit(10);
    res.json({ success: true, data: routes });
  } catch (error) {
    console.error('❌ Error fetching routes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch routes',
      message: error.message 
    });
  }
};

// Fuel-type variable costs
function getFuelTypeCostMultiplier(fuelType) {
  const fuelCostMultipliers = {
    hydrogen: { 
      baseCost: 0.12,  // $0.12 per tonne-mile (high due to cryogenic handling)
      handling: 1.5,   // 50% more handling cost
      description: 'Specialized cryogenic transport required'
    },
    methanol: { 
      baseCost: 0.08,  // $0.08 per tonne-mile (standard liquid fuel)
      handling: 1.1,   // 10% more handling cost
      description: 'Standard chemical transport protocols'
    },
    ammonia: { 
      baseCost: 0.10,  // $0.10 per tonne-mile (toxic handling required)
      handling: 1.3,   // 30% more handling cost
      description: 'Specialized safety and ventilation systems'
    },
    gasoline: { 
      baseCost: 0.06,  // $0.06 per tonne-mile (standard fuel)
      handling: 1.0,   // Standard handling cost
      description: 'Standard fuel transport protocols'
    }
  };
  
  return fuelCostMultipliers[fuelType] || fuelCostMultipliers.gasoline;
}

// AI-Enhanced truck options generation
async function generateTruckOptionsWithAI(volume, distance, fuelType, origin, destination) {
  const maxTruckCapacity = fuelType === 'hydrogen' ? 8 : 12; // tonnes per truck
  const options = [];
  
  try {
    // Get AI-enhanced transport factors
    let transportFactors = null;
    if (openaiService && openaiService.isAvailable) {
      transportFactors = await openaiService.getTransportCostFactors('truck', fuelType, distance);
    }
    
    // Single truck option (if volume fits)
    if (volume <= maxTruckCapacity) {
      const utilizationPercent = Math.round((volume / maxTruckCapacity) * 100);
      const efficiency = utilizationPercent > 80 ? 'High Efficiency' : utilizationPercent > 60 ? 'Good Efficiency' : 'Standard Efficiency';
      
      const estimatedCost = await calculateBasicCost(volume, distance, 'truck', fuelType);
      
      options.push({
        id: 'truck-single-ai',
        type: 'direct',
        name: 'AI-Optimized Single Truck',
        transportModes: ['truck'],
        vehicles: [{
          type: 'truck',
          count: 1,
          capacity: volume,
          utilization: utilizationPercent
        }],
        estimatedTime: calculateTruckTransitTime(distance, 1) + ' days',
        estimatedCost: estimatedCost,
        distance: distance,
        riskLevel: 'low',
        description: `${efficiency} (${utilizationPercent}% capacity) - AI market pricing applied`,
        advantages: ['AI-optimized pricing', 'Real-time market rates', 'Fastest delivery'],
        aiEnhanced: true,
        aiFactors: transportFactors || { note: 'Using static rates - AI unavailable' }
      });
    }
    
    // Multiple trucks option (if volume > single truck capacity)
    if (volume > maxTruckCapacity) {
      const trucksNeeded = Math.ceil(volume / maxTruckCapacity);
      const totalCapacity = maxTruckCapacity * trucksNeeded;
      const utilizationPercent = Math.round((volume / totalCapacity) * 100);
      
      const conveyPremium = trucksNeeded <= 3 ? 1.08 : trucksNeeded <= 6 ? 1.12 : 1.15;
      const estimatedCost = (await calculateBasicCost(volume, distance, 'truck', fuelType)) * conveyPremium;
      
      options.push({
        id: 'truck-multiple-ai',
        type: 'direct',
        name: `AI-Optimized ${trucksNeeded} Truck Convoy`,
        transportModes: ['truck'],
        vehicles: [{
          type: 'truck',
          count: trucksNeeded,
          capacity: volume,
          utilization: utilizationPercent
        }],
        estimatedTime: calculateTruckTransitTime(distance, trucksNeeded) + ' days',
        estimatedCost: estimatedCost,
        distance: distance,
        riskLevel: trucksNeeded <= 3 ? 'medium' : 'high',
        description: `${trucksNeeded}-truck operation with AI convoy optimization`,
        advantages: ['AI convoy coordination', 'Dynamic pricing', 'Optimized fleet sizing'],
        aiEnhanced: true,
        aiFactors: transportFactors || { note: 'Using static rates - AI unavailable' }
      });
    }
    
  } catch (error) {
    console.error('AI truck options generation failed:', error);
    // Fallback to standard options
    return generateTruckOptions(volume, distance, fuelType);
  }
  
  return options;
}

// AI-Enhanced rail option generation
async function generateRailOptionWithAI(routeData, baseDistance) {
  const { volume, fuelType, origin, destination } = routeData;
  
  try {
    const railDistance = await calculateDistance(origin, destination, 'rail');
    let transportFactors = null;
    
    if (openaiService && openaiService.isAvailable) {
      transportFactors = await openaiService.getTransportCostFactors('rail', fuelType, railDistance);
    }
    
    const transportCost = await calculateBasicCost(volume, railDistance, 'rail', fuelType);
    const estimatedCost = transportCost.cost * 0.9;
    
    return {
      id: 'rail-primary-ai',
      type: 'rail-focused',
      name: 'AI-Optimized Premium Rail',
      transportModes: ['rail'],
      estimatedTime: calculateRailTransitTime(railDistance) + ' days',
      estimatedCost: estimatedCost,
      distance: Math.round(railDistance),
      riskLevel: 'low',
      description: 'AI-optimized rail route with premium service and dynamic pricing',
      advantages: ['AI-optimized scheduling', 'Real-time pricing', 'Environmental efficiency'],
      aiEnhanced: true,
      aiFactors: transportFactors || { note: 'Using static rates - AI unavailable' }
    };
    
  } catch (error) {
    console.error('AI rail option generation failed:', error);
    return generateRailOption(routeData, baseDistance);
  }
}

// AI-Enhanced multi-modal options generation
async function generateMultiModalOptionsWithAI(routeData, baseDistance) {
  const { volume, fuelType, origin, destination } = routeData;
  const options = [];
  
  console.log(`🔄 Generating AI-enhanced multi-modal combinations for ${baseDistance} mile route`);
  
  try {
    // COMBINATION 1: AI-Optimized Truck + Rail
    if (baseDistance > 600) {
      const railDistance = await calculateDistance(origin, destination, 'rail');
      const truckToRailDistance = Math.min(150, railDistance * 0.08);
      const railMainDistance = railDistance * 0.84;
      const railToDestinationDistance = railDistance - truckToRailDistance - railMainDistance;
      
      const estimatedCost = await calculateMultiModalCost(volume, railDistance, ['truck', 'rail'], fuelType);
      
      options.push({
        id: 'truck-rail-ai',
        type: 'multimodal',
        name: 'AI-Optimized Truck + Rail',
        transportModes: ['truck', 'rail'],
        legs: [
          { mode: 'truck', distance: truckToRailDistance, description: 'AI-optimized truck to rail terminal' },
          { mode: 'rail', distance: railMainDistance, description: 'AI-scheduled rail transport' },
          { mode: 'truck', distance: railToDestinationDistance, description: 'AI-optimized terminal delivery' }
        ],
        estimatedTime: calculateRailTransitTime(railDistance) + ' days',
        estimatedCost: estimatedCost,
        distance: Math.round(railDistance),
        riskLevel: 'low',
        description: 'AI-optimized environmentally friendly intermodal option',
        aiEnhanced: true
      });
    }
    
  } catch (error) {
    console.error('AI multi-modal options generation failed:', error);
    // Fallback to standard multi-modal options
    return generateMultiModalOptions(routeData, baseDistance);
  }
  
  console.log(`✅ Generated ${options.length} AI-enhanced multi-modal combinations`);
  return options;
}

module.exports = {
  calculateCost,
  optimizeRoute,
  calculateBasicCost,
  calculateDistance,
  calculateMultiModalCost,
  validateNumber,
  getRouteHistory,
  generateRouteOptions,
  calculateTruckRequirements
};
