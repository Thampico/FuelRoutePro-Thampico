// Comprehensive test for all fixes
require('dotenv').config();

async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE PRESSURE TEST - All Fixes\n');
  console.log('=' .repeat(60));
  
  const testResults = {
    openai_pricing: false,
    openai_transport: false,
    openai_location: false,
    distance_accuracy: false,
    time_estimation: false,
    no_fallback_usage: false,
    route_calculation: false
  };

  // Test 1: OpenAI Real-time Fuel Pricing
  console.log('\n1. 🔥 TESTING REAL-TIME FUEL PRICING (No Fallback)');
  console.log('-'.repeat(50));
  
  try {
    const openaiService = require('./services/openaiService');
    
    const fuelTypes = ['hydrogen', 'methanol', 'ammonia'];
    for (const fuel of fuelTypes) {
      console.log(`\n  Testing ${fuel} pricing...`);
      
      const priceData = await openaiService.getPriceEstimate(fuel);
      
      if (priceData.price > 0 && priceData.aiUsed) {
        console.log(`  ✅ ${fuel}: $${priceData.price}/tonne (${priceData.confidence} confidence)`);
        console.log(`     Source: ${priceData.source}`);
        testResults.openai_pricing = true;
      } else {
        console.log(`  ❌ ${fuel}: Invalid price or fallback used`);
        testResults.openai_pricing = false;
        break;
      }
    }
  } catch (error) {
    console.log(`  ❌ Fuel pricing test failed: ${error.message}`);
  }

  // Test 2: OpenAI Transport Cost Factors
  console.log('\n\n2. 🚛 TESTING TRANSPORT COST FACTORS');
  console.log('-'.repeat(50));
  
  try {
    const openaiService = require('./services/openaiService');
    
    const testCases = [
      { mode: 'truck', fuel: 'hydrogen', distance: 500 },
      { mode: 'truck', fuel: 'methanol', distance: 1000 },
      { mode: 'rail', fuel: 'ammonia', distance: 1500 }
    ];
    
    for (const test of testCases) {
      console.log(`\n  Testing ${test.mode} + ${test.fuel} (${test.distance} miles)...`);
      
      const factors = await openaiService.getTransportCostFactors(test.mode, test.fuel, test.distance);
      
      if (factors.base_rate_per_mile > 0 && factors.aiUsed) {
        console.log(`  ✅ Base rate: $${factors.base_rate_per_mile}/mile`);
        console.log(`     Fuel surcharge: ${(factors.fuel_surcharge * 100).toFixed(1)}%`);
        console.log(`     Market: ${factors.market_conditions}`);
        testResults.openai_transport = true;
      } else {
        console.log(`  ❌ Invalid transport factors or fallback used`);
        testResults.openai_transport = false;
        break;
      }
    }
  } catch (error) {
    console.log(`  ❌ Transport factors test failed: ${error.message}`);
  }

  // Test 3: OpenAI Location Analysis
  console.log('\n\n3. 📍 TESTING LOCATION ANALYSIS');
  console.log('-'.repeat(50));
  
  try {
    const openaiService = require('./services/openaiService');
    
    const locations = ['Houston, TX', 'Los Angeles, CA', 'Chicago, IL'];
    
    for (const location of locations) {
      console.log(`\n  Testing ${location}...`);
      
      const locationData = await openaiService.getLocationCoordinatesWithTransport(location, 'truck', 'hydrogen');
      
      if (locationData.lat && locationData.lon && locationData.aiUsed) {
        console.log(`  ✅ Coordinates: [${locationData.lat}, ${locationData.lon}]`);
        console.log(`     Infrastructure: ${locationData.infrastructure_score}/100`);
        console.log(`     Fuel handling: ${locationData.fuel_handling_score}/100`);
        testResults.openai_location = true;
      } else {
        console.log(`  ❌ Invalid location data or fallback used`);
        testResults.openai_location = false;
        break;
      }
    }
  } catch (error) {
    console.log(`  ❌ Location analysis test failed: ${error.message}`);
  }

  // Test 4: Distance Accuracy (Google Maps vs Fixed Matrix)
  console.log('\n\n4. 📏 TESTING DISTANCE ACCURACY');
  console.log('-'.repeat(50));
  
  try {
    const routingService = require('./services/routingService');
    
    const testRoutes = [
      { origin: 'Los Angeles, CA', destination: 'San Francisco, CA', mode: 'truck' },
      { origin: 'Houston, TX', destination: 'New Orleans, LA', mode: 'truck' },
      { origin: 'Chicago, IL', destination: 'St. Louis, MO', mode: 'rail' }
    ];
    
    for (const route of testRoutes) {
      console.log(`\n  Testing ${route.origin} → ${route.destination} (${route.mode})...`);
      
      const routeData = await routingService.getRoute(route.origin, route.destination, route.mode, 'methanol');
      
      if (routeData.distance_miles > 0) {
        console.log(`  ✅ Distance: ${routeData.distance_miles} miles`);
        console.log(`     Method: ${routeData.routing_method}`);
        console.log(`     Route type: ${routeData.route_type}`);
        
        // Check if using Google Maps for truck routes
        if (route.mode === 'truck' && routeData.routing_method === 'google_maps_directions') {
          testResults.distance_accuracy = true;
        } else if (route.mode === 'rail' && routeData.routing_method === 'distance_matrix') {
          testResults.distance_accuracy = true;
        }
      } else {
        console.log(`  ❌ Invalid distance: ${routeData.distance_miles}`);
      }
    }
  } catch (error) {
    console.log(`  ❌ Distance accuracy test failed: ${error.message}`);
  }

  // Test 5: Time Estimation Accuracy
  console.log('\n\n5. ⏱️ TESTING TIME ESTIMATION ACCURACY');
  console.log('-'.repeat(50));
  
  try {
    const routingService = require('./services/routingService');
    
    const timeTests = [
      { origin: 'Los Angeles, CA', destination: 'San Francisco, CA', mode: 'truck', expectedRange: [5, 8] },
      { origin: 'Houston, TX', destination: 'Chicago, IL', mode: 'truck', expectedRange: [15, 20] },
      { origin: 'Houston, TX', destination: 'New Orleans, LA', mode: 'rail', expectedRange: [8, 12] },
      { origin: 'Chicago, IL', destination: 'New York/NJ', mode: 'rail', expectedRange: [15, 25] }
    ];
    
    let timeTestsPassed = 0;
    
    for (const test of timeTests) {
      console.log(`\n  Testing ${test.origin} → ${test.destination} (${test.mode})...`);
      
      const routeData = await routingService.getRoute(test.origin, test.destination, test.mode, 'methanol');
      const actualTime = routeData.duration_hours;
      const [minTime, maxTime] = test.expectedRange;
      
      if (actualTime >= minTime && actualTime <= maxTime) {
        console.log(`  ✅ Time: ${actualTime} hours (expected: ${minTime}-${maxTime}h)`);
        timeTestsPassed++;
      } else {
        console.log(`  ❌ Time: ${actualTime} hours (expected: ${minTime}-${maxTime}h) - OUT OF RANGE`);
      }
    }
    
    testResults.time_estimation = timeTestsPassed === timeTests.length;
  } catch (error) {
    console.log(`  ❌ Time estimation test failed: ${error.message}`);
  }

  // Test 6: No Fallback Usage When OpenAI Available
  console.log('\n\n6. 🚫 TESTING NO FALLBACK USAGE');
  console.log('-'.repeat(50));
  
  try {
    const { calculateCost } = require('./controllers/routeController');
    
    const mockReq = {
      body: {
        fuelType: 'hydrogen',
        volume: 10,
        origin: 'Houston, TX',
        destination: 'Los Angeles, CA',
        transportMode1: 'truck',
        requestType: 'options'
      }
    };
    
    let responseData = null;
    const mockRes = {
      json: (data) => { responseData = data; },
      status: (code) => ({ json: (data) => { responseData = { statusCode: code, ...data }; } })
    };
    
    console.log('  Testing full route calculation with OpenAI...');
    await calculateCost(mockReq, mockRes);
    
    if (responseData && responseData.success && responseData.aiEnhanced) {
      console.log('  ✅ Route calculation used OpenAI successfully');
      console.log(`     Generated ${responseData.routeOptions?.length || 0} AI-enhanced options`);
      
      // Check if any route option used AI
      const aiEnhancedRoutes = responseData.routeOptions?.filter(route => route.aiEnhanced) || [];
      if (aiEnhancedRoutes.length > 0) {
        console.log(`     ${aiEnhancedRoutes.length} routes are AI-enhanced`);
        testResults.no_fallback_usage = true;
        testResults.route_calculation = true;
      } else {
        console.log('  ❌ No AI-enhanced routes found');
      }
    } else {
      console.log('  ❌ Route calculation failed or used fallback');
      console.log('     Response:', responseData);
    }
  } catch (error) {
    console.log(`  ❌ Route calculation test failed: ${error.message}`);
  }

  // Test Results Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(result => result).length;
  
  console.log(`\nOverall Score: ${passedTests}/${totalTests} tests passed\n`);
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/_/g, ' ').toUpperCase();
    console.log(`${status} - ${testName}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! System is working correctly.');
    console.log('\n✅ Key Achievements:');
    console.log('   • Real-time fuel pricing from OpenAI');
    console.log('   • Accurate distance measurement via Google Maps');
    console.log('   • Realistic time estimation');
    console.log('   • No fallback usage when OpenAI is available');
    console.log('   • Comprehensive AI-enhanced route calculation');
  } else {
    console.log(`\n⚠️ ${totalTests - passedTests} tests failed. Please review the issues above.`);
  }
  
  console.log('\n' + '='.repeat(60));
  return testResults;
}

// Run the comprehensive test
if (require.main === module) {
  runComprehensiveTests()
    .then((results) => {
      const allPassed = Object.values(results).every(result => result);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = runComprehensiveTests;