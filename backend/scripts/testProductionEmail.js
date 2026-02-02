/**
 * Test Production Email Configuration
 * Tests SendGrid email sending in production environment
 *
 * Usage: node backend/scripts/testProductionEmail.js <email>
 */

require('dotenv').config({ path: '.env.production' });

async function testProductionEmail() {
  console.log('🧪 Testing Production Email Configuration (SendGrid)...\n');

  const testEmail = process.argv[2] || 'bloombeauteonline@gmail.com';

  console.log('Environment Variables:');
  console.log('✓ SMTP_HOST:', process.env.SMTP_HOST);
  console.log('✓ SMTP_PORT:', process.env.SMTP_PORT);
  console.log('✓ SMTP_USER:', process.env.SMTP_USER);
  console.log('✓ SMTP_PASS:', process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0, 10)}...` : 'NOT SET');
  console.log('✓ SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || 'NOT SET');
  console.log('✓ SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME || 'NOT SET');
  console.log();

  // Check if all required vars are set
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ ERROR: Missing required SMTP environment variables!');
    console.error('   Make sure SMTP_HOST, SMTP_USER, and SMTP_PASS are set in Render.');
    process.exit(1);
  }

  if (process.env.SMTP_PASS === 'YOUR_SENDGRID_API_KEY_HERE') {
    console.error('❌ ERROR: SMTP_PASS is still set to placeholder value!');
    console.error('   You need to replace it with your actual SendGrid API key in Render environment variables.');
    process.exit(1);
  }

  if (!process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM_EMAIL.includes('yourdomain.com')) {
    console.error('❌ ERROR: SMTP_FROM_EMAIL is not properly configured!');
    console.error('   Current value:', process.env.SMTP_FROM_EMAIL);
    console.error('   It should be: drivanokande4985@gmail.com (or noreply@afrozy.com if domain verified)');
    process.exit(1);
  }

  console.log(`📧 Attempting to send test email to: ${testEmail}\n`);

  // Import email service
  const emailService = require('../utils/emailService');

  if (!emailService.isConfigured) {
    console.error('❌ Email service is not configured!');
    console.error('   This means the emailService.js detected missing or invalid configuration.');
    process.exit(1);
  }

  console.log('✅ Email service is configured\n');

  try {
    const testCode = '123456';
    console.log(`Sending verification code: ${testCode}`);
    console.log(`To: ${testEmail}`);
    console.log(`From: ${process.env.SMTP_FROM_EMAIL}\n`);

    const result = await emailService.sendVerificationCode(
      testEmail,
      'Test User',
      testCode
    );

    if (result) {
      console.log('\n✅ SUCCESS! Email sent successfully!');
      console.log('Check your inbox (and spam folder) at:', testEmail);
      console.log('\n🎉 SendGrid is working correctly in production!');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED! Email was not sent.');
      console.log('Check the error messages above for details.');
      console.log('\nCommon issues:');
      console.log('1. Invalid SendGrid API key');
      console.log('2. Sender email not verified in SendGrid');
      console.log('3. SendGrid account suspended');
      console.log('4. API key permissions insufficient (needs Mail Send access)');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Verify SendGrid API key is correct (starts with SG.)');
    console.error('2. Check that sender email is verified in SendGrid dashboard');
    console.error('3. Ensure API key has "Mail Send" permissions');
    console.error('4. Check SendGrid Activity Feed for more details');
    process.exit(1);
  }
}

testProductionEmail();
