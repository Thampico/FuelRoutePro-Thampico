const googleMapsService = require('./googleMapsService');
const railNetworkService = require('./railNetworkService');
// Import the distance matrix at the top
const { getDistance } = require('./distanceMatrix');

// Replace the existing calculateDistance function:
async function calculateDistance(origin, destination, transportMode = 'truck', fuelType = 'methanol') {
  try {
    console.log(`🗺️ Getting ${transportMode} distance: ${origin} → ${destination}`);
    
    // First check our fixed distance matrix
    const fixedDistance = getDistance(origin, destination, transportMode);
    
    if (fixedDistance) {
      console.log(`✅ Fixed distance found: ${fixedDistance} miles via ${transportMode}`);
      return {
        distance_miles: fixedDistance,
        duration_hours: calculateDurationHours(fixedDistance, transportMode),
        route_type: transportMode,
        routing_method: 'fixed_distance_matrix',
        transport_mode: transportMode,
        fuel_type: fuelType,
        route_path: [origin, destination]
      };
    }
    
    // Fallback for routes not in our matrix
    console.log(`⚠️ Route not in distance matrix, using estimation`);
    const estimatedDistance = estimateDistanceFromCoordinates(origin, destination, transportMode);
    
    return {
      distance_miles: estimatedDistance,
      duration_hours: calculateDurationHours(estimatedDistance, transportMode),
      route_type: `estimated_${transportMode}`,
      routing_method: 'coordinate_estimation',
      transport_mode: transportMode,
      fuel_type: fuelType,
      route_path: [origin, destination],
      fallback: true
    };
    
  } catch (error) {
    console.error(`❌ Distance calculation failed:`, error.message);
    throw error;
  }
}

// Helper function to calculate duration with realistic speeds
function calculateDurationHours(distance, transportMode) {
  const speeds = {
    truck: 55,    // mph average including stops
    rail: 45      // mph freight rail average (improved from 25)
  };
  
  const speed = speeds[transportMode] || 30;
  const duration = distance / speed;
  
  // Add realistic delays
  if (transportMode === 'rail') {
    // Add 2-4 hours for rail yard operations and switching
    const yardTime = Math.min(4, Math.max(2, distance / 500));
    return Math.round((duration + yardTime) * 10) / 10;
  }
  
  return Math.round(duration * 10) / 10;
}

