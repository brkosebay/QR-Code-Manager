const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');
const Respondent = require('../models/respondentModel');
const crypto = require('crypto');

/**
 * Generate SHA-256 hash from email address
 * @param {string} email - Email address to hash
 * @returns {string} - Hex string of the hash
 */
const generateHashFromEmail = (email) => {
  return crypto.createHash('sha256').update(email).digest('hex');
};

/**
 * Toggle the case of the first letter of an email
 * Used for case-insensitive matching
 * @param {string} email - Email address
 * @returns {string} - Email with toggled first letter case
 */
const toggleFirstLetterCase = (email) => {
  if (email.length === 0) return email;
  const firstChar = email.charAt(0);
  const toggledChar = firstChar === firstChar.toUpperCase()
    ? firstChar.toLowerCase()
    : firstChar.toUpperCase();
  return toggledChar + email.slice(1);
};

/**
 * Authenticate with Microsoft Graph API using Azure AD App Registration
 * @returns {Client} - Microsoft Graph client instance
 */
const authenticateGraphAPI = () => {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing Azure AD credentials. Please ensure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET are set in your .env file.'
    );
  }

  // Create credential object for authentication
  const credential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  // Initialize Graph client with authentication
  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        return token.token;
      },
    },
  });

  return client;
};

/**
 * Read Excel workbook from OneDrive and process form responses
 * Compares email hashes from Excel with respondent identifiers
 * @param {string} token - Respondent token
 * @param {string[]} identifiers - Array of email hashes to match against
 * @param {Client} client - Microsoft Graph client instance
 */
const readExcelAndProcessResponses = async (token, identifiers, client) => {
  const driveItemId = process.env.EXCEL_FILE_ITEM_ID;
  const worksheetName = process.env.EXCEL_WORKSHEET_NAME || 'Sheet1';
  const range = process.env.EXCEL_RANGE; // e.g., "D2:D" or "A2:A100"
  const ownerUPN = process.env.EXCEL_OWNER_UPN;
  const driveId = process.env.EXCEL_DRIVE_ID;

  if (!driveItemId || !range) {
    throw new Error(
      'Missing Excel configuration. Ensure EXCEL_FILE_ITEM_ID and EXCEL_RANGE are set in your .env file.'
    );
  }

  if (!ownerUPN && !driveId) {
    throw new Error(
      'Missing owner context. Set EXCEL_OWNER_UPN (preferred) or EXCEL_DRIVE_ID so the Graph client can find the workbook.'
    );
  }

  const baseItemPath = ownerUPN
    ? `/users/${ownerUPN}/drive/items/${driveItemId}`
    : `/drives/${driveId}/items/${driveItemId}`;

  try {
    // Construct the API endpoint for reading Excel range
    // Format: /users/{owner}/drive/items/{item-id}/workbook/worksheets/{worksheet-name}/range(…)
    const endpoint = `${baseItemPath}/workbook/worksheets/${encodeURIComponent(
      worksheetName
    )}/range(address='${range}')`;

    // Make the API request to read the Excel range
    const response = await client.api(endpoint).get();

    // Extract the values from the response
    const rows = response.values || [];
    let isSurveyCompleted = false;

    // Loop through each row in the Excel data
    for (const row of rows) {
      if (!row || row.length === 0) continue;

      // Assume the respondent's email is in the first column of the range
      const email = row[0];

      // Skip empty cells
      if (!email || email.trim() === '') continue;

      // Generate hash for the email
      const emailHash = generateHashFromEmail(email);

      // Generate hash for email with toggled first letter case
      const toggledEmail = toggleFirstLetterCase(email);
      const toggledEmailHash = generateHashFromEmail(toggledEmail);

      // Check if either hash matches any of the identifiers
      if (identifiers.includes(emailHash) || identifiers.includes(toggledEmailHash)) {
        isSurveyCompleted = true;
        break;
      }
    }

    // Update the database only if a match was found
    if (isSurveyCompleted) {
      const respondent = await Respondent.findOne({ token });
      if (respondent && !respondent.hasCompletedSurvey) {
        // Update the respondent's status
        respondent.hasCompletedSurvey = true;
        await respondent.save();
      }
    }
  } catch (error) {
    console.error('Microsoft Graph API returned an error: ', error);

    // Provide more detailed error information
    if (error.statusCode === 401) {
      console.error('Authentication failed. Please check your Azure AD credentials.');
    } else if (error.statusCode === 403) {
      console.error('Access denied. Please ensure your Azure AD app has the required permissions (Files.Read.All or Sites.Read.All).');
    } else if (error.statusCode === 404) {
      console.error('File or worksheet not found. Please check your EXCEL_FILE_ITEM_ID and EXCEL_WORKSHEET_NAME.');
    }

    throw error; // Rethrow the error to handle it in the calling context
  }
};

module.exports = {
  authenticateGraphAPI,
  readExcelAndProcessResponses,
  generateHashFromEmail,
  toggleFirstLetterCase,
};
