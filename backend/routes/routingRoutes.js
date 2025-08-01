// backend/routes/routingRoutes.js
const express = require('express');
const router = express.Router();
const routingService = require('../services/routingService');

// Generic coastal paths for fallback path generation
const coastalPaths = {
  west: [
    [32.7157, -117.1611],
    [33.7292, -118.2620],
    [36.6002, -121.8947],
    [39.1612, -123.7881],
    [43.3504, -124.3738],
    [46.2816, -124.0833],
    [47.6062, -122.3321]
  ],
  gulf: [
    [29.7050, -95.0030],
    [29.4724, -94.0572],
    [29.9511, -90.0715],
    [30.6944, -88.0431],
    [27.9506, -82.4572]
  ],
  east: [
    [25.7617, -80.1918],
    [30.3322, -81.6557],
    [32.0835, -81.0998],
    [33.8734, -78.8808],
    [35.2271, -75.5449],
    [36.8468, -76.2852],
    [40.7128, -74.0060],
    [42.3601, -71.0589]
  ]
};

function haversineDistance(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

function generateCoastalFallback(start, end) {
  if (!start || !end) return [];

  const paths = Object.values(coastalPaths);
  let bestPath = paths[0];
  let bestScore = Infinity;

  paths.forEach(path => {
    const score = haversineDistance(start, path[0]) + haversineDistance(end, path[path.length - 1]);
    if (score < bestScore) {
      bestScore = score;
      bestPath = path;
    }
  });

  const nearestIndex = (coords, path) => {
    let idx = 0;
    let min = Infinity;
    path.forEach((p, i) => {
      const d = haversineDistance(coords, p);
      if (d < min) {
        min = d;
        idx = i;
      }
    });
    return idx;
  };

  const startIdx = nearestIndex(start, bestPath);
  const endIdx = nearestIndex(end, bestPath);

  let slice = bestPath.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
  if (startIdx > endIdx) slice = slice.reverse();

  slice[0] = start;
  slice[slice.length - 1] = end;
  return slice;
}

// Test all routing services
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing routing services via API...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      services: {},
      sample_routes: []
    };

    // Test each service individually
    const services = ['truck', 'rail'];
    const sampleRoute = { origin: 'Houston, TX', destination: 'New Orleans, LA' };

    for (const service of services) {
      try {
        const startTime = Date.now();
        const route = await routingService.getRoute(
          sampleRoute.origin, 
          sampleRoute.destination, 
          service, 
          'methanol'
        );
        const duration = Date.now() - startTime;

        testResults.services[service] = {
          status: 'success',
          response_time_ms: duration,
          distance_miles: route.distance_miles,
          routing_method: route.routing_method,
          fallback: route.fallback || false
        };

        testResults.sample_routes.push({
          service,
          ...route
        });

      } catch (error) {
        testResults.services[service] = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Overall health check
    const health = await routingService.healthCheck();
    testResults.overall_health = health;

    res.json({
      success: true,
      message: 'Routing services test completed',
      results: testResults
    });

  } catch (error) {
    console.error('Routing test error:', error);
    res.status(500).json({
      success: false,
      error: 'Routing test failed',
      message: error.message
    });
  }
});

// Get health status of all routing services
router.get('/health', async (req, res) => {
  try {
    const health = await routingService.healthCheck();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...health
    });

  } catch (error) {
    console.error('Routing health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Get route for specific transport mode
router.post('/route', async (req, res) => {
  try {
    const { origin, destination, mode, fuelType = 'methanol' } = req.body;

    if (!origin || !destination || !mode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['origin', 'destination', 'mode']
      });
    }

    console.log(`🗺️ API route request: ${origin} → ${destination} via ${mode} for ${fuelType}`);

    const route = await routingService.getRoute(origin, destination, mode, fuelType);

    res.json({
      success: true,
      route: route,
      request: { origin, destination, mode, fuelType },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Route calculation failed',
      message: error.message
    });
  }
});

