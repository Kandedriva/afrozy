/**
 * SendGrid Email Test Script
 * Tests if SendGrid is properly configured and can send emails
 *
 * Usage: node backend/scripts/testSendGridEmail.js your-email@example.com
 */

require('dotenv').config();
const emailService = require('../utils/emailService');

async function testSendGridEmail() {
  console.log('🧪 Testing SendGrid Email Configuration...\n');

  // Get test email from command line argument or use default
  const testEmail = process.argv[2] || 'drivanokande4985@gmail.com';

  console.log('Configuration:');
  console.log('✓ SMTP_HOST:', process.env.SMTP_HOST);
  console.log('✓ SMTP_PORT:', process.env.SMTP_PORT);
  console.log('✓ SMTP_USER:', process.env.SMTP_USER);
  console.log('✓ SMTP_PASS:', process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0, 10)}...` : 'NOT SET');
  console.log('✓ SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || 'NOT SET');
  console.log('✓ Email Service Configured:', emailService.isConfigured);
  console.log();

  if (!emailService.isConfigured) {
    console.error('❌ Email service is not configured!');
    console.error('   Make sure SMTP_HOST, SMTP_USER, and SMTP_PASS are set in your .env file');
    process.exit(1);
  }

  console.log(`📧 Sending test verification email to: ${testEmail}\n`);

  try {
    const testCode = '123456';
    const result = await emailService.sendVerificationCode(
      testEmail,
      'Test User',
      testCode
    );

    if (result) {
      console.log('✅ SUCCESS! Email sent successfully!');
      console.log('\nCheck your inbox (and spam folder) at:', testEmail);
      console.log('Verification code in email:', testCode);
      console.log('\n🎉 SendGrid is configured correctly!');
      process.exit(0);
    } else {
      console.error('❌ FAILED! Email was not sent.');
      console.error('   Check the error messages above for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Invalid SendGrid API key');
    console.error('2. Sender email not verified in SendGrid');
    console.error('3. SendGrid account suspended or restricted');
    console.error('4. Network/firewall blocking SMTP connection');
    process.exit(1);
  }
}

testSendGridEmail();
