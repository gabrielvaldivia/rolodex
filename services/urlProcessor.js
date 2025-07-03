const URL = require('url-parse');
const { addToQueue } = require('./queueManager');
const { sendSmsUpdate } = require('./twilioService');

/**
 * Extract URLs from SMS message body
 */
function extractUrls(messageBody) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = messageBody.match(urlRegex) || [];
  return urls.map(url => url.replace(/[.,!?;]$/, '')); // Remove trailing punctuation
}

/**
 * Determine the type of URL (website, twitter, linkedin)
 */
function categorizeUrl(urlString) {
  const url = new URL(urlString);
  const hostname = url.hostname.toLowerCase();
  
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter';
  } else if (hostname.includes('linkedin.com')) {
    return 'linkedin';
  } else {
    return 'website';
  }
}

/**
 * Process incoming SMS message containing URLs
 */
async function processUrlMessage(messageBody, fromNumber) {
  console.log(`📝 Processing message from ${fromNumber}: ${messageBody}`);
  
  try {
    const urls = extractUrls(messageBody);
    
    if (urls.length === 0) {
      await sendSmsUpdate(fromNumber, '🤔 I didn\'t find any URLs in your message. Please send a website, Twitter, or LinkedIn URL.');
      return;
    }
    
    console.log(`🔍 Found ${urls.length} URL(s):`, urls);
    
    // Process each URL
    for (const url of urls) {
      const urlType = categorizeUrl(url);
      console.log(`📊 URL ${url} categorized as: ${urlType}`);
      
      // Add to processing queue
      await addToQueue('process-url', {
        url,
        urlType,
        fromNumber,
        timestamp: new Date().toISOString()
      });
      
      console.log(`⏳ Added ${url} to processing queue`);
    }
    
    // Send confirmation
    const message = urls.length === 1 
      ? `✅ Added ${urls[0]} to processing queue!`
      : `✅ Added ${urls.length} URLs to processing queue!`;
      
    // Don't await this - let it happen in background
    sendSmsUpdate(fromNumber, message).catch(console.error);
    
  } catch (error) {
    console.error('Error in processUrlMessage:', error);
    await sendSmsUpdate(fromNumber, '❌ Error processing your message. Please try again.');
  }
}

module.exports = {
  processUrlMessage,
  extractUrls,
  categorizeUrl
};