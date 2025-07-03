# 🧪 Testing Guide

Want to test the URL processing and Notion integration **without setting up SMS**? Perfect! Here's how:

## ⚡ Quick Start (2 minutes)

### 1. Minimal Setup
```bash
# Clone and install
git clone <your-repo>
cd sms-notion-enrichment
npm install

# Copy test environment
cp .env.test .env
```

### 2. Configure Notion Only
Edit `.env` with just your Notion credentials:
```env
NOTION_API_KEY=secret_your_notion_token_here
NOTION_DATABASE_ID=your_database_id_here
```

### 3. Validate Setup
```bash
npm run setup-test
```
Should show: `🎉 Core components validated!`

### 4. Test URL Processing
```bash
# Test different URL types
npm run test-url https://example.com
npm run test-url https://twitter.com/elonmusk  
npm run test-url https://linkedin.com/in/profile
```

## 🎯 Testing Methods

### Method 1: Command Line (Fastest)
```bash
npm run test-url <any-url>
```
- ✅ Direct testing, no server needed
- ✅ See raw scraped data
- ✅ Immediate feedback

### Method 2: Web Interface (Visual)
```bash
npm start
# Visit: http://localhost:3000/test
```
- ✅ Nice UI for testing
- ✅ Form validation
- ✅ Visual feedback

### Method 3: API Endpoint (Integration)
```bash
curl -X POST http://localhost:3000/test-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```
- ✅ Test API integration
- ✅ Programmatic testing
- ✅ Perfect for automation

## 📊 What Gets Tested

All core functionality **except SMS**:
- ✅ URL categorization (website/twitter/linkedin)
- ✅ Web scraping (Puppeteer + Cheerio)
- ✅ Data extraction (name, email, tags)
- ✅ Notion database creation/updates
- ✅ Error handling and retries

## 🚨 Common Test Issues

**"Notion not configured"**
- Make sure `NOTION_API_KEY` and `NOTION_DATABASE_ID` are set
- Check your Notion integration has database access

**"Failed to scrape data"**
- Some sites block automated access (normal)
- Try a different URL
- Check your internet connection

**"Database schema mismatch"**
- Your Notion database needs specific properties
- Run `npm run setup-test` to see what's missing

## 🎉 Success Indicators

**Command Line Success:**
```
🧪 Testing URL processing without SMS...
📋 URL: https://example.com
🏷️  URL Type: website
🕷️  Scraping data...
📊 Scraped Data: { name: "Example Site", ... }
📝 Updating Notion database...
✅ Notion updated! Entry ID: abc123
🎉 Test completed successfully!
```

**Web Interface Success:**
```
✅ Success!
URL: https://example.com
Status: URL processing started
Check your console logs and Notion database for results!
```

## ⚡ Pro Testing Tips

1. **Start Simple**: Test with `https://example.com` first
2. **Check Notion**: Verify entries are actually created
3. **Try Edge Cases**: Empty sites, redirects, blocked sites
4. **Monitor Logs**: Watch console output for debugging
5. **Test All Types**: Website, Twitter, LinkedIn URLs

## 🚀 Ready for Full Setup?

Once testing works:
1. Get Twilio phone number
2. Set up Redis for background jobs
3. Deploy to hosting platform
4. Configure SMS webhooks
5. Test the full SMS → Notion flow

---

**Testing is the fastest way to validate your idea before committing to full SMS setup!** 🎯