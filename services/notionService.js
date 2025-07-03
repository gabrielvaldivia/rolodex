const { Client } = require('@notionhq/client');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Update or create a Notion database entry with scraped data
 */
async function updateNotionDatabase(scrapedData) {
  console.log('📝 Updating Notion database with data:', scrapedData);
  
  try {
    // Check if entry already exists based on website URL or name
    const existingEntry = await findExistingEntry(scrapedData);
    
    if (existingEntry) {
      console.log(`📄 Found existing entry, updating: ${existingEntry.id}`);
      return await updateExistingEntry(existingEntry.id, scrapedData);
    } else {
      console.log('➕ Creating new entry');
      return await createNewEntry(scrapedData);
    }
    
  } catch (error) {
    console.error('Error updating Notion database:', error);
    throw error;
  }
}

/**
 * Find existing database entry by URL or name
 */
async function findExistingEntry(scrapedData) {
  try {
    const queries = [];
    
    // Search by website URL
    if (scrapedData.websiteUrl) {
      queries.push({
        property: 'Website URL',
        url: {
          equals: scrapedData.websiteUrl
        }
      });
    }
    
    // Search by Twitter URL
    if (scrapedData.twitterUrl) {
      queries.push({
        property: 'Twitter URL',
        url: {
          equals: scrapedData.twitterUrl
        }
      });
    }
    
    // Search by LinkedIn URL
    if (scrapedData.linkedinUrl) {
      queries.push({
        property: 'LinkedIn URL',
        url: {
          equals: scrapedData.linkedinUrl
        }
      });
    }
    
    // Try each query
    for (const filter of queries) {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        filter
      });
      
      if (response.results.length > 0) {
        return response.results[0];
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error searching for existing entry:', error);
    return null;
  }
}

/**
 * Create a new Notion database entry
 */
async function createNewEntry(scrapedData) {
  const properties = buildNotionProperties(scrapedData);
  
  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties
  });
  
  console.log(`✅ Created new Notion entry: ${response.id}`);
  return response;
}

/**
 * Update an existing Notion database entry
 */
async function updateExistingEntry(pageId, scrapedData) {
  const properties = buildNotionProperties(scrapedData, true);
  
  const response = await notion.pages.update({
    page_id: pageId,
    properties
  });
  
  console.log(`✅ Updated existing Notion entry: ${pageId}`);
  return response;
}

/**
 * Build Notion properties object from scraped data
 */
function buildNotionProperties(scrapedData, isUpdate = false) {
  const properties = {};
  
  // Name (Title property)
  if (scrapedData.name) {
    properties['Name'] = {
      title: [
        {
          text: {
            content: scrapedData.name
          }
        }
      ]
    };
  }
  
  // Website URL
  if (scrapedData.websiteUrl) {
    properties['Website URL'] = {
      url: scrapedData.websiteUrl
    };
  }
  
  // Twitter URL
  if (scrapedData.twitterUrl) {
    properties['Twitter URL'] = {
      url: scrapedData.twitterUrl
    };
  }
  
  // LinkedIn URL
  if (scrapedData.linkedinUrl) {
    properties['LinkedIn URL'] = {
      url: scrapedData.linkedinUrl
    };
  }
  
  // Contact Email
  if (scrapedData.contactEmail) {
    properties['Contact Email'] = {
      email: scrapedData.contactEmail
    };
  }
  
  // Tags (Multi-select property)
  if (scrapedData.tags && scrapedData.tags.length > 0) {
    properties['Tags'] = {
      multi_select: scrapedData.tags.map(tag => ({
        name: tag
      }))
    };
  }
  
  // Rate (Number property) - only if provided
  if (scrapedData.rate !== null && scrapedData.rate !== undefined) {
    properties['Rate'] = {
      number: scrapedData.rate
    };
  }
  
  // Add a "Last Updated" timestamp for tracking
  properties['Last Updated'] = {
    date: {
      start: new Date().toISOString()
    }
  };
  
  // Add source information
  properties['Source'] = {
    select: {
      name: 'SMS Bot'
    }
  };
  
  return properties;
}

/**
 * Validate that the Notion database has the required properties
 */
async function validateDatabaseSchema() {
  try {
    const response = await notion.databases.retrieve({
      database_id: DATABASE_ID
    });
    
    const properties = response.properties;
    const requiredProperties = [
      'Name',
      'Website URL',
      'Twitter URL',
      'Contact Email',
      'Tags',
      'Rate'
    ];
    
    const missingProperties = requiredProperties.filter(prop => !properties[prop]);
    
    if (missingProperties.length > 0) {
      console.warn('⚠️ Missing database properties:', missingProperties);
      console.log('📋 Available properties:', Object.keys(properties));
    } else {
      console.log('✅ Database schema validated');
    }
    
    return {
      valid: missingProperties.length === 0,
      missingProperties,
      availableProperties: Object.keys(properties)
    };
    
  } catch (error) {
    console.error('Error validating database schema:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 1
    });
    
    return {
      totalEntries: response.results.length,
      hasMore: response.has_more
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { totalEntries: 0, hasMore: false };
  }
}

module.exports = {
  updateNotionDatabase,
  validateDatabaseSchema,
  getDatabaseStats,
  findExistingEntry
};