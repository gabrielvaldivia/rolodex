#!/usr/bin/env node

const dotenv = require('dotenv');
const { scrapeUrlData } = require('../services/webScraper');
const { updateNotionDatabase } = require('../services/notionService');

// Load environment variables
dotenv.config();

/**
 * Test URL processing from command line
 */
async function testUrl(url) {
  console.log('🧪 Testing URL processing without SMS...\n');
  console.log(`📋 URL: ${url}`);
  
  try {
    // Step 1: Determine URL type
    const urlType = categorizeUrl(url);
    console.log(`🏷️  URL Type: ${urlType}`);
    
    // Step 2: Scrape the URL
    console.log(`🕷️  Scraping data...`);
    const scrapedData = await scrapeUrlData(url, urlType);
    
    if (!scrapedData) {
      throw new Error('Failed to scrape data from URL');
    }
    
    console.log('📊 Scraped Data:');
    console.log(JSON.stringify(scrapedData, null, 2));
    
    // Step 3: Update Notion (if configured)
    if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
      console.log('\n📝 Updating Notion database...');
      const notionResult = await updateNotionDatabase(scrapedData);
      console.log(`✅ Notion updated! Entry ID: ${notionResult.id}`);
    } else {
      console.log('\n⚠️  Notion not configured - skipping database update');
      console.log('   Set NOTION_API_KEY and NOTION_DATABASE_ID to test Notion integration');
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('\n🔍 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Categorize URL type (copied from urlProcessor)
 */
function categorizeUrl(urlString) {
  const hostname = urlString.toLowerCase();
  
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter';
  } else if (hostname.includes('linkedin.com')) {
    return 'linkedin';
  } else {
    return 'website';
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🧪 URL Processing Test Script

Usage:
  npm run test-url <url>

Examples:
  npm run test-url https://example.com
  npm run test-url https://twitter.com/username
  npm run test-url https://linkedin.com/in/profile

Environment Setup:
  NOTION_API_KEY=secret_xxx        # Required for Notion testing
  NOTION_DATABASE_ID=xxx           # Required for Notion testing
  REDIS_URL=redis://localhost:6379 # Optional (won't use queue in test mode)
`);
    process.exit(1);
  }
  
  const url = args[0];
  
  // Basic URL validation
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('❌ Error: URL must start with http:// or https://');
    process.exit(1);
  }
  
  await testUrl(url);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testUrl };