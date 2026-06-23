/**
 * Test Gmail Email Configuration
 * Run: node test-gmail-setup.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const config = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: parseInt(process.env.EMAIL_PORT) === 465, // SSL for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

console.log('\n📧 GMAIL EMAIL CONFIGURATION TEST');
console.log('=====================================');
console.log(`✓ Host: ${config.host}`);
console.log(`✓ Port: ${config.port} (SSL: ${config.secure})`);
console.log(`✓ User: ${config.auth.user}`);
console.log(`✓ Pass: ***${config.auth.pass.slice(-4)}`);
console.log('=====================================\n');

const transporter = nodemailer.createTransport(config);

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Connection FAILED:');
    console.log(error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!\n');
    
    // Send test email to yourself
    const testEmail = process.env.EMAIL_USER; // Send to same email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: testEmail,
      subject: '🎉 CryptoPlatform - Email Setup Working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00e676;">✅ Email Configuration Successful!</h2>
          <p>Your nodemailer + Gmail setup is working perfectly.</p>
          
          <hr>
          <h3>Configuration Details:</h3>
          <ul>
            <li><strong>Host:</strong> ${config.host}</li>
            <li><strong>Port:</strong> ${config.port}</li>
            <li><strong>Security:</strong> SSL</li>
            <li><strong>Account:</strong> ${testEmail}</li>
          </ul>
          
          <hr>
          <p style="color: green; font-weight: bold; font-size: 16px;">✨ Ready for Production!</p>
          <p>Your email verification and password reset features are now active.</p>
        </div>
      `,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Email Send FAILED:');
        console.log(error.message);
        process.exit(1);
      } else {
        console.log('✅ Test Email Sent Successfully!');
        console.log(`📨 Message ID: ${info.messageId}`);
        console.log(`\n📬 Check your Gmail inbox: ${testEmail}\n`);
        process.exit(0);
      }
    });
  }
});
