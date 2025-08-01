// backend/routes/geocodingRoutes.js

const express = require('express');
const router = express.Router();

// Import OpenAI service
let openaiService;
try {
  openaiService = require('../services/openaiService');
} catch (error) {
  console.log('⚠️ OpenAI service not available for geocoding routes');
}

// Enhanced geocoding endpoint using OpenAI
router.post('/coordinates', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
        message: 'Please provide a location prompt for geocoding'
      });
    }

    if (!openaiService || !openaiService.isAvailable) {
      return res.status(503).json({
        error: 'Geocoding service not available',
        message: 'OpenAI service is not available for location processing'
      });
    }

    console.log('🌍 Processing geocoding request:', prompt.substring(0, 100) + '...');
    
    // Use OpenAI to process the location
    const result = await openaiService.getLocationCoordinates(prompt);
    
    console.log('✅ Geocoding result:', result);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    res.status(500).json({
      error: 'Geocoding failed',
      message: error.message
    });
  }
});

// Health check for geocoding service
router.get('/health', (req, res) => {
  res.json({
    service: 'geocoding',
    status: openaiService && openaiService.isAvailable ? 'available' : 'unavailable',
    timestamp: new Date()
  });
});

module.exports = router;