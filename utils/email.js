const nodemailer = require('nodemailer');

// Create a transporter object with SMTP server details
let transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., for Gmail
  auth: {
    user: process.env.MAIL_USER, // Your email
    pass: process.env.MAIL_PASSWORD, // Your email password or App Password
  },
});

async function sendEmail(email, code) {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '👍 Todo-App 👍',
    to: email,
    subject: 'Your 2-Step Verification Code',
    text: `Your code is: ${code}`,
  });
}

module.exports = sendEmail;
