const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

/**
 * Main function to scrape URL data based on URL type
 */
async function scrapeUrlData(url, urlType) {
  console.log(`🕷️ Starting to scrape ${urlType} URL: ${url}`);
  
  try {
    switch (urlType) {
      case 'twitter':
        return await scrapeTwitterProfile(url);
      case 'linkedin':
        return await scrapeLinkedInProfile(url);
      case 'website':
        return await scrapeWebsite(url);
      default:
        throw new Error(`Unsupported URL type: ${urlType}`);
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw error;
  }
}

/**
 * Scrape Twitter/X profile data
 */
async function scrapeTwitterProfile(url) {
  console.log('🐦 Scraping Twitter profile');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Extract data from Twitter page
    const data = await page.evaluate(() => {
      // Twitter profile name
      const nameElement = document.querySelector('[data-testid="UserName"] span') || 
                         document.querySelector('h1[role="heading"]') ||
                         document.querySelector('[data-testid="UserDisplayName"]');
      const name = nameElement ? nameElement.textContent.trim() : null;
      
      // Bio/Description
      const bioElement = document.querySelector('[data-testid="UserDescription"]');
      const bio = bioElement ? bioElement.textContent.trim() : null;
      
      // Location
      const locationElement = document.querySelector('[data-testid="UserLocation"]');
      const location = locationElement ? locationElement.textContent.trim() : null;
      
      // Website in bio
      const websiteElement = document.querySelector('[data-testid="UserUrl"] a');
      const website = websiteElement ? websiteElement.href : null;
      
      return { name, bio, location, website };
    });
    
    return {
      name: data.name,
      twitterUrl: url,
      websiteUrl: data.website,
      contactEmail: extractEmailFromText(data.bio),
      tags: generateTagsFromText(data.bio),
      rate: null // Will need to be manually set
    };
    
  } finally {
    await browser.close();
  }
}

/**
 * Scrape LinkedIn profile data
 */
async function scrapeLinkedInProfile(url) {
  console.log('💼 Scraping LinkedIn profile');
  
  // LinkedIn is heavily protected, so we'll use a simpler approach
  // In production, you'd want to use LinkedIn API or specialized services
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Extract basic data (LinkedIn may require login for full access)
    const data = await page.evaluate(() => {
      const nameElement = document.querySelector('h1') || document.querySelector('.top-card-layout__title');
      const name = nameElement ? nameElement.textContent.trim() : null;
      
      const titleElement = document.querySelector('.top-card-layout__headline') || 
                          document.querySelector('h2');
      const title = titleElement ? titleElement.textContent.trim() : null;
      
      return { name, title };
    });
    
    return {
      name: data.name,
      linkedinUrl: url,
      websiteUrl: null,
      contactEmail: null, // LinkedIn doesn't expose emails publicly
      tags: data.title ? generateTagsFromText(data.title) : [],
      rate: null
    };
    
  } finally {
    await browser.close();
  }
}

/**
 * Scrape general website data
 */
async function scrapeWebsite(url) {
  console.log('🌐 Scraping website');
  
  try {
    // First try with axios for faster loading
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract basic information
    const title = $('title').text().trim() || 
                 $('h1').first().text().trim() ||
                 $('meta[property="og:title"]').attr('content');
    
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       $('p').first().text().trim().substring(0, 200);
    
    // Look for contact information
    const bodyText = $('body').text();
    const contactEmail = extractEmailFromText(bodyText);
    
    // Look for social media links
    const twitterUrl = $('a[href*="twitter.com"], a[href*="x.com"]').attr('href');
    const linkedinUrl = $('a[href*="linkedin.com"]').attr('href');
    
    return {
      name: title,
      websiteUrl: url,
      twitterUrl: twitterUrl || null,
      linkedinUrl: linkedinUrl || null,
      contactEmail: contactEmail,
      tags: generateTagsFromText(description + ' ' + title),
      rate: null
    };
    
  } catch (axiosError) {
    console.log('Axios failed, trying with Puppeteer:', axiosError.message);
    
    // Fallback to Puppeteer for JS-heavy sites
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const data = await page.evaluate(() => {
        const title = document.title || 
                     document.querySelector('h1')?.textContent ||
                     document.querySelector('meta[property="og:title"]')?.content;
        
        const description = document.querySelector('meta[name="description"]')?.content ||
                           document.querySelector('meta[property="og:description"]')?.content ||
                           document.querySelector('p')?.textContent?.substring(0, 200);
        
        const bodyText = document.body.textContent;
        
        return { title, description, bodyText };
      });
      
      return {
        name: data.title,
        websiteUrl: url,
        twitterUrl: null,
        linkedinUrl: null,
        contactEmail: extractEmailFromText(data.bodyText),
        tags: generateTagsFromText(data.description + ' ' + data.title),
        rate: null
      };
      
    } finally {
      await browser.close();
    }
  }
}

/**
 * Extract email addresses from text
 */
function extractEmailFromText(text) {
  if (!text) return null;
  
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex);
  
  // Return the first email found, filtering out common non-contact emails
  if (emails && emails.length > 0) {
    const filteredEmails = emails.filter(email => 
      !email.includes('noreply') && 
      !email.includes('no-reply') &&
      !email.includes('donotreply')
    );
    return filteredEmails[0] || emails[0];
  }
  
  return null;
}

/**
 * Generate relevant tags from text content
 */
function generateTagsFromText(text) {
  if (!text) return [];
  
  const techKeywords = [
    'developer', 'engineer', 'programmer', 'software', 'web', 'mobile', 'app',
    'frontend', 'backend', 'fullstack', 'javascript', 'python', 'react', 'node',
    'startup', 'founder', 'ceo', 'cto', 'tech', 'ai', 'machine learning', 'ml',
    'data', 'analytics', 'cloud', 'aws', 'consulting', 'freelancer', 'agency',
    'marketing', 'design', 'designer', 'ux', 'ui', 'product', 'saas', 'b2b'
  ];
  
  const lowerText = text.toLowerCase();
  const foundTags = techKeywords.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  // Return unique tags, limited to 5
  return [...new Set(foundTags)].slice(0, 5);
}

module.exports = {
  scrapeUrlData,
  extractEmailFromText,
  generateTagsFromText
};