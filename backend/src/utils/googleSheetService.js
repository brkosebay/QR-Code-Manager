const { google } = require('googleapis');
const path = require('path');
const Respondent = require('../models/respondentModel');
const crypto = require('crypto');

const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const keyFile = require(keyFilePath);

const generateHashFromEmail = (email) => {
    return crypto.createHash('sha256').update(email).digest('hex');
  };

const authenticateSheetsAPI = () => {
    const client = new google.auth.JWT(
        keyFile.client_email,
        null,
        keyFile.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
  return client;
};

const readSheetAndProcessResponses = async (token, identifiers, client) => {
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.SPREADSHEET_ID; // Ensure this is set in your .env file
    const range = process.env.SPREADSHEET_RANGE;
  
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
  
      const rows = response.data.values;
      let isSurveyCompleted = false;
  
      // Loop through each row in the responses
      for (const row of rows) {
        if (row.length === 0) continue
        // Assume the respondent's email is in the first column
        const email = row[0];
        const emailHash = generateHashFromEmail(email);
        const toggledEmail = toggleFirstLetterCase(email);
        const toggledEmailHash = generateHashFromEmail(toggledEmail);
        // Check if the emailHash matches any of the identifiers
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
      console.error('The API returned an error: ', error);
      throw error; // Rethrow the error to handle it in the calling context
    }
  };

  const toggleFirstLetterCase = (email) => {
    if (email.length === 0) return email;
    const firstChar = email.charAt(0);
    const toggledChar = firstChar === firstChar.toUpperCase() ? firstChar.toLowerCase() : firstChar.toUpperCase();
    return toggledChar + email.slice(1);
};

module.exports = {
  authenticateSheetsAPI,
  readSheetAndProcessResponses,
};
