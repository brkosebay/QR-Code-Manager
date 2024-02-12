const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const sendEmailWithQRCode = async (email, identifier) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const qrCodeDataURL = await QRCode.toDataURL(`http://${process.env.IP_ADDR}:3000/validate/${identifier}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Your QR Code',
    html: `<p>Here's your QR code:</p><img src="${qrCodeDataURL}" alt="QR Code"/>`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmailWithQRCode
};
