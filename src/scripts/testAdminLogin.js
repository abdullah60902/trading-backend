const fetch = global.fetch || require('node-fetch');
const fs = require('fs');

(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@abdullah.com', password: 'Abdullah@123' }),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('HEADERS', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));
    console.log('BODY', text);
  } catch (err) {
    console.error('ERROR', err);
  }
})();