// Get multiple route options
router.post('/options', async (req, res) => {
  try {
    const { origin, destination, fuelType = 'methanol', modes } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['origin', 'destination']
      });
    }

    const preferredModes = modes || ['truck', 'rail'];
    console.log(`🗺️ API route options: ${origin} → ${destination} for ${fuelType}, modes: ${preferredModes.join(', ')}`);

    const routeOptions = await routingService.getRouteOptions(origin, destination, fuelType, preferredModes);

    res.json({
      success: true,
      ...routeOptions
    });

  } catch (error) {
    console.error('Route options error:', error);
    res.status(500).json({
      success: false,
      error: 'Route options calculation failed',
      message: error.message
    });
  }
});

// Validate location for transport mode
router.post('/validate', async (req, res) => {
  try {
    const { location, mode, fuelType = 'methanol' } = req.body;

    if (!location || !mode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['location', 'mode']
      });
    }

    console.log(`📍 API location validation: ${location} for ${mode} transport`);

    const validation = await routingService.validateLocation(location, mode, fuelType);

    res.json({
      success: true,
      validation: validation,
      request: { location, mode, fuelType },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Location validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Location validation failed',
      message: error.message
    });
  }
});

// Get multi-modal route
router.post('/multimodal', async (req, res) => {
  try {
    const { origin, intermediateHub, destination, mode1, mode2, fuelType = 'methanol' } = req.body;

    if (!origin || !intermediateHub || !destination || !mode1 || !mode2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['origin', 'intermediateHub', 'destination', 'mode1', 'mode2']
      });
    }

    console.log(`🔄 API multi-modal route: ${origin} --[${mode1}]--> ${intermediateHub} --[${mode2}]--> ${destination}`);

    const multiModalRoute = await routingService.getMultiModalRoute(
      origin, intermediateHub, destination, mode1, mode2, fuelType
    );

    res.json({
      success: true,
      route: multiModalRoute,
      request: { origin, intermediateHub, destination, mode1, mode2, fuelType },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Multi-modal route error:', error);
    res.status(500).json({
      success: false,
      error: 'Multi-modal route calculation failed',
      message: error.message
    });
  }
});

