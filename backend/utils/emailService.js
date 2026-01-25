/**
 * Email Service Utility
 * Handles all email sending operations using NodeMailer
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with SMTP configuration
   */
  initializeTransporter() {
    try {
      // Check if email configuration exists
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  Email service not configured. SMTP credentials missing.');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });

      this.isConfigured = true;
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send verification code email
   * @param {string} email - Recipient email address
   * @param {string} name - Recipient name
   * @param {string} verificationCode - 6-digit verification code
   * @returns {Promise<boolean>} Success status
   */
  async sendVerificationCode(email, name, verificationCode) {
    if (!this.isConfigured) {
      console.error('Email service not configured. Cannot send verification code.');
      // In development, log the code instead
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [DEV MODE] Verification code for ${email}: ${verificationCode}`);
        return true; // Return success in dev mode
      }
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email - Afrozy Marketplace',
        html: this.getVerificationEmailTemplate(name, verificationCode),
        text: this.getVerificationEmailText(name, verificationCode)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${email}:`, error.message);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   * @param {string} email - Recipient email address
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeEmail(email, name) {
    if (!this.isConfigured) {
      console.log(`📧 [DEV MODE] Welcome email would be sent to ${email}`);
      return true;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Afrozy Marketplace!',
        html: this.getWelcomeEmailTemplate(name),
        text: this.getWelcomeEmailText(name)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
      return false;
    }
  }

  /**
   * HTML template for verification email
   */
  getVerificationEmailTemplate(name, code) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Afrozy Marketplace</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Verify Your Email Address</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Hi ${name},
                            </p>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Thank you for registering with Afrozy Marketplace! To complete your registration, please enter the verification code below:
                            </p>

                            <!-- Verification Code -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; display: inline-block;">
                                            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                ${code}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0 0 10px 0;">
                                This code will expire in <strong>15 minutes</strong>.
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0;">
                                If you didn't create an account with Afrozy Marketplace, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                                © ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
  }

  /**
   * Plain text version of verification email
   */
  getVerificationEmailText(name, code) {
    return `
Afrozy Marketplace - Verify Your Email Address

Hi ${name},

Thank you for registering with Afrozy Marketplace! To complete your registration, please enter the verification code below:

Verification Code: ${code}

This code will expire in 15 minutes.

If you didn't create an account with Afrozy Marketplace, you can safely ignore this email.

© ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * HTML template for welcome email
   */
  getWelcomeEmailTemplate(name) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Afrozy Marketplace</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Afrozy!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${name}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Your email has been successfully verified. You're all set to start shopping on Afrozy Marketplace!
                            </p>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                                Explore thousands of products from verified stores and enjoy a seamless shopping experience.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.FRONTEND_URL || 'https://afrozy.com'}"
                                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                            Start Shopping
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                                © ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
  }

  /**
   * Plain text version of welcome email
   */
  getWelcomeEmailText(name) {
    return `
Welcome to Afrozy Marketplace!

Hi ${name},

Your email has been successfully verified. You're all set to start shopping on Afrozy Marketplace!

Explore thousands of products from verified stores and enjoy a seamless shopping experience.

Visit: ${process.env.FRONTEND_URL || 'https://afrozy.com'}

© ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
