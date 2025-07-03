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

// Test endpoint to process URLs without SMS
app.post('/test-url', async (req, res) => {
  const { url, testPhone } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  console.log('🧪 Test endpoint - processing URL:', url);
  
  try {
    // Use test phone number or default
    const fromNumber = testPhone || '+15551234567';
    
    // Process the URL (same as SMS processing)
    await processUrlMessage(url, fromNumber);
    
    res.json({ 
      success: true, 
      message: 'URL processing started',
      url: url,
      testMode: true
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple test form (for browser testing)
app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SMS-to-Notion Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .form-group { margin: 15px 0; }
        input, button { padding: 10px; font-size: 16px; }
        input[type="url"] { width: 400px; }
        button { background: #007bff; color: white; border: none; cursor: pointer; }
        button:hover { background: #0056b3; }
        .results { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>🧪 SMS-to-Notion Test Interface</h1>
      <p>Test your URL processing without SMS!</p>
      
      <form id="testForm">
        <div class="form-group">
          <label for="url">URL to Process:</label><br>
          <input type="url" id="url" name="url" placeholder="https://example.com" required>
        </div>
        
        <div class="form-group">
          <label for="testPhone">Test Phone (optional):</label><br>
          <input type="tel" id="testPhone" name="testPhone" placeholder="+15551234567">
        </div>
        
        <button type="submit">🚀 Process URL</button>
      </form>
      
      <div id="results" class="results" style="display: none;"></div>
      
      <h3>📝 How to Test:</h3>
      <ul>
        <li><strong>Website</strong>: https://example.com</li>
        <li><strong>Twitter</strong>: https://twitter.com/username</li>
        <li><strong>LinkedIn</strong>: https://linkedin.com/in/profile</li>
      </ul>
      
      <p><a href="/status">📊 Check System Status</a></p>
      
      <script>
        document.getElementById('testForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const url = document.getElementById('url').value;
          const testPhone = document.getElementById('testPhone').value;
          const results = document.getElementById('results');
          
          results.style.display = 'block';
          results.innerHTML = '🔄 Processing URL...';
          
          try {
            const response = await fetch('/test-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, testPhone })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              results.innerHTML = \`
                <h4>✅ Success!</h4>
                <p><strong>URL:</strong> \${data.url}</p>
                <p><strong>Status:</strong> \${data.message}</p>
                <p><em>Check your console logs and Notion database for results!</em></p>
              \`;
            } else {
              results.innerHTML = \`
                <h4>❌ Error</h4>
                <p>\${data.error}</p>
              \`;
            }
          } catch (error) {
            results.innerHTML = \`
              <h4>❌ Network Error</h4>
              <p>\${error.message}</p>
            \`;
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`🚀 SMS-to-Notion server running on port ${port}`);
  console.log(`📞 Webhook URL: http://your-domain.com/sms-webhook`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});