// Get service-specific information
router.get('/services/:service', async (req, res) => {
  try {
    const { service } = req.params;
    
    if (!['truck', 'rail'].includes(service)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service',
        valid_services: ['truck', 'rail']
      });
    }

    let serviceInfo = {};

    if (service === 'truck') {
      serviceInfo = {
        name: 'Google Maps Truck Routing',
        capabilities: ['Real-time traffic', 'Highway optimization', 'Door-to-door'],
        coverage: 'Global',
        api_required: 'Google Maps API Key'
      };
    } else if (service === 'rail') {
      serviceInfo = {
        name: 'US Rail Network',
        capabilities: ['Class I railroad routes', 'Terminal connections', 'Freight optimization'],
        coverage: 'United States',
        api_required: 'None'
      };
    }

    // Test service availability
    try {
      await routingService.getRoute('Houston, TX', 'New Orleans, LA', service, 'methanol');
      serviceInfo.status = 'available';
    } catch (error) {
      serviceInfo.status = 'limited';
      serviceInfo.error = error.message;
    }

    res.json({
      success: true,
      service: service,
      info: serviceInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Service info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service information',
      message: error.message
    });
  }
});
// Enhanced route visualization with better coordinate mapping
router.post('/visualization', async (req, res) => {
    try {
      const { routeOptions, origin, destination, fuelType } = req.body;
  
      if (!routeOptions || !Array.isArray(routeOptions)) {
        return res.status(400).json({
          success: false,
          error: 'Route options are required',
          required: ['routeOptions']
        });
      }

      console.log(`🗺️ Enhancing ${routeOptions.length} routes for map visualization`);

    // Enhanced US port/hub coordinates with better accuracy
    const locationCoordinates = {
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

    // Enhance each route with visualization data
    const enhancedRoutes = await Promise.all(
      routeOptions.map(async (route, index) => {
        try {
          const primaryMode = route.transportModes?.[0] || 'truck';
          
          console.log(`  Processing route ${index + 1}: ${route.name} (${primaryMode})`);
          
          // Create route path for visualization
          let routePath = [origin, destination];
          let coordinates = [];

          // Additional processing for specific modes can be added here
          
          // Multi-modal routes have intermediate points
          if (route.type === 'multimodal' && route.legs) {
            routePath = [];
            route.legs.forEach((leg, legIndex) => {
              if (legIndex === 0) routePath.push(leg.start || origin);
              routePath.push(leg.end || destination);
            });
          }
          
          // Convert location names to coordinates when necessary
          if (Array.isArray(routePath[0])) {
            coordinates = routePath;
          } else {
            coordinates = routePath
              .map(location => locationCoordinates[location])
              .filter(coords => coords);
          }

          // If we don't have coordinates, use origin and destination
          if (coordinates.length === 0) {
            coordinates = [
              locationCoordinates[origin] || [39.8283, -98.5795], // Default to center US
              locationCoordinates[destination] || [39.8283, -98.5795]
            ];
          }

          // Calculate bounding box
          let boundingBox = null;
          if (coordinates.length > 0) {
            const lats = coordinates.map(coord => coord[0]);
            const lngs = coordinates.map(coord => coord[1]);
            boundingBox = {
              north: Math.max(...lats),
              south: Math.min(...lats),
              east: Math.max(...lngs),  
              west: Math.min(...lngs)
            };
          }

          return {
            ...route,
            // Enhanced visualization data
            routePath: routePath,
            coordinates: coordinates,
            boundingBox: boundingBox,
            
            // Map styling
            primaryColor: getTransportModeColor(primaryMode),
            transportIcon: getTransportModeIcon(primaryMode),
            
            // Enhanced metadata
            visualizationType: route.type === 'multimodal' ? 'multi_segment' : 'direct',
            routingConfidence: coordinates.length >= 2 ? 'high' : 'medium',
            
            // Transport mode specific styling
            lineStyle: getTransportModeLineStyle(primaryMode),
            
            // Route segments for multi-modal
            segments: route.legs ? route.legs.map((leg, segIndex) => ({
              from: leg.start || (segIndex === 0 ? origin : 'hub'),
              to: leg.end || destination,
              mode: leg.mode,
              distance: leg.distance_miles || leg.distance,
              color: getTransportModeColor(leg.mode),
              style: getTransportModeLineStyle(leg.mode)
            })) : null
          };

        } catch (routeError) {
          console.warn(`Failed to enhance route ${route.name}:`, routeError.message);
          
          // Return basic route with fallback visualization
          return {
            ...route,
            routePath: [origin, destination],
            coordinates: [
              locationCoordinates[origin] || [39.8283, -98.5795],
              locationCoordinates[destination] || [39.8283, -98.5795]
            ],
            primaryColor: getTransportModeColor(route.transportModes?.[0] || 'truck'),
            transportIcon: getTransportModeIcon(route.transportModes?.[0] || 'truck'),
            visualizationType: 'fallback',
            routingConfidence: 'low',
            fallback: true
          };
        }
      })
    );

    // Calculate map center and zoom
    const mapCenter = calculateMapCenter(
      locationCoordinates[origin],
      locationCoordinates[destination]
    );
    
    const mapZoom = calculateRecommendedZoom(
      locationCoordinates[origin],
      locationCoordinates[destination]
    );

    res.json({
      success: true,
      visualizations: enhancedRoutes,
      mapSettings: {
        center: mapCenter,
        zoom: mapZoom,
        bounds: calculateRouteBounds(enhancedRoutes)
      },
      metadata: {
        totalRoutes: enhancedRoutes.length,
        visualizedRoutes: enhancedRoutes.filter(r => !r.fallback).length,
        transportModes: [...new Set(enhancedRoutes.flatMap(r => r.transportModes))],
        routingQuality: enhancedRoutes.every(r => r.routingConfidence === 'high') ? 'excellent' : 'good'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Route visualization error:', error);
    res.status(500).json({
      success: false,
      error: 'Route visualization failed',
      message: error.message
    });
  }
});

// Helper function: Get transport mode colors for map styling
function getTransportModeColor(mode) {
  const colors = {
    truck: '#2563eb',   // Blue
    rail: '#dc2626'    // Red
  };
  return colors[mode] || colors.truck;
}

// Helper function: Get transport mode icons
function getTransportModeIcon(mode) {
  const icons = {
    truck: '🚛',
    rail: '🚂'
  };
  return icons[mode] || icons.truck;
}

// Helper function: Get line styles for different transport modes
function getTransportModeLineStyle(mode) {
  const styles = {
    truck: { weight: 4, dashArray: null, opacity: 0.8 },
    rail: { weight: 6, dashArray: '10,5', opacity: 0.7 }
  };
  return styles[mode] || styles.truck;
}

// Helper function: Calculate map center
function calculateMapCenter(originCoords, destCoords) {
  if (originCoords && destCoords) {
    return [
      (originCoords[0] + destCoords[0]) / 2,
      (originCoords[1] + destCoords[1]) / 2
    ];
  }
  // Default to center of US
  return [39.8283, -98.5795];
}

// Helper function: Calculate recommended zoom level
function calculateRecommendedZoom(originCoords, destCoords) {
  if (!originCoords || !destCoords) return 4;
  
  const distance = Math.sqrt(
    Math.pow(destCoords[0] - originCoords[0], 2) + 
    Math.pow(destCoords[1] - originCoords[1], 2)
  );
  
  // Zoom levels based on distance
  if (distance < 2) return 8;   // Very close (same city)
  if (distance < 5) return 7;   // Regional
  if (distance < 10) return 6;  // State-level
  if (distance < 20) return 5;  // Multi-state
  return 4; // Cross-country
}

// Helper function: Calculate bounds for all routes
function calculateRouteBounds(routes) {
  const allCoords = routes.flatMap(route => route.coordinates || []);
  
  if (allCoords.length === 0) {
    return {
      north: 49.38, south: 25.82, // US bounds
      east: -66.95, west: -124.39
    };
  }
  
  const lats = allCoords.map(coord => coord[0]);
  const lngs = allCoords.map(coord => coord[1]);
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

// Enhanced locations endpoint with transport capabilities
router.get('/locations', async (req, res) => {
  try {
    const locations = [
      // Gulf Coast Ports
      {
        name: 'Houston, TX',
        coordinates: [29.7604, -95.3698],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'Gulf Coast',
        specialties: ['petrochemicals', 'LNG', 'crude_oil'],
        infrastructure: 'extensive'
      },
      {
        name: 'New Orleans, LA',
        coordinates: [29.9511, -90.0715],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'Gulf Coast',
        specialties: ['bulk_liquids', 'chemicals'],
        infrastructure: 'good'
      },
      
      // West Coast Ports
      {
        name: 'Los Angeles, CA',
        coordinates: [34.0522, -118.2437],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'West Coast',
        specialties: ['containers', 'fuel_imports'],
        infrastructure: 'extensive'
      },
      {
        name: 'Long Beach, CA',
        coordinates: [33.7701, -118.1937],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'West Coast',
        specialties: ['containers', 'fuel_distribution'],
        infrastructure: 'extensive'
      },
      {
        name: 'Seattle, WA',
        coordinates: [47.6062, -122.3321],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'Pacific Northwest',
        specialties: ['bulk_cargo', 'containers'],
        infrastructure: 'good'
      },
      
      // East Coast Ports  
      {
        name: 'New York/NJ',
        coordinates: [40.7128, -74.0060],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'Northeast',
        specialties: ['containers', 'fuel_imports'],
        infrastructure: 'extensive'
      },
      {
        name: 'Norfolk, VA',
        coordinates: [36.8468, -76.2852],
        type: 'major_port',
        capabilities: ['truck', 'rail'],
        region: 'Southeast',
        specialties: ['coal', 'containers'],
        infrastructure: 'good'
      },
      
      // Inland Hubs
      {
        name: 'Chicago, IL',
        coordinates: [41.8781, -87.6298],
        type: 'inland_hub',
        capabilities: ['truck', 'rail'],
        region: 'Midwest',
        specialties: ['rail_junction', 'distribution'],
        infrastructure: 'extensive'
      },
      {
        name: 'Memphis, TN',
        coordinates: [35.1495, -90.0490],
        type: 'inland_hub',
        capabilities: ['truck', 'rail'],
        region: 'Southeast',
        specialties: ['logistics_hub', 'distribution'],
        infrastructure: 'good'
      }
      
      // Add more locations as needed...
    ];

    // Filter by query parameters if provided
    const { region, type, capability } = req.query;
    let filteredLocations = locations;
    
    if (region) {
      filteredLocations = filteredLocations.filter(loc => 
        loc.region.toLowerCase().includes(region.toLowerCase())
      );
    }
    
    if (type) {
      filteredLocations = filteredLocations.filter(loc => 
        loc.type === type
      );
    }
    
    if (capability) {
      filteredLocations = filteredLocations.filter(loc => 
        loc.capabilities.includes(capability)
      );
    }

    res.json({
      success: true,
      locations: filteredLocations,
      metadata: {
        total: filteredLocations.length,
        regions: [...new Set(locations.map(l => l.region))],
        types: [...new Set(locations.map(l => l.type))],
        capabilities: [...new Set(locations.flatMap(l => l.capabilities))]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Locations endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locations',
      message: error.message
    });
  }
});

// Route capabilities endpoint
router.get('/capabilities/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const { fuel_type } = req.query;
    
    // This would normally query a database
    // For now, return capabilities based on location type
    const locationCapabilities = {
      transport_modes: ['truck', 'rail'],
      fuel_handling: {
        hydrogen: { cryogenic: true, compressed: true },
        methanol: { bulk_liquid: true, iso_tanks: true },
        ammonia: { refrigerated: true, pressurized: true }
      },
      infrastructure: 'major_port',
      certifications: ['HAZMAT', 'DOT', 'IMDG'],
      capacity: 'high'
    };
    
    res.json({
      success: true,
      location: location,
      capabilities: locationCapabilities,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Capabilities endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities',
      message: error.message
    });
  }
});

// Get fuel compatibility information
router.get('/fuel-compatibility/:fuelType', async (req, res) => {
  try {
    const { fuelType } = req.params;

    const compatibility = {
      hydrogen: {
        truck: { compatible: true, requirements: ['Cryogenic equipment', 'Specialized trailers'] },
        rail: { compatible: true, requirements: ['Specialized railcars', 'Safety protocols'] }
      },
      methanol: {
        truck: { compatible: true, requirements: ['Standard chemical transport'] },
        rail: { compatible: true, requirements: ['Chemical tank cars'] }
      },
      ammonia: {
        truck: { compatible: true, requirements: ['Refrigerated transport', 'Safety equipment'] },
        rail: { compatible: true, requirements: ['Pressurized cars', 'Safety protocols'] }
      }
    };

    const fuelCompatibility = compatibility[fuelType.toLowerCase()];

    if (!fuelCompatibility) {
      return res.status(400).json({
        success: false,
        error: 'Unknown fuel type',
        supported_fuels: Object.keys(compatibility)
      });
    }

    res.json({
      success: true,
      fuel_type: fuelType,
      compatibility: fuelCompatibility,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fuel compatibility error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fuel compatibility',
      message: error.message
    });
  }
});

// Debug endpoint for development
router.get('/debug', async (req, res) => {
  try {
    const debugInfo = {
      environment: process.env.NODE_ENV,
      google_maps_configured: !!process.env.GOOGLE_MAPS_API_KEY,
      routing_cache_size: 'N/A', // You could implement cache size tracking
      services_loaded: {
        routingService: !!routingService,
        isAvailable: routingService.isAvailable
      }
    };

    res.json({
      success: true,
      debug_info: debugInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get debug information',
      message: error.message
    });
  }
});

module.exports = router;
module.exports.generateCoastalFallback = generateCoastalFallback;
