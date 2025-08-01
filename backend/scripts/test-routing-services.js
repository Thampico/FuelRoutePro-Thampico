// backend/scripts/test-routing-services.js
require('dotenv').config();
const routingService = require('../services/routingService');

async function testRoutingServices() {
  console.log('🧪 Testing Routing Services...\n');

  const testRoutes = [
    { origin: 'Houston, TX', destination: 'New Orleans, LA', modes: ['truck', 'rail'] },
    { origin: 'Los Angeles, CA', destination: 'San Francisco, CA', modes: ['truck', 'rail'] },
    { origin: 'New York/NJ', destination: 'Philadelphia, PA', modes: ['truck', 'rail'] },
    { origin: 'Chicago, IL', destination: 'St. Louis, MO', modes: ['truck', 'rail'] }
  ];

  const fuelTypes = ['hydrogen', 'methanol', 'ammonia'];

  for (const testRoute of testRoutes) {
    console.log(`\n🗺️ Testing route: ${testRoute.origin} → ${testRoute.destination}`);
    console.log('='.repeat(60));

    for (const fuelType of fuelTypes) {
      console.log(`\n⛽ Testing with ${fuelType}:`);

      for (const mode of testRoute.modes) {
        try {
          console.log(`\n  🚗 ${mode.toUpperCase()} Mode:`);
          
          const startTime = Date.now();
          const route = await routingService.getRoute(
            testRoute.origin, 
            testRoute.destination, 
            mode, 
            fuelType
          );
          const duration = Date.now() - startTime;

          console.log(`    ✅ Success (${duration}ms)`);
          console.log(`    📏 Distance: ${route.distance_miles} miles`);
          console.log(`    ⏱️  Duration: ${route.duration_hours} hours`);
          console.log(`    🛣️  Route Type: ${route.route_type}`);
          console.log(`    🔧 Method: ${route.routing_method}`);

          if (route.fallback) {
            console.log(`    ⚠️  FALLBACK: ${route.fallback_reason}`);
          }

          if (route.route_path && route.route_path.length > 2) {
            console.log(`    🛤️  Path: ${route.route_path.join(' → ')}`);
          }

        } catch (error) {
          console.log(`    ❌ Failed: ${error.message}`);
        }
      }
    }
  }

  // Test route options (comprehensive)
  console.log('\n\n🎯 Testing Comprehensive Route Options...');
  console.log('='.repeat(60));

  try {
    const routeOptions = await routingService.getRouteOptions(
      'Houston, TX',
      'Chicago, IL',
      'methanol',
      ['truck', 'rail']
    );

    console.log(`✅ Found ${routeOptions.routes.length} route options:`);
    
    routeOptions.routes.forEach((route, index) => {
      console.log(`\n  ${index + 1}. ${route.mode.toUpperCase()}: ${route.distance_miles} miles, ${route.duration_hours}h`);
      console.log(`     Feasibility: ${(route.feasible * 100).toFixed(1)}%`);
      console.log(`     Method: ${route.routing_method}`);
      if (route.fallback) {
        console.log(`     ⚠️  Fallback: ${route.fallback_reason}`);
      }
    });

    if (routeOptions.best_option) {
      console.log(`\n🏆 Best Option: ${routeOptions.best_option.mode} (${routeOptions.best_option.distance_miles} miles)`);
    }

  } catch (error) {
    console.log(`❌ Route options test failed: ${error.message}`);
  }

  // Test multi-modal routing
  console.log('\n\n🔄 Testing Multi-Modal Routing...');
  console.log('='.repeat(60));

  try {
    const multiModalRoute = await routingService.getMultiModalRoute(
      'Los Angeles, CA',
      'Chicago, IL',
      'New York/NJ',
      'truck',
      'rail',
      'methanol'
    );

    console.log('✅ Multi-modal route calculated:');
    console.log(`   Total Distance: ${multiModalRoute.total_distance_miles} miles`);
    console.log(`   Total Duration: ${multiModalRoute.total_duration_hours} hours`);
    console.log(`   Modes: ${multiModalRoute.transport_modes.join(' → ')}`);
    console.log(`   Efficiency Score: ${multiModalRoute.efficiency_score}`);

    multiModalRoute.legs.forEach((leg, index) => {
      console.log(`\n   Leg ${leg.leg}: ${leg.mode}`);
      console.log(`     Distance: ${leg.distance_miles} miles`);
      console.log(`     Duration: ${leg.duration_hours} hours`);
      console.log(`     Method: ${leg.routing_method}`);
    });

  } catch (error) {
    console.log(`❌ Multi-modal test failed: ${error.message}`);
  }

  // Test location validation
  console.log('\n\n📍 Testing Location Validation...');
  console.log('='.repeat(60));

  const testLocations = [
    { location: 'Houston, TX', modes: ['truck', 'rail'] },
    { location: 'Denver, CO', modes: ['truck', 'rail'] },
    { location: 'Invalid Location', modes: ['truck'] }
  ];

  for (const test of testLocations) {
    console.log(`\n📍 Testing: ${test.location}`);
    
    for (const mode of test.modes) {
      try {
        const validation = await routingService.validateLocation(test.location, mode, 'methanol');
        
        console.log(`  ${mode}: ${validation.valid ? '✅' : '❌'} - ${validation.reason}`);
        
        if (validation.nearby_ports && validation.nearby_ports.length > 0) {
          console.log(`    Nearby ports: ${validation.nearby_ports.join(', ')}`);
        }
        
        if (validation.terminals && validation.terminals.length > 0) {
          console.log(`    Terminals: ${validation.terminals.slice(0, 2).join(', ')}`);
        }

      } catch (error) {
        console.log(`  ${mode}: ❌ Validation error: ${error.message}`);
      }
    }
  }

  // Health check
  console.log('\n\n🏥 Testing Health Check...');
  console.log('='.repeat(60));

  try {
    const health = await routingService.healthCheck();
    
    console.log(`Overall Status: ${health.overall ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log('\nService Status:');
    
    Object.entries(health.services).forEach(([service, status]) => {
      console.log(`  ${service}: ${status ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }

  console.log('\n\n🎉 Routing Services Test Complete!');
}

// Run tests
if (require.main === module) {
  testRoutingServices()
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = testRoutingServices;