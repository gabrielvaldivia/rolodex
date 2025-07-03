#!/usr/bin/env node

const dotenv = require('dotenv');
const { validateDatabaseSchema } = require('../services/notionService');
const { checkTwilioStatus } = require('../services/twilioService');
const Queue = require('bull');

// Load environment variables
dotenv.config();

/**
 * Setup and validation script for SMS-to-Notion system
 */
async function runSetup() {
  console.log('🚀 SMS-to-Notion Setup & Validation Script\n');
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Notion Database', fn: checkNotionConnection },
    { name: 'Twilio Account', fn: checkTwilioConnection },
    { name: 'Redis Connection', fn: checkRedisConnection }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      console.log(`🔍 Checking ${check.name}...`);
      await check.fn();
      console.log(`✅ ${check.name} - OK\n`);
    } catch (error) {
      console.log(`❌ ${check.name} - FAILED`);
      console.log(`   Error: ${error.message}\n`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your system is ready to go.');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy your server to a hosting platform');
    console.log('2. Configure Twilio webhook with your server URL');
    console.log('3. Test by sending a URL to your Twilio number');
  } else {
    console.log('💥 Some checks failed. Please fix the issues above and run again.');
    process.exit(1);
  }
}

/**
 * Check that all required environment variables are set
 */
function checkEnvironmentVariables() {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN', 
    'TWILIO_PHONE_NUMBER',
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID',
    'REDIS_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  // Validate phone number format
  if (!process.env.TWILIO_PHONE_NUMBER.startsWith('+')) {
    throw new Error('TWILIO_PHONE_NUMBER must include country code with + prefix');
  }
  
  console.log('   All required environment variables are set');
}

/**
 * Test Notion API connection and database schema
 */
async function checkNotionConnection() {
  try {
    const schemaValidation = await validateDatabaseSchema();
    
    if (!schemaValidation.valid) {
      console.log(`   ⚠️  Missing database properties: ${schemaValidation.missingProperties.join(', ')}`);
      console.log(`   📋 Available properties: ${schemaValidation.availableProperties.join(', ')}`);
      
      if (schemaValidation.missingProperties.length > 3) {
        throw new Error('Too many missing properties. Please check your database schema.');
      } else {
        console.log('   ✨ Minor schema issues detected but system should work');
      }
    } else {
      console.log('   Database schema is correctly configured');
    }
  } catch (error) {
    if (error.code === 'object_not_found') {
      throw new Error('Database not found. Check your NOTION_DATABASE_ID or ensure the integration has access.');
    } else if (error.code === 'unauthorized') {
      throw new Error('Unauthorized. Check your NOTION_API_KEY or ensure the integration has access to the database.');
    } else {
      throw error;
    }
  }
}

/**
 * Test Twilio API connection
 */
async function checkTwilioConnection() {
  try {
    const status = await checkTwilioStatus();
    
    if (!status) {
      throw new Error('Could not connect to Twilio API');
    }
    
    console.log(`   Account Status: ${status.status}`);
    console.log(`   Balance: ${status.balance} ${status.currency}`);
    
    if (status.status !== 'active') {
      throw new Error(`Twilio account status is ${status.status}. Expected 'active'.`);
    }
    
    if (parseFloat(status.balance) < 1) {
      console.log('   ⚠️  Low balance detected. Consider adding funds to avoid service interruption.');
    }
    
  } catch (error) {
    if (error.code === 20003) {
      throw new Error('Invalid Twilio credentials. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    } else {
      throw error;
    }
  }
}

/**
 * Test Redis connection
 */
async function checkRedisConnection() {
  let testQueue;
  
  try {
    testQueue = new Queue('setup-test', process.env.REDIS_URL);
    
    // Test basic queue operations
    const job = await testQueue.add('test', { message: 'setup test' });
    await job.finished();
    
    console.log('   Redis connection successful');
    console.log('   Queue system operational');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Could not connect to Redis. Check your REDIS_URL or ensure Redis is running.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Redis host not found. Check your REDIS_URL.');
    } else {
      throw error;
    }
  } finally {
    if (testQueue) {
      await testQueue.close();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  runSetup().catch(console.error);
}

module.exports = { runSetup };