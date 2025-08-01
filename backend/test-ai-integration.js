// Updated test script for AI integration
require('dotenv').config();

async function testAIIntegration() {
  console.log('🧪 Testing FIXED AI Integration...\n');
  
  // Test 1: OpenAI Service Initialization
  console.log('1. Testing OpenAI Service Initialization...');
  try {
    const openaiService = require('./services/openaiService');
    if (openaiService) {
      console.log('✅ OpenAI service loaded');
      console.log(`   Model: ${openaiService.model}`);
      console.log(`   Available: ${openaiService.isAvailable}`);
    } else {
      console.log('❌ OpenAI service failed to load');
      return;
    }
  } catch (error) {
    console.log('❌ OpenAI service error:', error.message);
    return;
  }
  
  // Test 2: FIXED Health Check
  console.log('\n2. Testing FIXED OpenAI Health Check...');
  try {
    const openaiService = require('./services/openaiService');
    const healthCheck = await openaiService.healthCheck();
    console.log(`✅ Health check: ${healthCheck ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test 3: Fuel Price Estimation
  console.log('\n3. Testing Fuel Price Estimation...');
  try {
    const openaiService = require('./services/openaiService');
    const priceData = await openaiService.getPriceEstimate('hydrogen');
    console.log('✅ Price estimation success:');
    console.log(`   Hydrogen price: $${priceData.price}/tonne`);
    console.log(`   Confidence: ${priceData.confidence}`);
    console.log(`   Source: ${priceData.source}`);
  } catch (error) {
    console.log('❌ Price estimation failed:', error.message);
  }
  
  // Test 4: FIXED Transport Cost Factors
  console.log('\n4. Testing FIXED Transport Cost Factors...');
  try {
    const openaiService = require('./services/openaiService');
    const transportFactors = await openaiService.getTransportCostFactors('truck', 'hydrogen', 500);
    console.log('✅ Transport factors success:');
    console.log(`   Base rate: $${transportFactors.base_rate_per_mile}/mile`);
    console.log(`   Fuel surcharge: ${(transportFactors.fuel_surcharge * 100).toFixed(1)}%`);
    console.log(`   Market conditions: ${transportFactors.market_conditions}`);
    console.log(`   Handling multiplier: ${transportFactors.special_handling_multiplier}`);
  } catch (error) {
    console.log('❌ Transport factors failed:', error.message);
  }
  
  // Test 5: FIXED Location Analysis
  console.log('\n5. Testing FIXED Location Analysis...');
  try {
    const openaiService = require('./services/openaiService');
    const locationData = await openaiService.getLocationCoordinatesWithTransport('Houston, TX', 'truck', 'hydrogen');
    console.log('✅ Location analysis success:');
    console.log(`   Coordinates: [${locationData.lat}, ${locationData.lon}]`);
    console.log(`   Type: ${locationData.type}`);
    console.log(`   Transport suitable: ${locationData.transport_suitable}`);
    console.log(`   Infrastructure score: ${locationData.infrastructure_score}/100`);
    console.log(`   Fuel handling score: ${locationData.fuel_handling_score}/100`);
  } catch (error) {
    console.log('❌ Location analysis failed:', error.message);
  }
  
  // Test 6: Distance Calculation
  console.log('\n6. Testing Distance Calculation...');
  try {
    const openaiService = require('./services/openaiService');
    const distanceData = await openaiService.calculateDistanceWithModeAdjustment('Los Angeles, CA', 'San Francisco, CA', 'truck');
    console.log('✅ Distance calculation success:');
    console.log(`   Distance: ${distanceData.distance_miles} miles`);
    console.log(`   Route type: ${distanceData.route_type}`);
    console.log(`   Notes: ${distanceData.routing_notes}`);
  } catch (error) {
    console.log('❌ Distance calculation failed:', error.message);
  }
  
  // Test 7: FIXED Cost Calculation
  console.log('\n7. Testing FIXED Cost Calculation...');
  try {
    const { calculateCost } = require('./controllers/routeController');
    
    // Mock request object
    const mockReq = {
      body: {
        fuelType: 'hydrogen',
        volume: 5,
        origin: 'Los Angeles, CA',
        destination: 'San Francisco, CA',
        transportMode1: 'truck',
        requestType: 'options'
      }
    };
    
    // Mock response object
    let responseData = null;
    const mockRes = {
      json: (data) => { responseData = data; },
      status: (code) => ({ json: (data) => { responseData = { statusCode: code, ...data }; } }),
      headersSent: false
    };
    
    console.log('   Testing route calculation...');
    await calculateCost(mockReq, mockRes);
    
    if (responseData && responseData.success) {
      console.log('✅ Cost calculation success:');
      console.log(`   Generated ${responseData.routeOptions?.length || 0} route options`);
      console.log(`   AI Enhanced: ${responseData.aiEnhanced ? 'Yes' : 'No'}`);
      if (responseData.routeOptions && responseData.routeOptions.length > 0) {
        const firstOption = responseData.routeOptions[0];
        console.log(`   First option: ${firstOption.name} - $${firstOption.estimatedCost}`);
        console.log(`   AI Enhanced option: ${firstOption.aiEnhanced ? 'Yes' : 'No'}`);
      }
    } else {
      console.log('❌ Cost calculation failed:', responseData);
    }
  } catch (error) {
    console.log('❌ Cost calculation test failed:', error.message);
  }
  
  console.log('\n🏁 FIXED AI Integration Test Complete!');
  console.log('\n📋 Summary:');
  console.log('- Health check should now pass');
  console.log('- Transport factors should return valid data or fallbacks');
  console.log('- Cost calculations should handle errors gracefully');
  console.log('- Frontend should render without object errors');
  
  console.log('\n🚀 If all tests passed, your FIXED AI integration is working correctly!');
}

// Run the test
testAIIntegration().catch(console.error);