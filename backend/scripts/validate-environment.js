#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 FuelRoute Pro Environment Validation\n');

const validations = [];

function checkEnvironmentVariable(name, required = false, expectedFormat = null) {
  const value = process.env[name];
  const check = {
    name,
    required,
    value: value ? '✅ Set' : '❌ Missing',
    status: 'pass'
  };

  if (required && !value) {
    check.status = 'fail';
    check.message = 'Required environment variable is missing';
  } else if (value && expectedFormat) {
    if (!expectedFormat.test(value)) {
      check.status = 'warning';
      check.message = 'Format may be incorrect';
    }
  }

  if (value && name === 'OPENAI_API_KEY') {
    check.value = value.startsWith('sk-') ? '✅ Format looks correct' : '⚠️ Unexpected format';
  }

  validations.push(check);
  return check;
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  const check = {
    name: description,
    value: exists ? '✅ Exists' : '❌ Missing',
    status: exists ? 'pass' : 'fail',
    path: filePath
  };
  validations.push(check);
  return check;
}

function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  const check = {
    name: 'Node.js Version',
    value: version,
    status: majorVersion >= 16 ? 'pass' : 'fail',
    message: majorVersion >= 16 ? 'Supported version' : 'Requires Node.js 16 or higher'
  };
  validations.push(check);
  return check;
}

// Run validations
console.log('📋 Environment Variables:');
checkEnvironmentVariable('OPENAI_API_KEY', true, /^sk-/);
checkEnvironmentVariable('AI_MODEL', false);
checkEnvironmentVariable('AI_TEMPERATURE', false, /^0\.[0-9]+$/);
checkEnvironmentVariable('MAX_TOKENS', false, /^[0-9]+$/);
checkEnvironmentVariable('MONGODB_URI', false);
checkEnvironmentVariable('PORT', false, /^[0-9]+$/);
checkEnvironmentVariable('FRONTEND_URL', false);

console.log('\n📁 Required Files:');
checkFileExists('.env', '.env configuration file');
checkFileExists('package.json', 'package.json');
checkFileExists('server.js', 'Main server file');
checkFileExists('services/openaiService.js', 'OpenAI Service module');
checkFileExists('controllers/routeController.js', 'Route controller');

console.log('\n🔧 System Requirements:');
checkNodeVersion();

// Check if required npm packages are installed
try {
  require('openai');
  validations.push({
    name: 'OpenAI Package',
    value: '✅ Installed',
    status: 'pass'
  });
} catch (error) {
  validations.push({
    name: 'OpenAI Package',
    value: '❌ Missing',
    status: 'fail',
    message: 'Run: npm install openai'
  });
}

try {
  require('mongoose');
  validations.push({
    name: 'Mongoose Package',
    value: '✅ Installed',
    status: 'pass'
  });
} catch (error) {
  validations.push({
    name: 'Mongoose Package',
    value: '❌ Missing',
    status: 'fail',
    message: 'Run: npm install mongoose'
  });
}

// Check MongoDB connection
console.log('\n🗄️ Database:');
try {
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fuelroute';
  validations.push({
    name: 'MongoDB URI',
    value: mongoUri,
    status: 'info',
    message: 'Connection will be tested at runtime'
  });
} catch (error) {
  validations.push({
    name: 'MongoDB Setup',
    value: '❌ Cannot test',
    status: 'warning',
    message: 'Mongoose not installed'
  });
}

// Create logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    validations.push({
      name: 'Logs Directory',
      value: '✅ Created',
      status: 'pass'
    });
  } catch (error) {
    validations.push({
      name: 'Logs Directory',
      value: '❌ Failed to create',
      status: 'fail',
      message: error.message
    });
  }
} else {
  validations.push({
    name: 'Logs Directory',
    value: '✅ Exists',
    status: 'pass'
  });
}

// Display results
console.log('\n📊 Validation Results:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

let passCount = 0;
let failCount = 0;
let warningCount = 0;

validations.forEach(check => {
  const statusIcon = check.status === 'pass' ? '✅' : 
                    check.status === 'fail' ? '❌' : '⚠️';
  
  console.log(`${statusIcon} ${check.name.padEnd(25)} ${check.value}`);
  if (check.message) {
    console.log(`   ${check.message}`);
  }
  
  if (check.status === 'pass') passCount++;
  else if (check.status === 'fail') failCount++;
  else warningCount++;
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings`);

if (failCount > 0) {
  console.log('\n🚨 Critical Issues Found:');
  validations
    .filter(v => v.status === 'fail')
    .forEach(check => {
      console.log(`   ❌ ${check.name}: ${check.message || 'Failed validation'}`);
    });
  
  console.log('\n💡 Next Steps:');
  console.log('1. Fix the critical issues listed above');
  console.log('2. Run: npm run validate-env');
  console.log('3. Test AI connection: npm run test:ai');
  console.log('4. Start the server: npm run dev');
  
  process.exit(1);
} else {
  console.log('\n🎉 Environment validation passed!');
  console.log('\n🚀 Ready to start:');
  console.log('   npm run dev        # Start development server');
  console.log('   npm run test:ai     # Test AI connection');
  console.log('   npm run test:health # Check server health');
  
  if (warningCount > 0) {
    console.log('\n⚠️  Note: Some warnings were found but they won\'t prevent the system from running.');
  }
}