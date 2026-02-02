# SendGrid Email Not Sending - Troubleshooting Guide

## Current Status
- ✅ Domain `afrozy.com` verified in SendGrid
- ✅ Backend code updated to send verification emails
- ✅ Frontend redirects to verification page
- ❌ Emails not being received

## Issue: Gmail Sender Warning
SendGrid shows warning: "Attempting to send from a free email address domain like gmail.com is not recommended"

## Solution: Use Domain Email

Since `afrozy.com` is verified in SendGrid, you can send from ANY email at that domain without creating individual senders.

### Step 1: Update Render Environment Variables

**Go to Render Dashboard → Your API Service → Environment Tab**

Update these variables:

```
SMTP_FROM_EMAIL=noreply@afrozy.com
```

**IMPORTANT**: Make sure `SMTP_PASS` has your actual SendGrid API key (starts with `SG.`)

### Step 2: Restart the Service

After updating environment variables:
1. Go to **Manual Deploy** tab
2. Click **"Clear build cache & deploy"** or **"Restart Service"**
3. Wait 2-3 minutes for service to restart

### Step 3: Test Email Sending

After restart, try:
1. Register a new store owner account
2. Or login with existing unverified account
3. Check inbox (and spam folder)

## Alternative: Verify Gmail as Sender (Quick Fix)

If you want to keep using `drivanokande4985@gmail.com` temporarily:

### In SendGrid Dashboard:

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **"Create New Sender"**
3. Fill in:
   ```
   From Name: Afrozy Marketplace
   From Email: drivanokande4985@gmail.com
   Reply To: drivanokande4985@gmail.com
   Company Address: [Your address]
   City: [Your city]
   Country: [Your country]
   ```
4. Click **"Create"**
5. Check your email (`drivanokande4985@gmail.com`)
6. Click the verification link
7. Wait for "Sender verified successfully!"

Then in Render, keep:
```
SMTP_FROM_EMAIL=drivanokande4985@gmail.com
```

## Checking SendGrid Activity Feed

To see what's happening with email sending attempts:

1. **Go to SendGrid Dashboard**
2. **Email API** → **Activity Feed**
3. Look for recent send attempts
4. Check for errors like:
   - "Sender not verified"
   - "Invalid API key"
   - "Insufficient permissions"
   - "Daily limit exceeded"

## Common Issues

### Issue 1: API Key Not Set or Invalid
**Symptom**: No emails sent, no errors in Activity Feed
**Solution**:
- Verify `SMTP_PASS` in Render has actual API key (starts with `SG.`)
- Create new API key if needed (Settings → API Keys)
- Ensure API key has "Mail Send" permission

### Issue 2: Sender Not Verified
**Symptom**: SendGrid Activity Feed shows "Sender not verified" error
**Solution**:
- Use `noreply@afrozy.com` (domain already verified)
- OR verify individual sender email in SendGrid

### Issue 3: Wrong Environment Variable Name
**Symptom**: Backend logs show "Email service not configured"
**Solution**:
- Variable must be exactly `SMTP_FROM_EMAIL` (not `SMTP_FROM` or `FROM_EMAIL`)
- Check spelling and capitalization

### Issue 4: Service Not Restarted
**Symptom**: Changes made but emails still not sending
**Solution**:
- Manually restart Render service
- Environment changes require restart to take effect

## Recommended Setup (Production)

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_actual_api_key_here
SMTP_FROM_NAME=Afrozy Marketplace
SMTP_FROM_EMAIL=noreply@afrozy.com
```

**Benefits of using domain email:**
- ✅ Professional appearance
- ✅ Better deliverability (less likely to go to spam)
- ✅ No individual sender verification needed
- ✅ Can use multiple addresses (support@, hello@, notifications@)

## Testing Email Service

After making changes, test with:

1. **Register new store owner**
2. **Check email arrives** (including spam folder)
3. **Verify code works**
4. **Login successfully**

If still not working, check:
- Render service logs for SMTP errors
- SendGrid Activity Feed for send attempts
- Email inbox spam/junk folder

## Getting Help

If emails still not sending:

1. **Check Render Logs**:
   - Go to Render Dashboard → Your service → Logs tab
   - Look for errors mentioning "SMTP", "SendGrid", or "email"

2. **Check SendGrid Activity Feed**:
   - Shows all send attempts and their status
   - Includes error messages for failed sends

3. **Verify Environment Variables**:
   - In Render, check all SMTP variables are set
   - No typos in variable names
   - API key is complete (not truncated)

## Quick Checklist

- [ ] `afrozy.com` domain verified in SendGrid ✅
- [ ] `SMTP_PASS` in Render has actual API key (starts with `SG.`)
- [ ] `SMTP_FROM_EMAIL` set to `noreply@afrozy.com`
- [ ] Render service restarted after environment changes
- [ ] Checked SendGrid Activity Feed for send attempts
- [ ] Checked Render logs for SMTP errors
- [ ] Checked email spam/junk folder
