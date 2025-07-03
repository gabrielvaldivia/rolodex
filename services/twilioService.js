const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send an SMS update to a phone number
 */
async function sendSmsUpdate(toNumber, message) {
  try {
    console.log(`📱 Sending SMS to ${toNumber}: ${message.substring(0, 50)}...`);
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });
    
    console.log(`✅ SMS sent successfully: ${result.sid}`);
    return result;
    
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    
    // Don't throw the error - we don't want SMS failures to break the main process
    // Just log it and continue
    return null;
  }
}

/**
 * Send a welcome message to new users
 */
async function sendWelcomeMessage(toNumber) {
  const welcomeMessage = `👋 Welcome to the SMS-to-Notion lead enrichment bot!

Send me any website, Twitter, or LinkedIn URL and I'll automatically:
• Extract relevant information
• Update your Notion database
• Send you a confirmation

Try sending me a URL now!`;

  return await sendSmsUpdate(toNumber, welcomeMessage);
}

/**
 * Send usage instructions
 */
async function sendHelpMessage(toNumber) {
  const helpMessage = `🤖 SMS-to-Notion Bot Help

Simply text me any URL and I'll process it:
• Website URLs → Extract name, email, social links
• Twitter/X URLs → Get profile info and bio
• LinkedIn URLs → Extract name and title

Examples:
• https://example.com
• https://twitter.com/username
• https://linkedin.com/in/username

I'll automatically update your Notion database and send you a confirmation!`;

  return await sendSmsUpdate(toNumber, helpMessage);
}

/**
 * Send error notification with helpful context
 */
async function sendErrorNotification(toNumber, error, url = null) {
  let errorMessage = `❌ Something went wrong`;
  
  if (url) {
    errorMessage += ` processing ${url}`;
  }
  
  errorMessage += `:\n\n${error.message}`;
  
  // Add helpful suggestions based on error type
  if (error.message.includes('timeout')) {
    errorMessage += `\n\n💡 Tip: The website might be slow to load. Try again in a few minutes.`;
  } else if (error.message.includes('blocked') || error.message.includes('403')) {
    errorMessage += `\n\n💡 Tip: The website might be blocking automated access. Try a different URL.`;
  } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
    errorMessage += `\n\n💡 Tip: Check if the URL is correct and accessible.`;
  }
  
  return await sendSmsUpdate(toNumber, errorMessage);
}

/**
 * Send processing status update
 */
async function sendProcessingUpdate(toNumber, url, status) {
  const statusMessages = {
    'scraping': `🕷️ Scraping data from ${url}...`,
    'updating': `📝 Updating Notion database...`,
    'complete': `✅ Successfully processed ${url}!`
  };
  
  const message = statusMessages[status] || `🔄 Processing ${url}...`;
  return await sendSmsUpdate(toNumber, message);
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(phoneNumber) {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Format phone number for consistent storage/comparison
 */
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters except +
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  
  // Add + if missing
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  return formatted;
}

/**
 * Check Twilio account balance and usage
 */
async function checkTwilioStatus() {
  try {
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    return {
      status: account.status,
      balance: account.balance,
      currency: account.currency
    };
  } catch (error) {
    console.error('Error checking Twilio status:', error);
    return null;
  }
}

module.exports = {
  sendSmsUpdate,
  sendWelcomeMessage,
  sendHelpMessage,
  sendErrorNotification,
  sendProcessingUpdate,
  validatePhoneNumber,
  formatPhoneNumber,
  checkTwilioStatus
};