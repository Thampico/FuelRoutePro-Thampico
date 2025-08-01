// Test fuel price accuracy against current US market values
require('dotenv').config();

async function testFuelPriceAccuracy() {
  console.log('💰 FUEL PRICE ACCURACY TEST');
  console.log('=' .repeat(60));
  console.log('Comparing OpenAI prices vs Current US Market Values');
  console.log('=' .repeat(60));

  const openaiService = require('./services/openaiService');
  
  // Current US market prices (as of 2024-2025)
  const marketPrices = {
    hydrogen: { price: 3865, source: 'IMARC Group Q2 2025' },
    methanol: { price: 750, source: 'Methanex/IMARC 2024-2025' },
    ammonia: { price: 510, source: 'IMARC March 2025' }
  };

  const results = [];

  console.log('\n📊 CURRENT US MARKET REFERENCE PRICES:');
  console.log('- Hydrogen: $3,865/MT (Industrial grade, Q2 2025)');
  console.log('- Methanol: $750/MT (Wholesale, 2024-2025 avg)');
  console.log('- Ammonia: $510/MT (Industrial grade, March 2025)');
  console.log('\n' + '-'.repeat(60));

  for (const [fuel, marketData] of Object.entries(marketPrices)) {
    console.log(`\n🔍 Testing ${fuel.toUpperCase()} pricing...`);
    
    try {
      const result = await openaiService.getPriceEstimate(fuel);
      const marketPrice = marketData.price;
      const openaiPrice = result.price;
      const difference = Math.abs(openaiPrice - marketPrice);
      const accuracyPercent = (difference / marketPrice) * 100;
      
      console.log(`   OpenAI Price: $${openaiPrice}/MT`);
      console.log(`   Market Price: $${marketPrice}/MT (${marketData.source})`);
      console.log(`   Difference: $${difference}/MT (${accuracyPercent.toFixed(1)}%)`);
      
      let status, grade;
      if (accuracyPercent <= 5) {
        status = '🎯 EXCELLENT';
        grade = 'A+';
      } else if (accuracyPercent <= 10) {
        status = '✅ VERY GOOD';
        grade = 'A';
      } else if (accuracyPercent <= 15) {
        status = '✅ GOOD';
        grade = 'B+';
      } else if (accuracyPercent <= 25) {
        status = '⚠️ ACCEPTABLE';
        grade = 'B';
      } else {
        status = '❌ NEEDS IMPROVEMENT';
        grade = 'C';
      }
      
      console.log(`   Accuracy: ${status} (${grade} grade)`);
      console.log(`   AI Enhanced: ${result.aiUsed ? 'Yes' : 'No'}`);
      console.log(`   Confidence: ${result.confidence}`);
      
      results.push({
        fuel,
        openaiPrice,
        marketPrice,
        accuracyPercent: accuracyPercent.toFixed(1),
        status,
        grade,
        aiUsed: result.aiUsed
      });
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        fuel,
        error: error.message,
        status: '❌ FAILED',
        grade: 'F'
      });
    }
  }

  // Summary Report
  console.log('\n' + '='.repeat(60));
  console.log('📈 FUEL PRICE ACCURACY SUMMARY REPORT');
  console.log('='.repeat(60));
  
  const validResults = results.filter(r => !r.error);
  const avgAccuracy = validResults.reduce((sum, r) => sum + parseFloat(r.accuracyPercent), 0) / validResults.length;
  
  console.log(`\nOverall Performance: ${avgAccuracy.toFixed(1)}% average deviation`);
  console.log(`Tests Completed: ${validResults.length}/${results.length}`);
  console.log(`AI Enhanced: ${validResults.filter(r => r.aiUsed).length}/${validResults.length}`);
  
  console.log('\nDetailed Results:');
  results.forEach(result => {
    if (result.error) {
      console.log(`${result.fuel.toUpperCase()}: ${result.status} - ${result.error}`);
    } else {
      console.log(`${result.fuel.toUpperCase()}: ${result.status} - $${result.openaiPrice}/MT (${result.accuracyPercent}% off)`);
    }
  });
  
  // Grade Assessment
  const grades = validResults.map(r => r.grade);
  const excellentCount = grades.filter(g => g === 'A+').length;
  const goodCount = grades.filter(g => g.startsWith('A') || g.startsWith('B')).length;
  
  console.log('\n🏆 OVERALL ASSESSMENT:');
  if (excellentCount === validResults.length) {
    console.log('🎯 OUTSTANDING - All fuel prices are highly accurate!');
  } else if (goodCount === validResults.length) {
    console.log('✅ EXCELLENT - All fuel prices are within acceptable range!');
  } else if (avgAccuracy <= 20) {
    console.log('✅ GOOD - Most fuel prices are reasonably accurate');
  } else {
    console.log('⚠️ NEEDS IMPROVEMENT - Some fuel prices need better calibration');
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (avgAccuracy <= 10) {
    console.log('✅ Current OpenAI pricing is production-ready');
    console.log('✅ Prices reflect current US market conditions');
    console.log('✅ No immediate adjustments needed');
  } else {
    console.log('🔧 Consider refining OpenAI prompts for better accuracy');
    console.log('🔧 Monitor market price changes and update prompts accordingly');
    console.log('🔧 Consider adding market data sources for validation');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return avgAccuracy <= 15; // Return true if overall accuracy is good
}

// Run the test
if (require.main === module) {
  testFuelPriceAccuracy()
    .then((passed) => {
      console.log(`\n${passed ? '✅ FUEL PRICE ACCURACY TEST PASSED' : '❌ FUEL PRICE ACCURACY TEST FAILED'}`);
      process.exit(passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Test crashed:', error);
      process.exit(1);
    });
}

module.exports = testFuelPriceAccuracy;