// backend/services/emailServiceAPI.js
const SibApiV3Sdk = require('@sendinblue/client');

// Configuration de l'API Brevo
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Fonction pour envoyer l'email de vérification
const sendVerificationEmail = async (to, token, firstName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  console.log('📧 ========================================');
  console.log('📧 SENDING VERIFICATION EMAIL VIA BREVO API');
  console.log('📧 To:', to);
  console.log('🔗 Verification URL:', verificationUrl);
  console.log('📧 ========================================');
  
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = 'Verify Your Email - Vide Grenier Kamer';
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background-color: #f3efe7; 
          margin: 0; 
          padding: 0; 
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background: white; 
          border-radius: 10px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
        }
        .header { 
          background: #2a363b; 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content { 
          padding: 40px 30px; 
          color: #333;
          line-height: 1.6;
        }
        .button { 
          display: inline-block; 
          padding: 15px 40px; 
          background: #C06C54; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background: #a85644;
        }
        .footer { 
          background: #f3efe7; 
          padding: 20px; 
          text-align: center; 
          font-size: 12px; 
          color: #666; 
        }
        .link-text {
          color: #666;
          font-size: 12px;
          word-break: break-all;
          background: #f9f9f9;
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Vide Grenier Kamer!</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Thank you for creating an account with <strong>Vide Grenier Kamer</strong>!</p>
          <p>We're excited to have you join our sustainable fashion community.</p>
          <p>Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">✓ Verify My Email</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <div class="link-text">${verificationUrl}</div>
          <p><strong>⏰ This link will expire in 24 hours.</strong></p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          <p><strong>Vide Grenier Kamer</strong></p>
          <p>Sustainable Fashion, Second Chances</p>
          <p>© 2025 Vide Grenier Kamer. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  sendSmtpEmail.sender = { 
    name: 'Vide Grenier Kamer', 
    email: process.env.EMAIL_FROM 
  };
  sendSmtpEmail.to = [{ email: to, name: firstName }];
  
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ ========================================');
    console.log('✅ EMAIL SENT SUCCESSFULLY VIA BREVO API');
    console.log('✅ Message ID:', data.messageId);
    console.log('✅ ========================================');
    return data;
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR SENDING EMAIL VIA BREVO API');
    console.error('❌ Error:', error.message);
    console.error('❌ Response:', error.response?.body);
    console.error('❌ ========================================');
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// Fonction pour envoyer l'email de bienvenue
const sendWelcomeEmail = async (to, firstName) => {
  console.log('📧 Sending welcome email via Brevo API to:', to);
  
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = 'Welcome to Vide Grenier Kamer! 🎉';
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background-color: #f3efe7; 
          margin: 0; 
          padding: 0; 
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background: white; 
          border-radius: 10px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
        }
        .header { 
          background: linear-gradient(135deg, #C06C54 0%, #a85644 100%);
          color: white; 
          padding: 40px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
        }
        .content { 
          padding: 40px 30px; 
          color: #333;
          line-height: 1.6;
        }
        .button { 
          display: inline-block; 
          padding: 15px 40px; 
          background: #2a363b; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background: #1a2328;
        }
        .feature {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          border-left: 4px solid #C06C54;
          border-radius: 5px;
        }
        .footer { 
          background: #f3efe7; 
          padding: 20px; 
          text-align: center; 
          font-size: 12px; 
          color: #666; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome Aboard!</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Your email has been verified successfully! 🎊</p>
          <p>You're now part of the <strong>Vide Grenier Kamer</strong> community - where sustainable fashion meets style!</p>
          
          <div class="feature">
            <strong>🛍️ Start Shopping</strong><br>
            Discover unique, pre-loved items at great prices.
          </div>
          
          <div class="feature">
            <strong>💚 Shop Sustainably</strong><br>
            Every purchase helps reduce textile waste.
          </div>
          
          <div class="feature">
            <strong>✨ Sell Your Items</strong><br>
            Turn your closet gems into cash.
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/shop" class="button">🛍️ Start Shopping Now</a>
          </p>
          
          <p style="margin-top: 30px;">Happy shopping!</p>
          <p><strong>The Vide Grenier Kamer Team</strong></p>
        </div>
        <div class="footer">
          <p><strong>Vide Grenier Kamer</strong></p>
          <p>Sustainable Fashion, Second Chances</p>
          <p>© 2025 Vide Grenier Kamer. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  sendSmtpEmail.sender = { 
    name: 'Vide Grenier Kamer', 
    email: process.env.EMAIL_FROM 
  };
  sendSmtpEmail.to = [{ email: to, name: firstName }];
  
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Welcome email sent successfully via Brevo API');
    console.log('📧 Message ID:', data.messageId);
    return data;
  } catch (error) {
    console.error('⚠️ Error sending welcome email:', error.message);
    // Ne pas throw ici pour ne pas bloquer le processus
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
};