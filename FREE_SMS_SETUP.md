# FREE SMS Setup Guide - Fast2SMS (100% Free!)

This guide will help you set up **completely FREE SMS** using Fast2SMS for trip assignments, cancellations, and emergency alerts.

## 🎉 Why Fast2SMS?

- ✅ **100% FREE** - Get ₹50 free credit on signup (no credit card needed!)
- ✅ **No Payment Required** - Works without any payment
- ✅ **Made for India** - Perfect for Indian phone numbers
- ✅ **Easy Setup** - Just need an API key
- ✅ **Reliable** - Used by 2+ million users

## Quick Setup (3 minutes)

### Step 1: Sign Up for Fast2SMS (FREE)

1. Go to **https://www.fast2sms.com/**
2. Click **"Sign Up"** or **"Register"**
3. Fill in your details:
   - Name
   - Email
   - Mobile number
   - Password
4. Verify your email and mobile number
5. **You'll get ₹50 FREE credit!** 🎁

### Step 2: Get Your API Key

1. **Log in** to your Fast2SMS account
2. Go to **"API"** section in the dashboard
3. Click **"Generate API Key"** or find your existing API key
4. **Copy the API key** (it looks like: `AbCdEfGhIjKlMnOpQrStUvWxYz123456`)

### Step 3: Add API Key to `.env` File

Open your `.env` file and add:

```env
FAST2SMS_API_KEY=your_api_key_here
```

**Example:**
```env
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
FAST2SMS_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

### Step 4: Restart Your Server

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Test SMS

1. Assign a trip to a driver in the Manager Dashboard
2. Check the server console - you should see:
   ```
   [SMS SENT ✅] To: 9944352689
   [SMS SENT ✅] Request ID: 12345678
   [SMS SENT ✅] Message: Trip Assignment...
   ```
3. The driver should receive a **real SMS message**! 📱

## Phone Number Format

**For India:** Use **10-digit phone numbers** (no country code needed)
- ✅ Correct: `9944352689`
- ✅ Correct: `+919944352689` (will be auto-converted)
- ❌ Wrong: `+9944352689` (extra +)

The system automatically:
- Removes country code (91)
- Removes + sign
- Formats to 10 digits

## Free Credit & Pricing

- **Free Credit:** ₹50 on signup (approximately 450 SMS messages)
- **Pricing:** ₹0.11 per SMS (very cheap!)
- **No Credit Card Required** for free tier
- **Top Up:** Add more credit when needed (optional)

## Troubleshooting

### SMS Not Sending?

1. **Check API Key:**
   ```bash
   # Make sure it's set in .env
   echo $FAST2SMS_API_KEY
   ```

2. **Check Phone Number:**
   - Must be 10 digits for India
   - No spaces or special characters
   - Example: `9944352689`

3. **Check Fast2SMS Dashboard:**
   - Go to Fast2SMS dashboard
   - Check "SMS Logs" to see delivery status
   - Verify you have credit balance

4. **Common Errors:**
   - `Invalid API Key` - Check your API key in .env
   - `Insufficient Balance` - Add credit to your Fast2SMS account
   - `Invalid Number` - Check phone number format (must be 10 digits)

### Fallback to Simulation

If API key is missing, the system will automatically fall back to SMS simulation (console logs only). You'll see:
```
💡 Get FREE SMS: Sign up at https://www.fast2sms.com/ and add FAST2SMS_API_KEY to .env
```

## Alternative Free Options

If Fast2SMS doesn't work for you, here are other **FREE** options:

### 1. MSG91 (Free Tier)
- Sign up: https://msg91.com/
- Free tier available
- Good for India

### 2. TextLocal (Free Tier)
- Sign up: https://www.textlocal.in/
- Free SMS for testing
- India-focused

## Support

- **Fast2SMS Support:** https://www.fast2sms.com/help
- **Fast2SMS Docs:** https://www.fast2sms.com/developer
- **Check SMS Logs:** Login to Fast2SMS dashboard → SMS Logs

---

**Remember:** This is 100% FREE! No payment required! 🎉
