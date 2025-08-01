require('dotenv').config({ path: __dirname + '/.env' });
console.log('Dotenv loaded from:', __dirname + '/.env');
console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
console.log('GOOGLE_MAPS_API_KEY loaded:', !!process.env.GOOGLE_MAPS_API_KEY);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

const app = express();

// Connect to Database
connectDB();

// Check AI service availability (OpenAI only)
let aiService;
if (process.env.OPENAI_API_KEY) {
  try {
    aiService = require('./services/openaiService');
    console.log('🤖 OpenAI service initialized');
  } catch (error) {
    console.log('⚠️ OpenAI service failed to load:', error.message);
    aiService = null;
  }
} else {
  console.log('⚠️ OpenAI API key not found in environment variables');
  aiService = null;
}

// NEW: Check routing services availability
let routingService;
try {
  routingService = require('./services/routingService');
  console.log('🗺️ Routing services initialized');
  
  // Test routing services health
  routingService.healthCheck()
    .then(health => {
      console.log('🏥 Routing services health check:', health.overall ? 'Healthy' : 'Limited');
      Object.entries(health.services).forEach(([service, status]) => {
        console.log(`   ${service}: ${status ? '✅' : '❌'}`);
      });
    })
    .catch(error => {
      console.log('⚠️ Routing services health check failed:', error.message);
    });
} catch (error) {
  console.log('⚠️ Routing services failed to load:', error.message);
  routingService = null;
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'FuelRoute Pro Backend API with Enhanced Routing',
    version: '2.0.0',
    status: 'running',
    services: {
      aiAvailable: aiService && aiService.isAvailable,
      routingAvailable: routingService && routingService.isAvailable,
      googleMapsConfigured: !!process.env.GOOGLE_MAPS_API_KEY
    },
    features: [
      'AI-powered cost calculation',
      'Real-time routing via Google Maps',
      'US rail network routing'
    ]
  });
});

app.get('/api/health', async (req, res) => {
  let routingHealth = { overall: false, services: {} };
  
  if (routingService) {
    try {
      routingHealth = await routingService.healthCheck();
    } catch (error) {
      console.error('Routing health check failed:', error);
    }
  }

  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      database: 'connected',
      ai: aiService && aiService.isAvailable ? 'available' : 'unavailable',
      routing: {
        overall: routingHealth.overall,
        services: routingHealth.services
      }
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
const routeRoutes = require('./routes/routeRoutes');
app.use('/api', routeRoutes);

const geocodingRoutes = require('./routes/geocodingRoutes');
app.use('/api/geocoding', geocodingRoutes);

// Payment routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

// NEW: Import and use routing routes
const routingRoutes = require('./routes/routingRoutes');
app.use('/api/routing', routingRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    available_endpoints: [
      'GET  /',
      'GET  /api/health',
      'POST /api/calculate-cost',
      'POST /api/truck-requirements',
      'GET  /api/routes',
      'POST /api/payments',
      'GET  /api/routing/health',
      'POST /api/routing/route',
      'POST /api/routing/validate',
      'GET  /api/routing/test'
    ]
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 FuelRoute Pro Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Status: ${aiService && aiService.isAvailable ? 'Available' : 'Unavailable'}`);
  console.log(`🗺️ Routing Status: ${routingService && routingService.isAvailable ? 'Available' : 'Limited'}`);
  console.log(`🌍 Google Maps: ${process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`🧪 Test routing: http://localhost:${PORT}/api/routing/test`);
});

module.exports = app;