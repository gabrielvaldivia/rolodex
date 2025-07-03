# SMS-to-Notion Lead Enrichment System

🚀 **Text a URL, get enriched lead data in your Notion database automatically!**

This system allows you to text website, Twitter, or LinkedIn URLs to a real phone number, which then:
1. 🕷️ **Scrapes** the URL for relevant information
2. 🧠 **Extracts** key data (name, email, social profiles, tags)
3. 📝 **Updates** your Notion database automatically
4. 📱 **Confirms** success via SMS

## 🏗️ System Architecture

```
SMS Message → Twilio Webhook → Express Server → Queue System → Web Scraper → Notion API
     ↓              ↓              ↓              ↓              ↓           ↓
 Real Phone    Your Server    URL Analysis    Background      Extract     Update DB
   Number      (your-domain)   & Queue Job     Processing      Data        & Notify
```

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **SMS**: Twilio API
- **Database**: Notion API
- **Web Scraping**: Puppeteer + Cheerio
- **Queue System**: Bull + Redis
- **Hosting**: Any Node.js hosting (Heroku, Railway, DigitalOcean, etc.)

## 📋 Prerequisites

Before you start, you'll need:

1. **Notion Workspace** with a database
2. **Twilio Account** with a phone number
3. **Redis** instance (for background jobs)
4. **Node.js Server** (to host the application)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd sms-notion-enrichment
npm install
```

### 2. Set Up Notion Database

Create a Notion database with these properties:
- **Name** (Title)
- **Website URL** (URL)
- **Twitter URL** (URL)
- **LinkedIn URL** (URL)
- **Contact Email** (Email)
- **Tags** (Multi-select)
- **Rate** (Number)
- **Last Updated** (Date)
- **Source** (Select)

### 3. Get Your API Keys

#### Notion Setup:
1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create new integration → Copy the token
3. Share your database with the integration
4. Copy your database ID from the URL

#### Twilio Setup:
1. Sign up at [twilio.com](https://twilio.com)
2. Get a phone number
3. Copy Account SID and Auth Token
4. Set up webhook URL (we'll do this after deployment)

### 4. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Notion
NOTION_API_KEY=secret_your_notion_token_here
NOTION_DATABASE_ID=your_database_id_here

# Server
PORT=3000
NODE_ENV=production

# Redis (use free Redis hosting like Redis Cloud)
REDIS_URL=redis://localhost:6379
```

### 5. Deploy to Hosting Platform

#### Option A: Railway (Recommended)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### Option B: Heroku
```bash
git init
heroku create your-app-name
heroku addons:create heroku-redis:mini
git add .
git commit -m "Initial commit"
git push heroku main
```

### 6. Configure Twilio Webhook

1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Click your phone number
3. Set webhook URL: `https://your-app-url.com/sms-webhook`
4. Set HTTP method to `POST`
5. Save configuration

### 7. Test the System

Text any URL to your Twilio phone number:
- `https://example.com`
- `https://twitter.com/username`
- `https://linkedin.com/in/profile`

## 🧪 Testing Without SMS Setup

Want to test the core functionality before setting up SMS? You have three options:

### Option 1: Command Line Testing
```bash
# Set up minimal environment (just Notion)
cp .env.test .env
# Edit .env with your Notion credentials

# Test any URL directly
npm run test-url https://example.com
npm run test-url https://twitter.com/username
npm run test-url https://linkedin.com/in/profile
```

### Option 2: Web Interface Testing
```bash
# Start the server
npm start

# Visit the test page
open http://localhost:3000/test
```

### Option 3: API Testing
```bash
# Use curl or any HTTP client
curl -X POST http://localhost:3000/test-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Validate Test Setup
```bash
# Check if your test environment is ready
npm run setup -- --test-mode
```

## 📱 How It Works

### User Experience:
1. **Text a URL** → `https://acme.com` to your bot number
2. **Get confirmation** → "🔍 Got it! Processing your URL now."
3. **Receive updates** → "✅ Successfully processed https://acme.com!"
4. **Check Notion** → New entry with extracted data

### Behind the Scenes:
1. **SMS received** → Twilio webhook hits your server
2. **URL extracted** → System identifies URL type (website/twitter/linkedin)
3. **Queued for processing** → Background job added to Redis queue
4. **Web scraping** → Puppeteer/Cheerio extracts relevant data
5. **Notion updated** → Creates or updates database entry
6. **SMS confirmation** → User gets success notification

## 🔧 Customization

### Adding New URL Types
Edit `services/urlProcessor.js` to add new URL categorization:

```javascript
function categorizeUrl(urlString) {
  const hostname = url.hostname.toLowerCase();
  
  if (hostname.includes('instagram.com')) {
    return 'instagram';
  }
  // Add your custom logic
}
```

### Modifying Scraped Data
Edit `services/webScraper.js` to extract different information:

```javascript
// Add custom extraction logic
const customData = await page.evaluate(() => {
  return document.querySelector('.custom-selector')?.textContent;
});
```

### Changing Notion Properties
Edit `services/notionService.js` to match your database schema:

```javascript
function buildNotionProperties(scrapedData) {
  return {
    'Your Custom Property': {
      rich_text: [{ text: { content: scrapedData.customField } }]
    }
  };
}
```

## 📊 Monitoring & Debugging

### Check System Status
Visit `https://your-app-url.com/status` to see:
- Queue statistics
- Processing status
- System health

### View Logs
```bash
# For Railway
railway logs

# For Heroku
heroku logs --tail
```

### Common Issues

**SMS not received?**
- Check Twilio webhook URL is correct
- Verify webhook is set to POST method
- Check server logs for errors

**Scraping not working?**
- Some sites block automated access
- Try different user agents
- Consider using proxy services for production

**Notion not updating?**
- Verify database ID is correct
- Check integration has access to database
- Ensure property names match exactly

## 💰 Cost Breakdown

- **Twilio**: ~$0.0075 per SMS (both inbound/outbound)
- **Hosting**: $5-20/month (Railway, Heroku, etc.)
- **Redis**: Free tier available on most platforms
- **Notion**: Free for personal use

**Estimated cost**: $10-30/month for moderate usage

## 🔐 Security Considerations

1. **Rate Limiting**: Add rate limits to prevent abuse
2. **Phone Number Validation**: Only allow known numbers
3. **Environment Variables**: Never commit API keys
4. **HTTPS**: Always use HTTPS for webhooks
5. **Input Validation**: Sanitize all user inputs

## 🚀 Production Enhancements

### Advanced Features to Add:
- **User Authentication**: Link phone numbers to user accounts
- **Custom Extraction Rules**: Per-user scraping preferences
- **Bulk Processing**: Handle multiple URLs in one message
- **Analytics Dashboard**: Track usage and success rates
- **AI Enhancement**: Use GPT to improve data extraction
- **Duplicate Detection**: Smarter duplicate prevention
- **Scheduled Updates**: Re-scrape URLs periodically

### Performance Optimizations:
- **Caching**: Cache scraped data to avoid re-processing
- **Parallel Processing**: Process multiple URLs simultaneously
- **Proxy Rotation**: Use rotating proxies for better scraping success
- **CDN**: Use CDN for faster webhook responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 🆘 Need Help?

Having trouble setting this up? Here's what to check:

1. **Environment variables** are set correctly
2. **Notion database** has all required properties
3. **Twilio webhook** points to the right URL
4. **Redis** connection is working
5. **Server** is accessible from the internet

Create an issue if you're still stuck!

---

*Built with ❤️ for automating lead enrichment*