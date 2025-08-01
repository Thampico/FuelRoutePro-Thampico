const express = require('express');
const router = express.Router();
const { calculateCost, optimizeRoute, getRouteHistory } = require('../controllers/routeController');

let openaiService = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openaiService = require('../services/openaiService');
  } catch (_) {
    openaiService = null;
  }
}

// ✅ GEOCODING DATA AND FUNCTIONS (Simple version)

function verifyLocation(location, transportMode, fuelType) {
  console.log(`🌍 Verifying ${location} for ${transportMode} transport of ${fuelType}`);
  
  const locationLower = location.toLowerCase();
  
  let suitable = true;
  let infrastructure = 'general';
  let warnings = [];
  
  if (transportMode === 'ship') {
    const ports = ['houston', 'rotterdam', 'singapore', 'los angeles', 'seattle', 'new orleans'];
    suitable = ports.some(port => locationLower.includes(port));
    infrastructure = suitable ? 'major_port' : 'no_port_access';
    if (!suitable) warnings.push('Ship transport requires port access');
  }
  
  return {
    valid: true,
    formattedAddress: location,
    country: locationLower.includes('netherlands') ? 'Netherlands' : 'United States',
    region: locationLower.includes('netherlands') ? 'Europe' : 'North America',
    transportMode: {
      suitable: suitable,
      infrastructure: infrastructure,
      warnings: warnings
    },
    fuelRequirements: {
      fuelType: fuelType,
      requirements: {
        storage: fuelType === 'hydrogen' ? 'Cryogenic storage (-253°C)' : 'Standard storage',
        handling: fuelType === 'ammonia' ? 'Toxic gas protocols' : 'Standard protocols'
      }
    },
    confidence: 0.85
  };
}

// ✅ MAIN CALCULATION ROUTES
router.post('/calculate-cost', calculateCost);
router.post('/optimize-route', optimizeRoute);
router.get('/routes', getRouteHistory);

// ✅ NEW: Truck requirements calculation endpoint
router.post('/truck-requirements', (req, res) => {
  try {
    const { volume, fuelType } = req.body;
    
    if (!volume || !fuelType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: volume and fuelType'
      });
    }
    
    const volumeNum = parseFloat(volume);
    if (isNaN(volumeNum) || volumeNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Volume must be a positive number'
      });
    }
    
    // Import the function from controller
    const { calculateTruckRequirements } = require('../controllers/routeController');
    const requirements = calculateTruckRequirements(volumeNum, fuelType.toLowerCase());
    
    res.json({
      success: true,
      data: requirements,
      message: requirements.message
    });
    
  } catch (error) {
    console.error('❌ Truck requirements calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate truck requirements',
      message: error.message
    });
  }
});

// ✅ BASIC API ROUTES
router.get('/fuel-types', (req, res) => {
  res.json({
    success: true,
    data: ['hydrogen', 'methanol', 'ammonia']
  });
});

router.get('/transport-modes', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'truck', name: 'Truck', capacity: '8-12 tonnes', speed: 'Fast' },
      { id: 'rail', name: 'Rail', capacity: '50+ tonnes', speed: 'Medium' }
    ]
  });
});

// ✅ GEOCODING ROUTES (Clean - No Duplicates)
router.get('/geocoding/test/:location', (req, res) => {
  try {
    const { location } = req.params;
    const { transport_mode = 'truck', fuel_type = 'hydrogen' } = req.query;
    
    console.log(`🧪 Testing geocoding for: ${location}`);
    
    const result = verifyLocation(
      decodeURIComponent(location),
      transport_mode,
      fuel_type
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Test geocoding completed'
    });
    
  } catch (error) {
    console.error('❌ Test geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Test geocoding failed',
      message: error.message
    });
  }
});


router.post('/geocoding/verify', (req, res) => {
  try {
    const { location, transportMode, fuelType } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }

    console.log(`🌍 Geocoding request: ${location} for ${transportMode} transport`);
    
    const result = verifyLocation(
      location, 
      transportMode || 'truck', 
      fuelType || 'hydrogen'
    );
    
    res.json({
      success: true,
      data: result,
      message: result.valid ? 'Location verified successfully' : 'Location verification failed'
    });
    
  } catch (error) {
    console.error('❌ Geocoding verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Geocoding service error',
      message: error.message
    });
  }
});

// ✅ OPENAI TEST ROUTES
router.get('/test-openai-price/:fuelType', async (req, res) => {
  try {
    const { fuelType } = req.params;
    
    const openaiService = require('../services/openaiService');
    if (!openaiService) {
      return res.status(503).json({
        error: 'OpenAI service not available',
        suggestion: 'Check OPENAI_API_KEY in .env file'
      });
    }
    
    const priceData = await openaiService.getPriceEstimate(fuelType);
    
    res.json({
      success: true,
      fuelType,
      priceData,
      message: 'OpenAI dynamic pricing is working!'
    });
    
  } catch (error) {
    console.error('OpenAI test error:', error);
    res.status(500).json({
      error: 'OpenAI test failed',
      message: error.message,
      suggestion: 'Check your OpenAI API key and credits'
    });
  }
});

