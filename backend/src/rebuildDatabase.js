require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const QRCode = require('qrcode');
const Respondent = require('./models/respondentModel'); // Adjust path as necessary
const qrCodeService = require('./utils/qrCodeService');
const { v4: uuidv4 } = require('uuid');

mongoose.connect(process.env.MONGODB_URI);

const clearQRCodesDirectory = async () => {
    const directory = path.join(__dirname, 'utils', 'qr_codes');
  
    try {
      const files = await readdir(directory);
      const unlinkPromises = files.map(filename => unlink(path.join(directory, filename)));
      return Promise.all(unlinkPromises);
    } catch (error) {
      console.error('Error clearing QR codes directory:', error);
      throw error; // Rethrow the error to handle it in the calling function
    }
  };
  

const generateHashFromEmail = (email) => {
    return crypto.createHash('sha256').update(email).digest('hex');
  };

const clearDatabase = async () => {
  try {
    await Respondent.deleteMany({}); // Be cautious with this in production
    console.log('Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

const rebuildDatabaseFromCSV = async (filePath) => {
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv({ separator: ';' })) // Specify semicolon as the separator
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        // Assuming each row has multiple email fields like 'Email1', 'Email2', etc.
        const emails = [row.Email1, row.Email2].filter(email => email && email.trim() !== '');
        const identifiers = emails.map(email => generateHashFromEmail(email));
        const token = uuidv4();

        const newRespondent = new Respondent({
            token,
            identifiers,
            hasCompletedSurvey: false, // Default to false
            hasReceivedGift: false, // Default to false
            giftReceivedTimestamp: new Date(0) // Default to UNIX epoch
        });

        await newRespondent.save();
        await qrCodeService.generateAndSaveQRCode(emails, token); // Generate QR Codes
        console.log(`Added respondent for emails: ${emails.join(', ')}`);
      }
      console.log('Database rebuild complete');
      process.exit(0); // Exit the script
    });
};

const run = async () => {
  await clearDatabase();
  await clearQRCodesDirectory();
  await rebuildDatabaseFromCSV(process.env.CSV_LOCATION); // Provide the path to your CSV file
};

run();
