require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { processUrlMessage } = require('./services/urlProcessor');
const { setupQueue } = require('./services/queueManager');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Initialize queue system
setupQueue();

// Twilio webhook verification middleware
const twilioSignature = twilio.webhook.webhookBodySignature;

// SMS webhook endpoint
app.post('/sms-webhook', (req, res) => {
  console.log('📱 Received SMS:', req.body);
  
  const { From: fromNumber, Body: messageBody } = req.body;
  
  try {
    // Process the message asynchronously
    processUrlMessage(messageBody, fromNumber);
    
    // Send immediate response to user
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('🔍 Got it! Processing your URL now. I\'ll update the database shortly.');
    
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error processing SMS:', error);
    
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('❌ Sorry, something went wrong processing your URL. Please try again.');
    
    res.type('text/xml').send(twiml.toString());
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Status endpoint to check system components
app.get('/status', async (req, res) => {
  try {
    const { getQueueStats } = require('./services/queueManager');
    const stats = await getQueueStats();
    
    res.json({
      server: 'running',
      queue: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 SMS-to-Notion server running on port ${port}`);
  console.log(`📞 Webhook URL: http://your-domain.com/sms-webhook`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});