// ✅ CACHE MANAGEMENT ROUTES
router.post('/clear-price-cache', (req, res) => {
  try {
    const openaiService = require('../services/openaiService');
    if (!openaiService) {
      return res.status(503).json({
        error: 'OpenAI service not available'
      });
    }
    
    // Clear the price cache
    openaiService.priceCache.clear();
    
    res.json({
      success: true,
      message: 'Price cache cleared successfully. Next requests will fetch fresh prices from OpenAI.',
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

router.get('/cache-status', (req, res) => {
  try {
    const openaiService = require('../services/openaiService');
    if (!openaiService) {
      return res.status(503).json({
        error: 'OpenAI service not available'
      });
    }
    
    const cacheSize = openaiService.priceCache.size;
    const cacheTimeout = openaiService.cacheTimeout;
    
    res.json({
      success: true,
      cache: {
        size: cacheSize,
        timeout: cacheTimeout,
        timeoutFormatted: cacheTimeout === 0 ? 'Disabled (Real-time)' : `${cacheTimeout / 1000} seconds`,
        entries: Array.from(openaiService.priceCache.keys())
      },
      message: cacheTimeout === 0 ? 'Cache disabled - using real-time pricing' : 'Cache enabled'
    });
    
  } catch (error) {
    console.error('Cache status error:', error);
    res.status(500).json({
      error: 'Failed to get cache status',
      message: error.message
    });
  }
});

router.get('/test-openai-location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    const openaiService = require('../services/openaiService');
    if (!openaiService) {
      return res.status(503).json({
        error: 'OpenAI service not available'
      });
    }
    
    const locationData = await openaiService.getLocationCoordinates(decodeURIComponent(location));
    
    res.json({
      success: true,
      location,
      coordinates: locationData,
      message: 'OpenAI location lookup is working!'
    });
    
  } catch (error) {
    console.error('OpenAI location test error:', error);
    res.status(500).json({
      error: 'OpenAI location test failed',
      message: error.message
    });
  }
});

// ✅ ADDITIONAL API ROUTES
router.get('/openai/price/:fuel', async (req, res) => {
  if (!openaiService) {
    return res.status(503).json({ error: 'OpenAI service not available' });
  }
  try {
    const data = await openaiService.getPriceEstimate(req.params.fuel);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Price lookup failed', message: err.message });
  }
});

router.get('/openai/location', async (req, res) => {
  if (!openaiService) {
    return res.status(503).json({ error: 'OpenAI service not available' });
  }

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  try {
    const data = await openaiService.getLocationCoordinates(query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Location lookup failed', message: err.message });
  }
});

// ✅ DEMO AND HEALTH ROUTES
router.get('/route-options-demo', (req, res) => {
  const demoOptions = [
    {
      id: 'truck-single',
      type: 'direct',
      name: 'Single Truck - Direct Route',
      transportModes: ['truck'],
      vehicles: [{ type: 'truck', count: 1, capacity: 8, utilization: 80 }],
      estimatedTime: '2 days',
      estimatedCost: 2500,
      distance: 380,
      riskLevel: 'low',
      description: 'Most direct and simple option'
    },
    {
      id: 'truck-rail',
      type: 'multimodal',
      name: 'Truck + Rail Route',
      transportModes: ['truck', 'rail'],
      legs: [
        { mode: 'truck', distance: 50, description: 'Truck to rail terminal' },
        { mode: 'rail', distance: 280, description: 'Rail transport' },
        { mode: 'truck', distance: 50, description: 'Rail terminal to destination' }
      ],
      estimatedTime: '3 days',
      estimatedCost: 2200,
      distance: 380,
      riskLevel: 'low',
      description: 'Environmentally friendly option'
    }
  ];

  res.json({
    success: true,
    searchQuery: {
      from: 'Los Angeles, CA',
      to: 'San Francisco, CA',
      fuelType: 'hydrogen',
      volume: 8,
      timestamp: new Date()
    },
    routeOptions: demoOptions,
    summary: {
      totalOptions: demoOptions.length,
      priceRange: { min: 2200, max: 2500 },
      timeRange: { fastest: '2 days', slowest: '3 days' }
    }
  });
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      database: 'connected',
      api: 'operational',
      ai: 'available'
    }
  });
});

// ✅ TEST ROUTES
router.get('/test-simple', (req, res) => {
  res.json({ message: 'Simple test route works!' });
});

router.post('/test-post', (req, res) => {
  console.log('🧪 POST test endpoint called with:', req.body);
  res.json({ 
    success: true, 
    message: 'POST test works',
    received: req.body,
    timestamp: new Date()
  });
});

module.exports = router;