//backend/models/Route.js

const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  fuelType: {
    type: String,
    required: true,
    enum: ['hydrogen', 'methanol', 'ammonia']
  },
  volume: {
    type: Number,
    required: true,
    min: 0
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  intermediateHub: {
    type: String,
    default: null
  },
  transportMode1: {
    type: String,
    required: true,
    enum: ['truck', 'rail']
  },
  transportMode2: {
    type: String,
    enum: ['truck', 'rail'],
    default: null
  },
  calculatedCost: {
    type: Number,
    required: true
  },
  baseCost: {
    type: Number,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  costBreakdown: {
    // ✅ NEW: Commodity costs
    commodityCost: { type: Number, default: 0 },
    commodityPricePerTonne: { type: Number, default: 0 },
    
    // Existing transport costs
    fuelHandlingFee: { type: Number, default: 0 },
    terminalFees: { type: Number, default: 0 },
    hubTransferFee: { type: Number, default: 0 },
    insuranceCost: { type: Number, default: 0 },
    carbonOffset: { type: Number, default: 0 }
  },
  // ✅ NEW: Cost summary breakdown
  costSummary: {
    transportCosts: { type: Number, default: 0 },
    commodityCosts: { type: Number, default: 0 },
    totalCosts: { type: Number, default: 0 }
  },
  aiEnhanced: {
    type: Boolean,
    default: false
  },
  marketInsights: {
    trend: { type: String, default: 'stable' },
    recommendation: { type: String, default: 'Standard calculation applied' }
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
routeSchema.index({ timestamp: -1 });
routeSchema.index({ fuelType: 1 });
routeSchema.index({ origin: 1, destination: 1 });

module.exports = mongoose.model('Route', routeSchema);
