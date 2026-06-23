const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,         // STARTTLS - works on Render
  secure: false,     // false for port 587
  auth: {
    user: 'info.bright.future.ser@gmail.com',
    pass: 'frncxlgzkubsrdkn',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP Verify Failed:', err.message);
  } else {
    console.log('SMTP Connected! Now sending...');
    transporter.sendMail({
      from: '"Crypto Platform" <info.bright.future.ser@gmail.com>',
      to: 'info.bright.future.ser@gmail.com',
      subject: 'Test Port 587 - Render ke liye Fix',
      text: 'Port 587 STARTTLS se email aayi! Render par bhi kaam karega.',
    }, (err2, info) => {
      if (err2) {
        console.error('Send Error:', err2.message);
      } else {
        console.log('SUCCESS! Email sent:', info.response);
      }
    });
  }
});
