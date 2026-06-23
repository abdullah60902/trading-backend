// Test Brevo API
require('dotenv').config();
const API_KEY = process.env.BREVO_API_KEY;
if (!API_KEY) { console.error('BREVO_API_KEY not set in .env'); process.exit(1); }

fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'api-key': API_KEY,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    sender: { name: 'Crypto Platform', email: 'info.bright.future.ser@gmail.com' },
    to: [{ email: 'info.bright.future.ser@gmail.com' }],
    subject: 'Test - Brevo API Working on Render!',
    htmlContent: '<h2 style="color:green">✅ Brevo API se email aayi!</h2><p>Render par bhi kaam karega.</p>'
  })
})
.then(res => res.json())
.then(data => {
  if (data.messageId) {
    console.log('✅ SUCCESS! Email sent. Message ID:', data.messageId);
  } else {
    console.error('❌ ERROR:', JSON.stringify(data, null, 2));
  }
})
.catch(err => console.error('❌ Exception:', err.message));
