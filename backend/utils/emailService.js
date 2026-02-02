/**
 * Email Service Utility
 * Handles all email sending operations using SendGrid HTTP API or NodeMailer SMTP
 */

const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    this.transporter = null;
    this.useSendGrid = false;
    this.isConfigured = false;
    this.initializeService();
  }

  /**
   * Initialize email service with SendGrid HTTP API (preferred) or SMTP fallback
   */
  initializeService() {
    try {
      // Check for SendGrid API key (preferred method - no firewall issues)
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.useSendGrid = true;
        this.isConfigured = true;
        console.log('✅ Email service configured successfully (SendGrid HTTP API)');
        return;
      }

      // Fallback to SMTP if SendGrid API key not available
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }
        });
        this.useSendGrid = false;
        this.isConfigured = true;
        console.log('✅ Email service configured successfully (SMTP)');
        return;
      }

      console.warn('⚠️  Email service not configured. Set SENDGRID_API_KEY or SMTP credentials.');
      this.isConfigured = false;
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
      // Use SendGrid HTTP API (preferred)
      if (this.useSendGrid) {
        const msg = {
          to: email,
          from: {
            email: process.env.SMTP_FROM_EMAIL || 'noreply@afrozy.com',
            name: process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'
          },
          subject: 'Verify Your Email - Afrozy Marketplace',
          html: this.getVerificationEmailTemplate(name, verificationCode),
          text: this.getVerificationEmailText(name, verificationCode)
        };

        await sgMail.send(msg);
        console.log(`✅ Verification email sent to ${email} via SendGrid HTTP API`);
        return true;
      }

      // Fallback to SMTP
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email - Afrozy Marketplace',
        html: this.getVerificationEmailTemplate(name, verificationCode),
        text: this.getVerificationEmailText(name, verificationCode)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email} via SMTP: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${email}:`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Error code: ${error.code}`);
      console.error(`❌ Error response:`, error.response?.body || error.response);
      console.error(`❌ Full error:`, error);

      // Log SendGrid HTTP API specific error details
      if (error.response && error.response.body) {
        console.error(`❌ SendGrid API error details:`, error.response.body);
      }

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

  /**
   * Send order confirmation email
   * @param {string} email - Customer email address
   * @param {string} name - Customer name
   * @param {object} orderDetails - Order information
   * @returns {Promise<boolean>} Success status
   */
  async sendOrderConfirmation(email, name, orderDetails) {
    if (!this.isConfigured) {
      console.log(`📧 [DEV MODE] Order confirmation email would be sent to ${email}`);
      console.log('Order Details:', JSON.stringify(orderDetails, null, 2));
      return true;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Confirmation #${orderDetails.orderId} - Afrozy Marketplace`,
        html: this.getOrderConfirmationTemplate(name, orderDetails),
        text: this.getOrderConfirmationText(name, orderDetails)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order confirmation email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send order confirmation email to ${email}:`, error.message);
      return false;
    }
  }

  /**
   * Send order shipped email
   * @param {string} email - Customer email address
   * @param {string} name - Customer name
   * @param {object} orderDetails - Order information with tracking
   * @returns {Promise<boolean>} Success status
   */
  async sendOrderShipped(email, name, orderDetails) {
    if (!this.isConfigured) {
      console.log(`📧 [DEV MODE] Order shipped email would be sent to ${email}`);
      console.log('Order Details:', JSON.stringify(orderDetails, null, 2));
      return true;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Your Order #${orderDetails.orderId} Has Shipped! - Afrozy Marketplace`,
        html: this.getOrderShippedTemplate(name, orderDetails),
        text: this.getOrderShippedText(name, orderDetails)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order shipped email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send order shipped email to ${email}:`, error.message);
      return false;
    }
  }

  /**
   * Send order delivered email
   * @param {string} email - Customer email address
   * @param {string} name - Customer name
   * @param {object} orderDetails - Order information
   * @returns {Promise<boolean>} Success status
   */
  async sendOrderDelivered(email, name, orderDetails) {
    if (!this.isConfigured) {
      console.log(`📧 [DEV MODE] Order delivered email would be sent to ${email}`);
      console.log('Order Details:', JSON.stringify(orderDetails, null, 2));
      return true;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Your Order #${orderDetails.orderId} Has Been Delivered! - Afrozy Marketplace`,
        html: this.getOrderDeliveredTemplate(name, orderDetails),
        text: this.getOrderDeliveredText(name, orderDetails)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Order delivered email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send order delivered email to ${email}:`, error.message);
      return false;
    }
  }

  /**
   * HTML template for order confirmation email
   */
  getOrderConfirmationTemplate(name, orderDetails) {
    const itemsHtml = orderDetails.items.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
          <strong style="color: #333333;">${item.name}</strong>
          <br/>
          <span style="color: #666666; font-size: 14px;">Quantity: ${item.quantity}</span>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">
          <strong style="color: #333333;">$${item.price.toFixed(2)}</strong>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✓ Order Confirmed!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Thank you for your order, ${name}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                We've received your order and are getting it ready. You'll receive another email when your order ships.
                            </p>

                            <!-- Order Number -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Order Number</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 20px; font-weight: bold;">#${orderDetails.orderId}</p>
                                    </td>
                                    <td align="right">
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Order Date</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 16px;">${new Date(orderDetails.orderDate).toLocaleDateString()}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Order Items -->
                            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Order Items</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                                ${itemsHtml}
                                <tr>
                                    <td style="padding: 20px; background-color: #f8f9fa; text-align: right; font-weight: bold; color: #333333; font-size: 18px;" colspan="2">
                                        Total: $${orderDetails.totalAmount.toFixed(2)}
                                    </td>
                                </tr>
                            </table>

                            <!-- Delivery Address -->
                            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Delivery Address</h3>
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; color: #666666; line-height: 1.6;">
                                <strong style="color: #333333;">${orderDetails.deliveryName}</strong><br/>
                                ${orderDetails.deliveryAddress}<br/>
                                ${orderDetails.deliveryCity}, ${orderDetails.deliveryState} ${orderDetails.deliveryZip}<br/>
                                ${orderDetails.deliveryCountry}<br/>
                                Phone: ${orderDetails.deliveryPhone}
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.FRONTEND_URL || 'https://afrozy.com'}/account"
                                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                            View Order Details
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
   * Plain text version of order confirmation email
   */
  getOrderConfirmationText(name, orderDetails) {
    const itemsList = orderDetails.items.map(item =>
      `${item.name} - Quantity: ${item.quantity} - $${item.price.toFixed(2)}`
    ).join('\n');

    return `
Order Confirmation - Afrozy Marketplace

Thank you for your order, ${name}!

We've received your order and are getting it ready. You'll receive another email when your order ships.

Order Number: #${orderDetails.orderId}
Order Date: ${new Date(orderDetails.orderDate).toLocaleDateString()}

ORDER ITEMS:
${itemsList}

Total: $${orderDetails.totalAmount.toFixed(2)}

DELIVERY ADDRESS:
${orderDetails.deliveryName}
${orderDetails.deliveryAddress}
${orderDetails.deliveryCity}, ${orderDetails.deliveryState} ${orderDetails.deliveryZip}
${orderDetails.deliveryCountry}
Phone: ${orderDetails.deliveryPhone}

View your order details: ${process.env.FRONTEND_URL || 'https://afrozy.com'}/account

© ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * HTML template for order shipped email
   */
  getOrderShippedTemplate(name, orderDetails) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📦 Your Order Has Shipped!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Good news, ${name}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Your order is on its way! Your package has been shipped and should arrive soon.
                            </p>

                            <!-- Order Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Order Number</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 20px; font-weight: bold;">#${orderDetails.orderId}</p>
                                    </td>
                                    <td align="right">
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Shipped Date</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 16px;">${new Date().toLocaleDateString()}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Delivery Address -->
                            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Delivering To</h3>
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; color: #666666; line-height: 1.6;">
                                <strong style="color: #333333;">${orderDetails.deliveryName}</strong><br/>
                                ${orderDetails.deliveryAddress}<br/>
                                ${orderDetails.deliveryCity}, ${orderDetails.deliveryState} ${orderDetails.deliveryZip}<br/>
                                Phone: ${orderDetails.deliveryPhone}
                            </div>

                            <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                                You'll receive another email when your order is delivered.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.FRONTEND_URL || 'https://afrozy.com'}/account"
                                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                            Track Your Order
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
   * Plain text version of order shipped email
   */
  getOrderShippedText(name, orderDetails) {
    return `
Your Order Has Shipped! - Afrozy Marketplace

Good news, ${name}!

Your order is on its way! Your package has been shipped and should arrive soon.

Order Number: #${orderDetails.orderId}
Shipped Date: ${new Date().toLocaleDateString()}

DELIVERING TO:
${orderDetails.deliveryName}
${orderDetails.deliveryAddress}
${orderDetails.deliveryCity}, ${orderDetails.deliveryState} ${orderDetails.deliveryZip}
Phone: ${orderDetails.deliveryPhone}

You'll receive another email when your order is delivered.

Track your order: ${process.env.FRONTEND_URL || 'https://afrozy.com'}/account

© ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * HTML template for order delivered email
   */
  getOrderDeliveredTemplate(name, orderDetails) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Delivered</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Order Delivered!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Your order has arrived, ${name}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Your package has been successfully delivered. We hope you love your purchase!
                            </p>

                            <!-- Order Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Order Number</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 20px; font-weight: bold;">#${orderDetails.orderId}</p>
                                    </td>
                                    <td align="right">
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Delivered Date</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 16px;">${new Date().toLocaleDateString()}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0;">
                                Thank you for shopping with Afrozy Marketplace! We'd love to hear about your experience.
                            </p>

                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.FRONTEND_URL || 'https://afrozy.com'}/account"
                                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px; margin: 0 10px 10px 0;">
                                            View Order
                                        </a>
                                        <a href="${process.env.FRONTEND_URL || 'https://afrozy.com'}"
                                           style="display: inline-block; background-color: #ffffff; border: 2px solid #667eea; color: #667eea; text-decoration: none; padding: 13px 38px; border-radius: 5px; font-weight: bold; font-size: 16px; margin: 0 0 10px 0;">
                                            Continue Shopping
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
   * Plain text version of order delivered email
   */
  getOrderDeliveredText(name, orderDetails) {
    return `
Order Delivered! - Afrozy Marketplace

Your order has arrived, ${name}!

Your package has been successfully delivered. We hope you love your purchase!

Order Number: #${orderDetails.orderId}
Delivered Date: ${new Date().toLocaleDateString()}

Thank you for shopping with Afrozy Marketplace! We'd love to hear about your experience.

View your order: ${process.env.FRONTEND_URL || 'https://afrozy.com'}/account
Continue shopping: ${process.env.FRONTEND_URL || 'https://afrozy.com'}

© ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
This is an automated message, please do not reply to this email.
    `;
  }

  /**
   * Send refund confirmation email
   * @param {string} email - Customer email address
   * @param {string} name - Customer name
   * @param {object} refundDetails - Refund information
   * @returns {Promise<boolean>} Success status
   */
  async sendRefundConfirmation(email, name, refundDetails) {
    if (!this.isConfigured) {
      console.log(`📧 [DEV MODE] Refund confirmation email would be sent to ${email}`);
      console.log('Refund Details:', JSON.stringify(refundDetails, null, 2));
      return true;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Afrozy Marketplace'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Refund Processed for Order #${refundDetails.orderId} - Afrozy Marketplace`,
        html: this.getRefundConfirmationTemplate(name, refundDetails),
        text: this.getRefundConfirmationText(name, refundDetails)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Refund confirmation email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send refund confirmation email to ${email}:`, error.message);
      return false;
    }
  }

  /**
   * HTML template for refund confirmation email
   */
  getRefundConfirmationTemplate(name, refundDetails) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💰 Refund Processed</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Your refund has been processed, ${name}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                We've successfully processed your ${refundDetails.refundType} refund request. The refund should appear in your account within 5-10 business days.
                            </p>

                            <!-- Refund Details -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Refund Amount</p>
                                        <p style="margin: 5px 0 15px 0; color: #10b981; font-size: 32px; font-weight: bold;">$${refundDetails.refundAmount.toFixed(2)}</p>
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Order Number</p>
                                        <p style="margin: 5px 0 15px 0; color: #333333; font-size: 18px; font-weight: bold;">#${refundDetails.orderId}</p>
                                        <p style="margin: 0; color: #666666; font-size: 14px;">Refund ID</p>
                                        <p style="margin: 5px 0 0 0; color: #333333; font-size: 16px;">#${refundDetails.refundId}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Refund Info -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    <strong>Please Note:</strong> Refunds typically take 5-10 business days to appear on your original payment method. The exact timing depends on your bank or card issuer.
                                </p>
                            </div>

                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0;">
                                If you have any questions about this refund, please contact our support team.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.FRONTEND_URL || 'https://afrozy.com'}/account"
                                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                            View Order History
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
   * Plain text version of refund confirmation email
   */
  getRefundConfirmationText(name, refundDetails) {
    return `
Refund Processed - Afrozy Marketplace

Your refund has been processed, ${name}!

We've successfully processed your ${refundDetails.refundType} refund request. The refund should appear in your account within 5-10 business days.

Refund Amount: $${refundDetails.refundAmount.toFixed(2)}
Order Number: #${refundDetails.orderId}
Refund ID: #${refundDetails.refundId}

PLEASE NOTE:
Refunds typically take 5-10 business days to appear on your original payment method. The exact timing depends on your bank or card issuer.

If you have any questions about this refund, please contact our support team.

View your order history: ${process.env.FRONTEND_URL || 'https://afrozy.com'}/account

© ${new Date().getFullYear()} Afrozy Marketplace. All rights reserved.
This is an automated message, please do not reply to this email.
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
