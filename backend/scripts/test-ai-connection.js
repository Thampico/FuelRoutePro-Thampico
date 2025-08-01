#!/usr/bin/env node

const OpenAI = require('openai');
require('dotenv').config();

console.log('🧪 Testing AI Connection...\n');

async function testAIConnection() {
  // Check environment variables
  console.log('🔍 Checking Environment Variables:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   AI_MODEL: ${process.env.AI_MODEL || 'gpt-4 (default)'}`);
  console.log(`   AI_TEMPERATURE: ${process.env.AI_TEMPERATURE || '0.1 (default)'}`);
  console.log('');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in environment variables');
    console.log('💡 Add your OpenAI API key to the .env file:');
    console.log('   OPENAI_API_KEY=sk-your-key-here');
    process.exit(1);
  }

  // Test OpenAI connection
  try {
    console.log('🤖 Testing OpenAI API Connection...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const testResponse = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a test assistant. Respond with "Connection successful" and nothing else.'
        },
        {
          role: 'user',
          content: 'Test connection'
        }
      ],
      max_tokens: 10,
      temperature: 0
    });

    console.log('✅ OpenAI API Connection: SUCCESS');
    console.log(`📝 Response: ${testResponse.choices[0].message.content}`);
    console.log(`🔧 Model used: ${testResponse.model}`);
    console.log(`⚡ Tokens used: ${testResponse.usage.total_tokens}`);
    console.log('');

    // Test a fuel calculation prompt
    console.log('🧪 Testing Fuel Calculation Prompt...');
    
    const calculationTest = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a fuel transportation cost calculator. Respond with a simple JSON object containing a test cost calculation.'
        },
        {
          role: 'user',
          content: 'Calculate the cost to transport 10 tonnes of hydrogen from LAX to Taipei via truck.'
        }
      ],
      max_tokens: 200,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.1,
      response_format: { type: "json_object" }
    });

    console.log('✅ Calculation Prompt: SUCCESS');
    console.log('📊 Sample Response:', calculationTest.choices[0].message.content);
    console.log('');

    // Performance metrics
    console.log('📈 Performance Metrics:');
    console.log(`   Total tokens used: ${testResponse.usage.total_tokens + calculationTest.usage.total_tokens}`);
    console.log(`   Estimated cost: ~$${((testResponse.usage.total_tokens + calculationTest.usage.total_tokens) * 0.00003).toFixed(4)}`);
    console.log('');

    console.log('🎉 All AI tests passed! Your system is ready for AI-powered calculations.');
    
  } catch (error) {
    console.error('❌ AI Connection Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code === 'invalid_api_key') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check that your API key is correct');
      console.log('   - Ensure you have credits in your OpenAI account');
      console.log('   - Verify the API key has not expired');
    } else if (error.code === 'model_not_found') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check that the model name is correct');
      console.log('   - Ensure you have access to the specified model');
      console.log('   - Try using "gpt-3.5-turbo" instead');
    }
    
    process.exit(1);
  }
}

testAIConnection().catch(console.error);