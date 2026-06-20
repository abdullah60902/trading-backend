const fetch = global.fetch || require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/v1/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    console.log('status', res.status);
    console.log('set-cookie', res.headers.get('set-cookie'));
    const body = await res.text();
    console.log('body', body);
  } catch (err) {
    console.error('ERROR', err);
  }
})();
