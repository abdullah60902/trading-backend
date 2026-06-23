const { Resend } = require('resend');

const client = new Resend('re_Xre8TrWD_J2hPYj5Rt9DazU1LLBeiEvyD');

client.emails.send({
  from: 'Crypto Platform <onboarding@resend.dev>',
  to: 'info.bright.future.ser@gmail.com',
  subject: 'Test - Resend Email Working!',
  html: '<h2 style="color:green">Email kaam kar rahi hai!</h2><p>Resend se email aayi. Render par bhi chalega!</p>'
}).then(({ data, error }) => {
  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS! Email sent. Message ID:', data.id);
  }
}).catch(err => console.error('Exception:', err.message));
