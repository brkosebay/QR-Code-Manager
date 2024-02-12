const crypto = require('crypto');
const Respondent = require('../models/respondentModel');
const qrCodeService = require('../utils/qrCodeService');
const { v4: uuidv4 } = require('uuid');

const generateHashFromEmail = (email) => {
  return crypto.createHash('sha256').update(email).digest('hex');
};

const addRespondent = async (req, res) => {
    const { emails } = req.body;
  
    try {
      const token = uuidv4();
      const emails = emails.filter(email => email && email.trim() !== '');
      const identifiers = emails.map(email => generateHashFromEmail(email));

      const existingRespondent = await Respondent.findOne({ 
        identifiers: { $in: identifiers }
      });
  
      if (existingRespondent) {
        // Respondent exists, send an error response
        return res.status(409).json({ message: 'Respondent with this identifier already exists.' });
      }
  
      // If no existing respondent, create a new one
      const newRespondent = new Respondent({
        token,
        identifiers,
        hasCompletedSurvey: false, // Default to false
        hasReceivedGift: false,
        giftReceivedTimestamp: new Date(0) // Default to UNIX epoch

      });
      await newRespondent.save();
  
      await qrCodeService.generateAndSaveQRCode(emails, token);

      return res.status(201).json({ exists: false, token});
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };

module.exports = {
  addRespondent
};
