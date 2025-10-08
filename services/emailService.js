// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Configuration du transporteur
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Vérifier la connexion
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('Email service ready');
  }
});

const sendVerificationEmail = async (email, token, userName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"Vide Grenier Kamer" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #2a363b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3efe7; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fcfaf7; padding: 30px; border: 1px solid #dcd6c9; }
            .button { display: inline-block; padding: 12px 30px; background: #C06C54; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #2a363b;">Vide Grenier Kamer</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${userName}!</h2>
              <p>Thank you for registering with Vide Grenier Kamer. Please verify your email address to activate your account.</p>
              <p>Click the button below to verify your email:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Vide Grenier Kamer. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', email);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

const sendWelcomeEmail = async (email, userName) => {
  const mailOptions = {
    from: `"Vide Grenier Kamer" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Welcome to Vide Grenier Kamer!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #2a363b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3efe7; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fcfaf7; padding: 30px; border: 1px solid #dcd6c9; }
            .button { display: inline-block; padding: 12px 30px; background: #C06C54; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #2a363b;">Welcome to Vide Grenier Kamer!</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName},</h2>
              <p>Your email has been successfully verified! You can now access all features of your account.</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" class="button">Start Shopping</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
};