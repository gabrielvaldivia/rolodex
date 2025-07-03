const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Alternative Notion service using MCP instead of direct API
 * Note: This requires the Notion MCP server to be running
 */

/**
 * Update Notion database using MCP
 */
async function updateNotionDatabaseMcp(scrapedData) {
  console.log('📝 Updating Notion database via MCP with data:', scrapedData);
  
  try {
    // Check if entry already exists
    const existingEntry = await findExistingEntryMcp(scrapedData);
    
    if (existingEntry) {
      console.log('📄 Found existing entry, updating via MCP');
      return await updateExistingEntryMcp(existingEntry.id, scrapedData);
    } else {
      console.log('➕ Creating new entry via MCP');
      return await createNewEntryMcp(scrapedData);
    }
    
  } catch (error) {
    console.error('Error updating Notion database via MCP:', error);
    throw error;
  }
}

/**
 * Find existing entry using MCP
 */
async function findExistingEntryMcp(scrapedData) {
  // This would use MCP commands to search the database
  // The exact implementation depends on how your MCP server is set up
  
  try {
    const searchQuery = scrapedData.websiteUrl || scrapedData.name;
    
    // Example MCP command (adjust based on your MCP setup)
    const mcpCommand = `notion-mcp search-database --query "${searchQuery}"`;
    const result = await execAsync(mcpCommand);
    
    if (result.stdout) {
      const searchResults = JSON.parse(result.stdout);
      return searchResults.length > 0 ? searchResults[0] : null;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error searching via MCP:', error);
    return null;
  }
}

/**
 * Create new entry using MCP
 */
async function createNewEntryMcp(scrapedData) {
  const properties = buildMcpProperties(scrapedData);
  
  // Convert to MCP command format
  const mcpCommand = `notion-mcp create-page --database-id "${process.env.NOTION_DATABASE_ID}" --properties '${JSON.stringify(properties)}'`;
  
  try {
    const result = await execAsync(mcpCommand);
    const createdPage = JSON.parse(result.stdout);
    
    console.log(`✅ Created new Notion entry via MCP: ${createdPage.id}`);
    return createdPage;
    
  } catch (error) {
    console.error('Error creating entry via MCP:', error);
    throw error;
  }
}

/**
 * Update existing entry using MCP
 */
async function updateExistingEntryMcp(pageId, scrapedData) {
  const properties = buildMcpProperties(scrapedData);
  
  const mcpCommand = `notion-mcp update-page --page-id "${pageId}" --properties '${JSON.stringify(properties)}'`;
  
  try {
    const result = await execAsync(mcpCommand);
    const updatedPage = JSON.parse(result.stdout);
    
    console.log(`✅ Updated existing Notion entry via MCP: ${pageId}`);
    return updatedPage;
    
  } catch (error) {
    console.error('Error updating entry via MCP:', error);
    throw error;
  }
}

/**
 * Build properties object for MCP (similar to API format)
 */
function buildMcpProperties(scrapedData) {
  const properties = {};
  
  if (scrapedData.name) {
    properties['Name'] = scrapedData.name;
  }
  
  if (scrapedData.websiteUrl) {
    properties['Website URL'] = scrapedData.websiteUrl;
  }
  
  if (scrapedData.twitterUrl) {
    properties['Twitter URL'] = scrapedData.twitterUrl;
  }
  
  if (scrapedData.linkedinUrl) {
    properties['LinkedIn URL'] = scrapedData.linkedinUrl;
  }
  
  if (scrapedData.contactEmail) {
    properties['Contact Email'] = scrapedData.contactEmail;
  }
  
  if (scrapedData.tags && scrapedData.tags.length > 0) {
    properties['Tags'] = scrapedData.tags;
  }
  
  if (scrapedData.rate !== null && scrapedData.rate !== undefined) {
    properties['Rate'] = scrapedData.rate;
  }
  
  properties['Last Updated'] = new Date().toISOString();
  properties['Source'] = 'SMS Bot';
  
  return properties;
}

/**
 * Validate MCP connection
 */
async function validateMcpConnection() {
  try {
    const result = await execAsync('notion-mcp --version');
    console.log('✅ Notion MCP is available:', result.stdout.trim());
    return true;
  } catch (error) {
    console.error('❌ Notion MCP not available:', error.message);
    return false;
  }
}

module.exports = {
  updateNotionDatabase: updateNotionDatabaseMcp,
  validateMcpConnection,
  findExistingEntry: findExistingEntryMcp
};