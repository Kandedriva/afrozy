# SendGrid Email Setup Guide for Afrozy

## Current Status

You've started the SendGrid domain authentication process and received: **`em3172.afrozy.com`**

This means SendGrid is ready to send emails on behalf of `afrozy.com`, but you need to complete DNS configuration.

## Quick Start (Get Emails Working Now)

### Step 1: Verify a Single Sender Email (5 minutes)

This is the fastest way to get emails working immediately:

1. **Go to SendGrid Dashboard**: https://app.sendgrid.com/
2. **Navigate to**: Settings → Sender Authentication → Single Sender Verification
3. **Click**: "Create New Sender"
4. **Fill in the form**:
   ```
   From Name: Afrozy Marketplace
   From Email Address: drivanokande4985@gmail.com
   Reply To: drivanokande4985@gmail.com
   Company Address: [Your address]
   City: [Your city]
   Country: [Your country]
   ```
5. **Click "Create"**
6. **Check your email** (drivanokande4985@gmail.com) for verification link
7. **Click the verification link** in the email
8. **Wait for confirmation** "Sender verified successfully!"

### Step 2: Get Your SendGrid API Key

1. **Go to**: Settings → API Keys → Create API Key
2. **Name it**: "Afrozy Email Service"
3. **Permissions**: Choose "Restricted Access"
4. **Enable only**: "Mail Send" → Full Access
5. **Click "Create & View"**
6. **Copy the API key** (starts with `SG.`) - you'll only see this once!
7. **Save it securely** - you'll need it for the next step

### Step 3: Update Production Environment Variables

Update these 2 variables on your hosting platform (Render/Railway/Heroku):

```env
SMTP_PASS=SG.your_actual_api_key_here
SMTP_FROM_EMAIL=drivanokande4985@gmail.com
```

**On Render**:
1. Dashboard → Your API Service → Environment Tab
2. Find `SMTP_PASS` and update with your SendGrid API key
3. Find `SMTP_FROM_EMAIL` and update to `drivanokande4985@gmail.com`
4. Click "Save Changes"
5. Service will auto-redeploy

**On Railway**:
1. Dashboard → Your Project → Variables Tab
2. Edit `SMTP_PASS` → Paste your SendGrid API key
3. Edit `SMTP_FROM_EMAIL` → `drivanokande4985@gmail.com`
4. Service will auto-restart

**On Heroku**:
1. Dashboard → Your App → Settings → Config Vars
2. Edit `SMTP_PASS` → Your SendGrid API key
3. Edit `SMTP_FROM_EMAIL` → `drivanokande4985@gmail.com`
4. App will auto-restart

### Step 4: Test Email Verification

1. **Register a new account** on afrozy.com
2. **Check your email inbox** (and spam folder)
3. **Enter the 6-digit verification code**
4. **Success!** Email verification is working

---

## Long-term Solution: Complete Domain Authentication

For production at scale, you should complete domain authentication to use `noreply@afrozy.com`.

### Why Domain Authentication?

✅ Professional: Emails from `noreply@afrozy.com` instead of `drivanokande4985@gmail.com`
✅ Better deliverability: Reduced chance of emails going to spam
✅ Brand trust: Customers trust emails from your domain
✅ Higher limits: SendGrid gives better sending limits to verified domains

### Steps to Complete Domain Authentication

#### 1. Get DNS Records from SendGrid

1. **Go to**: Settings → Sender Authentication → Authenticate Your Domain
2. **You should see**: Domain verification in progress for `afrozy.com`
3. **Click**: "View DNS Records" or "DNS Settings"
4. **SendGrid will show** 3 CNAME records like:

```
CNAME: em3172.afrozy.com → u12345678.wl123.sendgrid.net
CNAME: s1._domainkey.afrozy.com → s1.domainkey.u12345678.wl123.sendgrid.net
CNAME: s2._domainkey.afrozy.com → s2.domainkey.u12345678.wl123.sendgrid.net
```

#### 2. Add DNS Records to Your Domain

**If using Cloudflare** (most likely for afrozy.com):

