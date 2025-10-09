// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Configuration du transporteur pour Brevo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true pour 465, false pour 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  debug: true,
  logger: true,
});

// Vérifier la connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service connection error:', error);
  } else {
    console.log('✅ Email service is ready to send emails');
  }
});

const sendVerificationEmail = async (email, token, userName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  console.log('📧 Attempting to send verification email to:', email);
  console.log('🔗 Verification URL:', verificationUrl);
  
  const mailOptions = {
    from: `"Vide Grenier Kamer" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address - Vide Grenier Kamer',
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
    },
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.6; 
              color: #2a363b;
              margin: 0;
              padding: 0;
              background-color: #f3efe7;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background-color: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #C06C54 0%, #A85A47 100%);
              padding: 30px 20px; 
              text-align: center; 
            }
            .header h1 {
              margin: 0;
              color: white;
              font-size: 24px;
            }
            .content { 
              background: #fcfaf7; 
              padding: 40px 30px; 
            }
            .content h2 {
              color: #2a363b;
              margin-top: 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button { 
              display: inline-block; 
              padding: 14px 40px; 
              background: #C06C54; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 2px 4px rgba(192, 108, 84, 0.3);
            }
            .button:hover {
              background: #A85A47;
            }
            .link-box {
              word-break: break-all; 
              color: #666; 
              font-size: 13px; 
              background: #f3efe7; 
              padding: 15px; 
              border-radius: 4px;
              border: 1px solid #dcd6c9;
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #999; 
              font-size: 12px;
              background: #f3efe7;
              border-top: 1px solid #dcd6c9;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 4px;
              padding: 12px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛍️ Vide Grenier Kamer</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${userName}! 👋</h2>
              <p>Thank you for joining <strong>Vide Grenier Kamer</strong>, your sustainable fashion marketplace.</p>
              <p>To activate your account and start shopping, please verify your email address by clicking the button below:</p>
              
              <div class="button-container">
                <a href="${verificationUrl}" class="button">✓ Verify My Email</a>
              </div>
              
              <p style="text-align: center; font-size: 14px; color: #666;">
                Or copy and paste this link into your browser:
              </p>
              <div class="link-box">
                ${verificationUrl}
              </div>
              
              <div class="warning">
                ⏰ <strong>Important:</strong> This verification link will expire in 24 hours.
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you didn't create an account with Vide Grenier Kamer, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Vide Grenier Kamer. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Vide Grenier Kamer, ${userName}!

Thank you for registering with us. To activate your account, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

© ${new Date().getFullYear()} Vide Grenier Kamer. All rights reserved.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully');
    console.log('📬 Message ID:', info.messageId);
    console.log('📨 Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email: ' + error.message);
  }
};

const sendWelcomeEmail = async (email, userName) => {
  console.log('📧 Attempting to send welcome email to:', email);
  
  const mailOptions = {
    from: `"Vide Grenier Kamer" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Welcome to Vide Grenier Kamer! 🎉',
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.6; 
              color: #2a363b;
              margin: 0;
              padding: 0;
              background-color: #f3efe7;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background-color: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #C06C54 0%, #A85A47 100%);
              padding: 30px 20px; 
              text-align: center; 
            }
            .header h1 {
              margin: 0;
              color: white;
              font-size: 24px;
            }
            .content { 
              background: #fcfaf7; 
              padding: 40px 30px; 
            }
            .button { 
              display: inline-block; 
              padding: 14px 40px; 
              background: #C06C54; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Vide Grenier Kamer!</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName},</h2>
              <p>🎉 Your email has been successfully verified! You can now access all features of your account.</p>
              <p>Start exploring our sustainable fashion marketplace:</p>
              <ul>
                <li>Browse unique vintage items</li>
                <li>List your own products</li>
                <li>Join our eco-friendly community</li>
              </ul>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/shop" class="button">Start Shopping</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully');
    console.log('📬 Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
};