#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🚀 FuelRoute Pro AI Setup Wizard\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupEnvironment() {
  console.log('This wizard will help you set up your AI-powered FuelRoute Pro backend.\n');
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '..', '.env');
  const envExists = fs.existsSync(envPath);
  
  if (envExists) {
    const overwrite = await askQuestion('🔍 .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('✅ Keeping existing .env file. Run npm run validate-env to check configuration.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Let\'s configure your environment variables:\n');

  // Collect environment variables
  const config = {};

  // OpenAI Configuration
  console.log('🤖 AI Configuration:');
  config.OPENAI_API_KEY = await askQuestion('Enter your OpenAI API key (sk-...): ');
  
  if (!config.OPENAI_API_KEY) {
    console.log('\n❌ OpenAI API key is required for AI functionality.');
    console.log('Get your key at: https://platform.openai.com/api-keys');
    process.exit(1);
  }

  config.AI_MODEL = await askQuestion('AI Model (gpt-4): ') || 'gpt-4';
  config.AI_TEMPERATURE = await askQuestion('AI Temperature (0.1): ') || '0.1';
  config.MAX_TOKENS = await askQuestion('Max Tokens (2000): ') || '2000';

  // Database Configuration
  console.log('\n🗄️ Database Configuration:');
  config.MONGODB_URI = await askQuestion('MongoDB URI (mongodb://localhost:27017/fuelroute): ') || 'mongodb://localhost:27017/fuelroute';

  // Server Configuration
  console.log('\n🌐 Server Configuration:');
  config.PORT = await askQuestion('Server Port (5001): ') || '5001';
  config.FRONTEND_URL = await askQuestion('Frontend URL (http://localhost:3000): ') || 'http://localhost:3000';

  // Optional APIs
  console.log('\n📊 Optional Market Data APIs (press Enter to skip):');
  config.ALPHA_VANTAGE_API_KEY = await askQuestion('Alpha Vantage API Key: ') || '';
  config.COMMODITIES_API_KEY = await askQuestion('Commodities API Key: ') || '';
  config.EXCHANGE_RATE_API_KEY = await askQuestion('Exchange Rate API Key: ') || '';

  // Environment
  config.NODE_ENV = await askQuestion('Environment (development): ') || 'development';

  // Create .env file
  const envContent = Object.entries(config)
    .filter(([key, value]) => value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envTemplate = `# FuelRoute Pro AI Backend Configuration
# Generated on ${new Date().toISOString()}

# Database
MONGODB_URI=${config.MONGODB_URI}

# Server
PORT=${config.PORT}
FRONTEND_URL=${config.FRONTEND_URL}
NODE_ENV=${config.NODE_ENV}

# OpenAI Configuration
OPENAI_API_KEY=${config.OPENAI_API_KEY}
AI_MODEL=${config.AI_MODEL}
AI_TEMPERATURE=${config.AI_TEMPERATURE}
MAX_TOKENS=${config.MAX_TOKENS}

# External Data APIs (optional)
${config.ALPHA_VANTAGE_API_KEY ? `ALPHA_VANTAGE_API_KEY=${config.ALPHA_VANTAGE_API_KEY}` : '# ALPHA_VANTAGE_API_KEY=your_key_here'}
${config.COMMODITIES_API_KEY ? `COMMODITIES_API_KEY=${config.COMMODITIES_API_KEY}` : '# COMMODITIES_API_KEY=your_key_here'}
${config.EXCHANGE_RATE_API_KEY ? `EXCHANGE_RATE_API_KEY=${config.EXCHANGE_RATE_API_KEY}` : '# EXCHANGE_RATE_API_KEY=your_key_here'}
`;

  try {
    fs.writeFileSync(envPath, envTemplate);
    console.log('\n✅ .env file created successfully!');
  } catch (error) {
    console.error('\n❌ Failed to create .env file:', error.message);
    process.exit(1);
  }

  // Create logs directory
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ Logs directory created');
    } catch (error) {
      console.log('⚠️  Could not create logs directory:', error.message);
    }
  }

  console.log('\n🎉 Setup completed successfully!\n');
  console.log('📋 Next Steps:');
  console.log('1. Validate configuration: npm run validate-env');
  console.log('2. Test AI connection: npm run test:ai');
  console.log('3. Start the server: npm run dev');
  console.log('4. Check health: npm run test:health');
  console.log('\n🔗 Useful URLs:');
  console.log(`   Backend: http://localhost:${config.PORT}`);
  console.log(`   Health Check: http://localhost:${config.PORT}/api/health`);
  console.log(`   AI Diagnostics: http://localhost:${config.PORT}/api/ai-diagnostics`);
  console.log(`   Frontend: ${config.FRONTEND_URL}`);

  if (!config.ALPHA_VANTAGE_API_KEY && !config.COMMODITIES_API_KEY) {
    console.log('\n💡 Pro Tip: Add real market data APIs for more accurate pricing:');
    console.log('   - Alpha Vantage: https://www.alphavantage.co/support/#api-key');
    console.log('   - Commodities API: https://commodities-api.com/');
  }

  rl.close();
}

setupEnvironment().catch(console.error);