const Queue = require('bull');
const { scrapeUrlData } = require('./webScraper');
const { updateNotionDatabase } = require('./notionService');
const { sendSmsUpdate } = require('./twilioService');

// Create queue instance
const urlProcessingQueue = new Queue('URL processing', process.env.REDIS_URL);

/**
 * Setup queue and define job processors
 */
function setupQueue() {
  console.log('🔧 Setting up queue system');
  
  // Process URL scraping jobs
  urlProcessingQueue.process('process-url', 5, async (job) => {
    const { url, urlType, fromNumber, timestamp } = job.data;
    
    console.log(`🏃‍♂️ Processing job for URL: ${url}`);
    
    try {
      // Step 1: Scrape the URL
      console.log(`🕷️ Scraping ${urlType} URL: ${url}`);
      const scrapedData = await scrapeUrlData(url, urlType);
      
      if (!scrapedData) {
        throw new Error('Failed to scrape data from URL');
      }
      
      console.log('📊 Scraped data:', scrapedData);
      
      // Step 2: Update Notion database
      console.log('📝 Updating Notion database');
      const notionResult = await updateNotionDatabase(scrapedData);
      
      // Step 3: Send success notification
      const successMessage = `✅ Successfully processed ${url}!\n\n` +
        `📝 Name: ${scrapedData.name || 'N/A'}\n` +
        `🏷️ Tags: ${scrapedData.tags ? scrapedData.tags.join(', ') : 'N/A'}\n` +
        `📧 Email: ${scrapedData.contactEmail || 'N/A'}`;
      
      await sendSmsUpdate(fromNumber, successMessage);
      
      console.log(`✅ Successfully processed ${url}`);
      return { success: true, notionId: notionResult.id };
      
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error);
      
      // Send error notification
      await sendSmsUpdate(
        fromNumber, 
        `❌ Failed to process ${url}: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}`
      );
      
      throw error; // This will mark the job as failed
    }
  });
  
  // Queue event handlers
  urlProcessingQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });
  
  urlProcessingQueue.on('failed', (job, err) => {
    console.log(`❌ Job ${job.id} failed:`, err.message);
  });
  
  urlProcessingQueue.on('stalled', (job) => {
    console.log(`⏰ Job ${job.id} stalled`);
  });
}

/**
 * Add a job to the queue
 */
async function addToQueue(jobType, data, options = {}) {
  const defaultOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  };
  
  const job = await urlProcessingQueue.add(jobType, data, { ...defaultOptions, ...options });
  console.log(`📥 Added job ${job.id} to queue`);
  return job;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    urlProcessingQueue.getWaiting(),
    urlProcessingQueue.getActive(),
    urlProcessingQueue.getCompleted(),
    urlProcessingQueue.getFailed()
  ]);
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length
  };
}

/**
 * Clean up old jobs
 */
async function cleanQueue() {
  await urlProcessingQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24h
  await urlProcessingQueue.clean(24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 24h
}

module.exports = {
  setupQueue,
  addToQueue,
  getQueueStats,
  cleanQueue
};