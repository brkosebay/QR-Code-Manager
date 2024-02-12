const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Create a directory for QR codes if it doesn't exist
const qrCodeDir = path.join(__dirname, 'qr_codes');
if (!fs.existsSync(qrCodeDir)){
    fs.mkdirSync(qrCodeDir, { recursive: true });
}

const generateAndSaveQRCode = async (emails, token) => {
  // Sanitize the email to use in a filename
  const sanitizedEmails = emails.map(email => 
    email.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  ).join('-');
  const filePath = path.join(qrCodeDir, `${sanitizedEmails}-${token}.png`);

  // Generate QR code and save as an image file
  await QRCode.toFile(filePath, `http://${process.env.HOSTNAME}:3000/validate/${token}`);

  return filePath;
};

module.exports = {
    generateAndSaveQRCode
  };