# Email Setup Options

## Option 1: Resend (RECOMMENDED - Most Reliable) ✅

**Resend** is the easiest and most reliable email service for Render.

### Setup:
1. Go to https://resend.com/dashboard
2. Sign up (free tier available)
3. Get your API Key from the dashboard
4. Add to Render:
   - Go to Render Dashboard → Environment Variables
   - Add: `RESEND_API_KEY` = your API key from Resend
   - Redeploy

**Benefits:**
- ✅ No timeout issues on Render
- ✅ Free tier: 100 emails/day
- ✅ Excellent deliverability
- ✅ Official nodemailer support

---

## Option 2: Keep Gmail SMTP

If you prefer Gmail, the variables are already set:
- `EMAIL_HOST`: smtp.gmail.com
- `EMAIL_PORT`: 465
- `EMAIL_USER`: info.bright.future.ser@gmail.com
- `EMAIL_PASS`: frncxlgzkubsrdkn

**Note:** Gmail SMTP from cloud servers can have connectivity issues. Resend is more reliable.

---

## How It Works:

The code automatically prioritizes:
1. **Resend** (if RESEND_API_KEY is set) - PREFERRED
2. **Gmail SMTP** (if EMAIL_HOST/EMAIL_USER are set) - Fallback

---

## Testing:

```bash
# Test Gmail locally
node test-gmail-setup.js

# Test Mailtrap (if needed)
node test-mailer-setup.js
```

---

## Recommended Action:

✅ **Use Resend** - Get your API key from https://resend.com and add it to Render
