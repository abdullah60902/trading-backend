/**
 * Test Mailtrap Email Configuration
 * Run: node test-mailer-setup.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const config = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: parseInt(process.env.EMAIL_PORT) === 465, // SSL for 465, TLS for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  rejectUnauthorized: false,
};

console.log('\n📧 EMAIL CONFIGURATION TEST');
console.log('==============================');
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}`);
console.log(`Secure (SSL): ${config.secure}`);
console.log(`User: ${config.auth.user}`);
console.log(`Pass: ${config.auth.pass ? '***' + config.auth.pass.slice(-4) : 'NOT SET'}`);
console.log('==============================\n');

const transporter = nodemailer.createTransport(config);

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Connection FAILED:');
    console.log(error);
    process.exit(1);
  } else {
    console.log('✅ Connection SUCCESS!');
    console.log('Server is ready to send emails\n');
    
    // Send test email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@cryptoplatform.com',
      to: 'delivery@sandbox.mailtrap.io', // Mailtrap's default test inbox
      subject: 'CryptoPlatform - Email Setup Test ✅',
      html: `
        <h2>Email Setup Test Successful!</h2>
        <p>If you see this email in your Mailtrap inbox, your nodemailer setup is working correctly.</p>
        <hr>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${config.host}</li>
          <li>Port: ${config.port}</li>
          <li>Security: ${config.secure ? 'SSL' : 'TLS (STARTTLS)'}</li>
        </ul>
        <p style="color: green; font-weight: bold;">✅ Ready for production!</p>
      `,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Email Send FAILED:');
        console.log(error);
        process.exit(1);
      } else {
        console.log('✅ Email Send SUCCESS!');
        console.log(`Message ID: ${info.messageId}`);
        console.log(`Response: ${info.response}`);
        console.log('\n📬 Check your Mailtrap inbox for the test email\n');
        process.exit(0);
      }
    });
  }
});
