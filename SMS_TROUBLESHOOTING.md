# SMS Troubleshooting Guide

## Issue: SMS Not Received

If SMS messages are not being received, follow these steps:

### Step 1: Check Server Console

When you assign a trip, check the server console output. You should see one of these:

**✅ SMS Sent Successfully:**
```
[SMS SENT ✅] To: 9944352689
[SMS SENT ✅] Request ID: 12345678
[SMS SENT ✅] Message: Trip Assignment...
```

**❌ SMS Failed:**
```
[SMS ERROR ❌] Failed to send SMS to 9944352689: [error message]
[SMS SIMULATION] To: 9944352689
```

**⚠️ API Key Not Set:**
```
[SMS SIMULATION] To: 9944352689
💡 Get FREE SMS: Sign up at https://www.fast2sms.com/ and add FAST2SMS_API_KEY to .env
```

### Step 2: Verify API Key

1. Check `.env` file has `FAST2SMS_API_KEY` set
2. Restart server after adding API key
3. Verify API key is correct in Fast2SMS dashboard

### Step 3: Check Phone Number Format

**Correct Format (10 digits for India):**
- ✅ `9944352689`
- ✅ `+919944352689` (will be auto-converted)

**Wrong Format:**
- ❌ `+9944352689` (extra +)
- ❌ `994435268` (9 digits)
- ❌ `99443526891` (11 digits)

### Step 4: Check Fast2SMS Dashboard

1. Login to https://www.fast2sms.com/
2. Go to **"SMS Logs"** or **"Reports"**
3. Check if SMS was sent and delivery status
4. Verify you have credit balance (₹50 free on signup)

### Step 5: Test API Directly

You can test the API directly using curl:

```bash
curl -X POST https://www.fast2sms.com/dev/bulkV2 \
  -H "authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "route": "q",
    "message": "Test message",
    "language": "english",
    "numbers": "9944352689"
  }'
```

### Step 6: Common Issues

**Issue: "Invalid API Key"**
- Solution: Check API key in Fast2SMS dashboard → API section
- Make sure there are no extra spaces in `.env` file

**Issue: "Insufficient Balance"**
- Solution: Add credit to Fast2SMS account
- Free tier: ₹50 credit on signup

**Issue: "Invalid Number"**
- Solution: Check phone number is exactly 10 digits
- Remove country code (+91) if present

**Issue: "DLT Registration Required"**
- Solution: For production, register DLT template in Fast2SMS
- For testing, use route "q" (quick route)

### Step 7: Enable Debug Logging

The server now logs full API responses. Check console for:
```
[SMS API Response] Status: 200
[SMS API Response] Body: { ... }
```

This will show exactly what Fast2SMS API is returning.

### Step 8: Alternative: Use Simulation Mode

If SMS is not critical for testing:
- Remove `FAST2SMS_API_KEY` from `.env`
- System will use simulation mode (console logs only)
- You can still see credentials in manager dashboard popup

## Quick Fix Checklist

- [ ] API key added to `.env` file
- [ ] Server restarted after adding API key
- [ ] Phone number is 10 digits (Indian format)
- [ ] Fast2SMS account has credit balance
- [ ] Check Fast2SMS dashboard for SMS logs
- [ ] Check server console for error messages

## Still Not Working?

1. Check server console for detailed error messages
2. Verify API key in Fast2SMS dashboard
3. Test with a different phone number
4. Check Fast2SMS account status
5. Contact Fast2SMS support if API key is valid but SMS not sending
