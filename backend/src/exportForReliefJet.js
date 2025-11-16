require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const crypto = require('crypto');
const Respondent = require('./models/respondentModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

/**
 * Generate SHA-256 hash from email (same as in rebuildDatabase.js)
 */
const generateHashFromEmail = (email) => {
  return crypto.createHash('sha256').update(email).digest('hex');
};

/**
 * Exports respondent data to CSV format for ReliefJet mail merge
 * Merges original CSV emails with generated QR code paths
 * Creates a CSV with columns: Email1, Email2, QRCodePath, Token
 */
const exportToCSVForReliefJet = async () => {
  try {
    const csvFilePath = process.env.CSV_LOCATION;

    if (!csvFilePath || !fs.existsSync(csvFilePath)) {
      console.error(`Error: CSV file not found at ${csvFilePath}`);
      console.error('Please ensure CSV_LOCATION is set correctly in .env file');
      process.exit(1);
    }

    console.log('Reading original CSV file...');
    console.log(`CSV Location: ${csvFilePath}`);

    // Read original CSV file
    const originalCsvData = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => originalCsvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Found ${originalCsvData.length} entries in original CSV.`);

    console.log('Fetching respondents from database...');

    // Get all respondents from MongoDB
    const respondents = await Respondent.find({});

    if (respondents.length === 0) {
      console.log('No respondents found in database. Please run rebuildDatabase.js first.');
      process.exit(1);
    }

    console.log(`Found ${respondents.length} respondents in database.`);

    // Prepare CSV content
    const csvRows = [];

    // CSV Header - compatible with ReliefJet mail merge
    // Email1: Primary recipient email
    // Email2: Secondary email (if exists)
    // QRCodePath: Full path to QR code PNG file (for attachment)
    // Token: Unique token for this respondent
    // ValidationURL: Direct URL to validate the QR code
    csvRows.push('Email1;Email2;QRCodePath;Token;ValidationURL');

    // QR codes directory path
    const qrCodeDir = path.join(__dirname, 'utils', 'qr_codes');

    // Track statistics
    let matched = 0;
    let notMatched = 0;
    let noQRCode = 0;

    // Process each row from original CSV
    for (const row of originalCsvData) {
      const email1 = row.Email1 && row.Email1.trim() !== '' ? row.Email1.trim() : '';
      const email2 = row.Email2 && row.Email2.trim() !== '' ? row.Email2.trim() : '';

      if (!email1 && !email2) {
        console.warn('Warning: Row with no emails found, skipping...');
        continue;
      }

      // Generate hashes for these emails (same logic as rebuildDatabase.js)
      const emails = [email1, email2].filter(e => e !== '');
      const identifiers = emails.map(email => generateHashFromEmail(email));

      // Find matching respondent in database
      const respondent = respondents.find(r =>
        r.identifiers.some(id => identifiers.includes(id))
      );

      if (!respondent) {
        console.warn(`Warning: No respondent found for emails: ${emails.join(', ')}`);
        notMatched++;
        continue;
      }

      // Find QR code file for this respondent
      const qrCodeFiles = fs.readdirSync(qrCodeDir).filter(file =>
        file.endsWith(`-${respondent.token}.png`)
      );

      if (qrCodeFiles.length === 0) {
        console.warn(`Warning: No QR code found for token ${respondent.token}`);
        noQRCode++;
        continue;
      }

      const qrCodeFileName = qrCodeFiles[0];
      const qrCodePath = path.join(qrCodeDir, qrCodeFileName);

      // Validation URL
      const validationURL = `http://${process.env.HOSTNAME}:3000/validate/${respondent.token}`;

      // Add to CSV
      csvRows.push(`${email1};${email2};${qrCodePath};${respondent.token};${validationURL}`);
      matched++;
    }

    // Write CSV file
    const outputPath = path.join(__dirname, '..', 'reliefjet_mailmerge.csv');
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log('CSV EXPORT COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`Output file: ${outputPath}`);
    console.log(`\nStatistics:`);
    console.log(`  ✓ Successfully matched: ${matched}`);
    console.log(`  ✗ Not matched in database: ${notMatched}`);
    console.log(`  ✗ Missing QR code: ${noQRCode}`);
    console.log(`  Total rows in output: ${csvRows.length - 1} (excluding header)`);
    console.log('\n' + '='.repeat(60));
    console.log('NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('1. Open ReliefJet Essentials for Outlook');
    console.log('2. Go to Mail Merge utility');
    console.log('3. Select the generated CSV as data source:');
    console.log(`   ${outputPath}`);
    console.log('4. Map the QRCodePath column to attachment field');
    console.log('5. Use Email1 as recipient address');
    console.log('6. Create your email template with merge fields');
    console.log('7. Run the mail merge to send emails with QR codes');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    process.exit(1);
  }
};

// Run the export
exportToCSVForReliefJet();
