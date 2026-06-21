const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info.bright.future.ser@gmail.com',
    pass: 'frncxlgzkubsrdkn',
  },
});

transporter.sendMail({
  from: '"Crypto Platform" <info.bright.future.ser@gmail.com>',
  to: 'info.bright.future.ser@gmail.com',
  subject: 'SMTP Password Test Successful!',
  text: 'If you receive this email, it means your new App Password is correct and working perfectly!',
}, (err, info) => {
  if (err) {
    console.error('Error sending email:', err);
  } else {
    console.log('Email sent successfully:', info.response);
  }
});
