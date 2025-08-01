#!/usr/bin/env node

/**
 * Test script for truck requirements calculation
 * Demonstrates the new truck requirements feature
 */

const { calculateTruckRequirements } = require('./controllers/routeController');

console.log('🚛 TRUCK REQUIREMENTS CALCULATOR TEST');
console.log('=====================================\n');

// Test cases
const testCases = [
  { volume: 5, fuelType: 'hydrogen' },
  { volume: 100, fuelType: 'hydrogen' },
  { volume: 50, fuelType: 'methanol' },
  { volume: 100, fuelType: 'methanol' },
  { volume: 75, fuelType: 'ammonia' },
  { volume: 100, fuelType: 'ammonia' },
  { volume: 25, fuelType: 'gasoline' },
  { volume: 150, fuelType: 'diesel' }
];

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.volume} tonnes of ${testCase.fuelType}`);
  console.log('─'.repeat(50));
  
  const requirements = calculateTruckRequirements(testCase.volume, testCase.fuelType);
  
  console.log(`📊 ${requirements.message}`);
  console.log(`⚠️  ${requirements.handlingNote}`);
  
  if (requirements.trucksNeeded > 1) {
    console.log(`📈 Details:`);
    console.log(`   • Total Capacity: ${requirements.totalCapacity} tonnes`);
    console.log(`   • Utilization: ${requirements.utilizationPercent}%`);
    console.log(`   • Excess Capacity: ${requirements.excessCapacity.toFixed(1)} tonnes`);
    console.log(`   • Per Truck: ${requirements.maxCapacity} tonnes max`);
  }
  
  console.log('');
});

console.log('✅ All tests completed!');
console.log('\n🌐 API Endpoint: POST /api/truck-requirements');
console.log('📝 Example request:');
console.log('curl -X POST http://localhost:5001/api/truck-requirements \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"volume": 100, "fuelType": "hydrogen"}\'');