1. **Login to Cloudflare Dashboard**: https://dash.cloudflare.com/
2. **Select**: afrozy.com domain
3. **Go to**: DNS → Records
4. **Click**: "Add record"
5. **For each CNAME record from SendGrid**:
   ```
   Type: CNAME
   Name: em3172
   Target: u12345678.wl123.sendgrid.net
   Proxy status: DNS only (turn off orange cloud)
   TTL: Auto
   ```
6. **Repeat** for the other 2 CNAME records (s1._domainkey and s2._domainkey)
7. **Click "Save"**

**If using GoDaddy/Namecheap/Other**:

1. Login to your domain registrar
2. Find DNS Management / DNS Settings
3. Add the 3 CNAME records from SendGrid
4. Save changes

#### 3. Verify Domain in SendGrid

1. **Go back to SendGrid**: Settings → Sender Authentication
2. **Click**: "Verify" next to afrozy.com
3. **Wait**: DNS propagation can take 5 minutes to 48 hours
4. **Check status**: Refresh the page every few hours
5. **Once verified**: You'll see a green checkmark ✅

#### 4. Update Production to Use Domain Email

Once domain is verified, update your production environment:

```env
SMTP_FROM_EMAIL=noreply@afrozy.com
```

You can also use:
- `support@afrozy.com`
- `hello@afrozy.com`
- `notifications@afrozy.com`

These don't need to be real email addresses - they just need the domain to be verified in SendGrid.

---

## Troubleshooting

### Emails not sending

**Check 1**: Is your API key correct?
```bash
# Test your API key
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer YOUR_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"your-verified-sender@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

**Check 2**: Is your sender verified?
- Go to SendGrid → Settings → Sender Authentication
- Make sure you see a green checkmark next to your email

**Check 3**: Check SendGrid Activity Feed
- Go to Email API → Activity Feed
- See if emails are being sent and any errors

### Emails going to spam

**Solution**: Complete domain authentication (steps above)

Additional tips:
- Don't use words like "verify", "click here" in subject lines
- Keep HTML clean and simple
- Include plain text version (already done in emailService.js)
- Add an unsubscribe link for marketing emails

### Domain verification stuck

**Common issues**:

1. **Orange cloud enabled in Cloudflare**
   - Solution: Turn off proxy (grey cloud) for CNAME records

2. **Wrong DNS records**
   - Solution: Double-check you copied exactly from SendGrid

3. **DNS not propagated**
   - Solution: Wait up to 48 hours, check with `dig em3172.afrozy.com`

4. **Using root domain instead of subdomain**
   - Solution: Use `em3172` not `em3172.afrozy.com` in Cloudflare

---

## SendGrid Limits

### Free Plan (Current)
- **100 emails/day**
- Perfect for testing and initial launch
- All features included

### Essentials Plan ($19.95/month)
- **50,000 emails/month** (1,667/day)
- Recommended when you have 100+ daily signups

### Pro Plan ($89.95/month)
- **100,000 emails/month** (3,333/day)
- For established marketplaces

---

## Email Templates Included

Your email service (`backend/utils/emailService.js`) already includes beautiful HTML templates for:

✅ **Email Verification** - 6-digit code with 15-min expiration
✅ **Welcome Email** - After successful verification
✅ **Order Confirmation** - Purchase details
✅ **Order Shipped** - Tracking information
✅ **Order Delivered** - Delivery confirmation
✅ **Refund Confirmation** - Refund processing

All emails are:
- Mobile responsive
- Include plain text fallback
- Professionally designed with Afrozy branding
- Include proper email headers to avoid spam

---

## Summary

### Immediate Fix (Working Now):
1. ✅ Verify single sender email in SendGrid
2. ✅ Get API key
3. ✅ Update `SMTP_PASS` and `SMTP_FROM_EMAIL` in production
4. ✅ Test registration

### Long-term (Next Steps):
1. Add DNS records to Cloudflare/domain registrar
2. Wait for domain verification
3. Update `SMTP_FROM_EMAIL` to `noreply@afrozy.com`
4. Monitor SendGrid Activity Feed

---

## Need Help?

If you run into issues:

1. **Check SendGrid Dashboard** → Email API → Activity Feed
2. **Check backend logs** for SMTP errors
3. **Test API key** with curl command above
4. **Verify DNS records** with `dig em3172.afrozy.com`

SendGrid Support: https://support.sendgrid.com/
Documentation: https://docs.sendgrid.com/
