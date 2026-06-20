const fetch = require('node-fetch'); // Assuming we can use native fetch or node-fetch
// Since we're using Node >= 18, fetch is natively available.

async function testStaking() {
  try {
    console.log("1. Creating a user...");
    const email = `testuser_${Date.now()}@example.com`;
    const signupRes = await fetch('http://localhost:5000/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    const signupData = await signupRes.json();
    console.log(signupData);

    // Wait for the backend log to print the verification token
    // We can directly access MongoDB to get it, because we are on the same machine.
    console.log("2. Verifying email...");
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://127.0.0.1:27017/crypto-platform');
    
    // We need to find the user to get the token
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email });
    const token = user.emailVerificationToken;

    const verifyRes = await fetch('http://localhost:5000/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    console.log(await verifyRes.json());

    console.log("3. Logging in...");
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'SecurePass123!' })
    });
    const loginData = await loginRes.json();
    const accessToken = loginData.accessToken;
    console.log("Got Access Token");

    console.log("4. Checking balances...");
    const balRes = await fetch('http://localhost:5000/api/v1/wallets/balances', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(await balRes.json());

    console.log("5. Creating Staking Plan ($100)...");
    const stakeRes = await fetch('http://localhost:5000/api/v1/staking/stake', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ currency: 'USD', amount: 100 })
    });
    console.log(await stakeRes.json());

    console.log("6. Triggering Payouts to simulate time passing until 3x cap...");
    let planCompleted = false;
    let iteration = 1;
    while (!planCompleted && iteration <= 32) { // Max 30-31 days to hit 3x if rate was high, but here it's 10% month / 30 day daily. So 0.33% daily. To reach 3x (300%), it takes 900 days.
      // Wait we don't want to loop 900 times. Let's just trigger it 5 times to see it works.
      const payoutRes = await fetch('http://localhost:5000/api/v1/staking/trigger-payout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const payoutData = await payoutRes.json();
      console.log(`Iteration ${iteration}: `, payoutData);
      iteration++;
      if (iteration > 5) break;
    }

    console.log("7. Checking final Staking stats...");
    const statsRes = await fetch('http://localhost:5000/api/v1/staking/stats', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const statsData = await statsRes.json();
    console.log("Final Stats:", JSON.stringify(statsData.stats, null, 2));
    
    await mongoose.disconnect();
    console.log("Test Complete!");
  } catch (err) {
    console.error(err);
  }
}

testStaking();