// Coordinate-based estimation fallback
function estimateDistanceFromCoordinates(origin, destination, transportMode) {
  // Define coordinates for our 20 locations
  const coordinates = {
    'Houston, TX': [29.7604, -95.3698],
    'New Orleans, LA': [29.9511, -90.0715],
    'Mobile, AL': [30.6944, -88.0431],
    'Tampa Bay, FL': [27.9506, -82.4572],
    'Savannah, GA': [32.0835, -81.0998],
    'Jacksonville, FL': [30.3322, -81.6557],
    'Miami, FL': [25.7617, -80.1918],
    'New York/NJ': [40.7128, -74.0060],
    'Philadelphia, PA': [39.9526, -75.1652],
    'Norfolk, VA': [36.8468, -76.2852],
    'Boston, MA': [42.3601, -71.0589],
    'Long Beach, CA': [33.7701, -118.1937],
    'Los Angeles, CA': [34.0522, -118.2437],
    'Seattle, WA': [47.6062, -122.3321],
    'Portland, OR': [45.5152, -122.6784],
    'San Francisco/Oakland, CA': [37.7749, -122.4194],
    'Chicago, IL': [41.8781, -87.6298],
    'St. Louis, MO': [38.6270, -90.1994],
    'Memphis, TN': [35.1495, -90.0490],
    'Duluth-Superior, MN/WI': [46.7867, -92.1005]
  };
  
  const originCoords = coordinates[origin];
  const destCoords = coordinates[destination];
  
  if (!originCoords || !destCoords) {
    console.warn(`Missing coordinates for ${origin} or ${destination}`);
    return 1000; // Default fallback
  }
  
  // Calculate great circle distance
  const R = 3959; // Earth's radius in miles
  const dLat = (destCoords[0] - originCoords[0]) * Math.PI / 180;
  const dLon = (destCoords[1] - originCoords[1]) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(originCoords[0] * Math.PI / 180) * Math.cos(destCoords[0] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightLineDistance = R * c;
  
  // Apply transport mode multipliers
  const modeMultipliers = {
    truck: 1.15,   // Highway routing
    rail: 1.25     // Rail network routing
  };
  
  const adjustedDistance = Math.round(straightLineDistance * (modeMultipliers[transportMode] || 1.15));
  console.log(`📏 Estimated distance: ${adjustedDistance} miles (${straightLineDistance.toFixed(0)} miles direct × ${modeMultipliers[transportMode] || 1.15})`);
  
  return adjustedDistance;
}

// Removed duplicate distance matrix - using centralized one from distanceMatrix.js

class RoutingService {
  constructor() {
    this.services = {
      truck: googleMapsService,
      rail: railNetworkService
    };
    this.isAvailable = true;
    console.log('🗺️ Unified Routing Service initialized');
  }

  // Get route for specific transport mode
  async getRoute(origin, destination, transportMode, fuelType = 'methanol') {
    try {
      console.log(`🗺️ Getting ${transportMode} route: ${origin} → ${destination}`);
      const service = this.services[transportMode];
      if (!service || !service.isAvailable) {
        throw new Error(`${transportMode} routing service not available`);
      }
      let route;
      switch (transportMode) {
        case 'truck':
          route = await this.getTruckRoute(origin, destination);
          break;
        case 'rail':
          route = await this.getRailRoute(origin, destination);
          break;
        default:
          throw new Error(`Unsupported transport mode: ${transportMode}`);
      }
      route.transport_mode = transportMode;
      route.fuel_type = fuelType;
      route.calculated_at = new Date().toISOString();
      route.service_used = service.constructor.name;
      return route;
    } catch (error) {
      console.error(`${transportMode} routing failed:`, error.message);

      const fallbackRoute = this.getDistanceMatrixRoute(
        origin,
        destination,
        transportMode
      );
      fallbackRoute.fallback = true;
      fallbackRoute.fallback_reason = error.message;
      return fallbackRoute;
    }
  }

  // Fallback: Distance matrix
  getDistanceMatrixRoute(origin, destination, transportMode) {
    // Use centralized distance matrix
    const distance = getDistance(origin, destination, transportMode);
    
    if (!distance) {
      // If not in matrix, estimate
      const estimatedDistance = this.estimateDistance(origin, destination, transportMode);
      const speed = this.getEstimatedSpeed(transportMode);
      const duration = Math.round(estimatedDistance / speed * 10) / 10;
      
      return {
        distance_miles: estimatedDistance,
        duration_hours: duration,
        route_type: `estimated_${transportMode}`,
        routing_method: 'coordinate_estimation',
        transport_mode: transportMode,
        estimated: true,
        confidence: 0.3,
        route_path: [origin, destination]
      };
    }
    
    const speed = this.getEstimatedSpeed(transportMode);
    const duration = Math.round(distance / speed * 10) / 10;
    
    return {
      distance_miles: distance,
      duration_hours: duration,
      route_type: `matrix_${transportMode}`,
      routing_method: 'distance_matrix',
      transport_mode: transportMode,
      estimated: false,
      confidence: 0.9,
      route_path: [origin, destination]
    };
  }

  estimateDistance(origin, destination, transportMode) {
    // Use the coordinate-based estimation function
    return estimateDistanceFromCoordinates(origin, destination, transportMode);
  }

  // Get multiple route options with different transport modes
  async getRouteOptions(origin, destination, fuelType, preferredModes = ['truck', 'rail']) {
    console.log(`🗺️ Getting route options: ${origin} → ${destination} for ${fuelType}`);
    const routes = [];
    const errors = [];
    for (const mode of preferredModes) {
      try {
        const route = await this.getRoute(origin, destination, mode, fuelType);
        routes.push({
          mode,
          ...route,
          feasible: this.assessFeasibility(route, fuelType, mode)
        });
      } catch (error) {
        errors.push({ mode, error: error.message });
        console.warn(`Failed to get ${mode} route:`, error.message);
      }
    }
    // Pipeline routing disabled
    routes.sort((a, b) => {
      if (a.feasible !== b.feasible) return b.feasible - a.feasible;
      return a.distance_miles - b.distance_miles;
    });
    return {
      origin,
      destination,
      fuel_type: fuelType,
      routes,
      errors,
      best_option: routes.length > 0 ? routes[0] : null,
      calculated_at: new Date().toISOString()
    };
  }

  assessFeasibility(route, fuelType, mode) {
    let score = 0;
    const baseFeasibility = {
      truck: 0.8,
      rail: 0.9
    };
    score = baseFeasibility[mode] || 0.5;
    if (fuelType === 'hydrogen') {
      if (mode === 'truck') score *= 0.7;
    } else if (fuelType === 'ammonia') {
      if (mode === 'truck') score *= 0.8;
      if (mode === 'rail') score *= 0.9;
    } else if (fuelType === 'methanol') {
      score *= 1.0;
    }
    if (route.distance_miles > 1000 && mode === 'truck') score *= 0.7;
    return Math.round(score * 100) / 100;
  }

  getFallbackRoute(origin, destination, transportMode, fuelType) {
    console.log(`🔧 Using fallback route calculation for ${transportMode}`);
    const baseDistance = 1000;
    const modeMultipliers = {
      truck: 1.0,
      rail: 1.15
    };
    const distance = Math.round(baseDistance * (modeMultipliers[transportMode] || 1.0));
    const speed = this.getEstimatedSpeed(transportMode);
    const duration = Math.round(distance / speed * 10) / 10;
    return {
      distance_miles: distance,
      duration_hours: duration,
      route_type: `estimated_${transportMode}`,
      routing_method: 'fallback_estimation',
      transport_mode: transportMode,
      fuel_type: fuelType,
      estimated: true,
      confidence: 0.3,
      route_path: [origin, destination]
    };
  }

  getEstimatedSpeed(transportMode) {
    const speeds = {
      truck: 55,
      rail: 45  // Improved from 25 to be more realistic
    };
    return speeds[transportMode] || 30;
  }

  async validateLocation(location, transportMode, fuelType) {
    try {
      const service = this.services[transportMode];
      if (!service) {
        return { valid: false, reason: `${transportMode} service not available` };
      }
      switch (transportMode) {
        case 'rail':
          const hasRailAccess = service.hasRailAccess ? service.hasRailAccess(location) : false;
          return {
            valid: hasRailAccess,
            reason: hasRailAccess ? 'Rail terminal available' : 'No rail access found',
            terminals: service.getNearbyRailTerminals ? service.getNearbyRailTerminals(location).slice(0, 3) : []
          };
        case 'truck':
          if (service.geocodeLocation) {
            const geocoded = await service.geocodeLocation(location);
            return {
              valid: !!geocoded,
              reason: geocoded ? 'Location accessible by truck' : 'Location not found',
              geocoded_address: geocoded?.formatted_address
            };
          }
          return { valid: true, reason: 'Truck access generally available' };
        default:
          return { valid: false, reason: `Unknown transport mode: ${transportMode}` };
      }
    } catch (error) {
      return {
        valid: false,
        reason: `Validation failed: ${error.message}`
      };
    }
  }

  isKnownPort(location) {
    const knownPorts = [
      'Houston, TX', 'Los Angeles, CA', 'Long Beach, CA', 'New York/NJ',
      'Seattle, WA', 'New Orleans, LA', 'Norfolk, VA', 'Savannah, GA',
      'Miami, FL', 'Philadelphia, PA', 'Boston, MA', 'Portland, OR'
    ];
    return knownPorts.some(port => 
      location.toLowerCase().includes(port.toLowerCase()) ||
      port.toLowerCase().includes(location.toLowerCase())
    );
  }

  async getMultiModalRoute(origin, intermediateHub, destination, mode1, mode2, fuelType) {
    console.log(`🗺️ Multi-modal route: ${origin} --[${mode1}]--> ${intermediateHub} --[${mode2}]--> ${destination}`);
    try {
      const [leg1, leg2] = await Promise.all([
        this.getRoute(origin, intermediateHub, mode1, fuelType),
        this.getRoute(intermediateHub, destination, mode2, fuelType)
      ]);
      const totalDistance = leg1.distance_miles + leg2.distance_miles;
      const totalTime = leg1.duration_hours + leg2.duration_hours + 4;
      return {
        route_type: 'multimodal',
        total_distance_miles: totalDistance,
        total_duration_hours: totalTime,
        transfer_time_hours: 4,
        legs: [
          { leg: 1, mode: mode1, ...leg1 },
          { leg: 2, mode: mode2, ...leg2 }
        ],
        route_path: [origin, intermediateHub, destination],
        transport_modes: [mode1, mode2],
        fuel_type: fuelType,
        intermediate_hub: intermediateHub,
        efficiency_score: this.calculateEfficiencyScore(totalDistance, totalTime, [mode1, mode2])
      };
    } catch (error) {
      console.error('Multi-modal routing failed:', error.message);
      throw new Error(`Multi-modal route calculation failed: ${error.message}`);
    }
  }

  calculateEfficiencyScore(distance, time, modes) {
    const distanceScore = distance / 1000;
    const timeScore = time / 24;
    const modeScore = modes.length * 0.1;
    return Math.round((distanceScore + timeScore + modeScore) * 100) / 100;
  }

  async healthCheck() {
    const status = {};
    for (const [mode, service] of Object.entries(this.services)) {
      try {
        status[mode] = await service.healthCheck();
      } catch (error) {
        status[mode] = false;
      }
    }
    return {
      overall: Object.values(status).some(s => s),
      services: status,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ UPDATED: Proper service method calls
  async getTruckRoute(origin, destination) {
    try {
      // Try Google Maps first if available
      if (this.services.truck && this.services.truck.isAvailable) {
        const route = await this.services.truck.getTruckRoute(origin, destination);
        return {
          ...route,
          route_path: route.route_path
        };
      }
      
      // Fallback to distance matrix
      const distance = getDistance(origin, destination, 'truck');
      if (!distance) {
        throw new Error(`No truck route available between ${origin} and ${destination}`);
      }
      
      const duration = Math.round((distance / 55) * 10) / 10; // 55 mph average
      return {
        distance_miles: distance,
        duration_hours: duration,
        route_type: 'truck_highway',
        routing_method: 'distance_matrix_fallback',
        route_path: [origin, destination]
      };
    } catch (error) {
      console.error('Truck routing error:', error.message);
      throw error;
    }
  }

  async getRailRoute(origin, destination) {
    return await this.services.rail.getRailRoute(origin, destination);
  }


}
module.exports = new RoutingService();
