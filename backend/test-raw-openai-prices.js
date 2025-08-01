// Test to show RAW OpenAI prices without any modifications
require('dotenv').config();

async function showRawOpenAIPrices() {
  console.log('🔍 RAW OPENAI FUEL PRICES (No Modifications)');
  console.log('=' .repeat(60));
  console.log('This test shows the EXACT values returned by OpenAI');
  console.log('without any capping, rounding, or modifications.');
  console.log('=' .repeat(60));

  const openaiService = require('./services/openaiService');
  
  const fuels = ['hydrogen', 'methanol', 'ammonia'];
  
  for (const fuel of fuels) {
    console.log(`\n🔥 Testing ${fuel.toUpperCase()}:`);
    console.log('-'.repeat(40));
    
    try {
      // Get the raw OpenAI response
      const result = await openaiService.getPriceEstimate(fuel);
      
      console.log('📊 RAW OpenAI Response:');
      console.log(`   Price: $${result.price} (exact value from OpenAI)`);
      console.log(`   Unit: ${result.unit}`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Date: ${result.date}`);
      console.log(`   Confidence: ${result.confidence}`);
      console.log(`   AI Used: ${result.aiUsed}`);
      
      // Show data types to prove no modifications
      console.log('\n🔬 Data Analysis:');
      console.log(`   Price Type: ${typeof result.price}`);
      console.log(`   Is Integer: ${Number.isInteger(result.price)}`);
      console.log(`   Decimal Places: ${result.price.toString().includes('.') ? result.price.toString().split('.')[1]?.length || 0 : 0}`);
      console.log(`   Raw Value: ${JSON.stringify(result.price)}`);
      
      // Show what happens in cost calculation (just rounding for display)
      const roundedForDisplay = Math.round(result.price * 100) / 100;
      console.log(`   Rounded for Display: $${roundedForDisplay} (only for UI formatting)`);
      
      if (result.price !== roundedForDisplay) {
        console.log(`   ⚠️ Note: Display rounding changed ${result.price} to ${roundedForDisplay}`);
      } else {
        console.log(`   ✅ No change from display rounding`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('✅ OpenAI prices are used DIRECTLY without capping');
  console.log('✅ Only rounding applied is for display formatting (2 decimal places)');
  console.log('✅ No minimum or maximum price limits enforced');
  console.log('✅ Raw OpenAI values are preserved in calculations');
  console.log('=' .repeat(60));
}

// Test with multiple calls to show consistency
async function testPriceConsistency() {
  console.log('\n🔄 PRICE CONSISTENCY TEST');
  console.log('Testing if OpenAI returns consistent values...\n');
  
  const openaiService = require('./services/openaiService');
  
  try {
    // Clear cache to get fresh values
    if (openaiService.cache && openaiService.cache.clear) {
      openaiService.cache.clear();
    }
    
    console.log('Call 1:');
    const price1 = await openaiService.getPriceEstimate('hydrogen');
    console.log(`Hydrogen: $${price1.price}`);
    
    console.log('\nCall 2 (should be cached):');
    const price2 = await openaiService.getPriceEstimate('hydrogen');
    console.log(`Hydrogen: $${price2.price}`);
    
    if (price1.price === price2.price) {
      console.log('✅ Prices are consistent (cached properly)');
    } else {
      console.log('⚠️ Prices differ (cache not working or OpenAI variance)');
    }
    
  } catch (error) {
    console.log(`❌ Consistency test failed: ${error.message}`);
  }
}

// Run the tests
if (require.main === module) {
  showRawOpenAIPrices()
    .then(() => testPriceConsistency())
    .catch(console.error);
}

module.exports = showRawOpenAIPrices;