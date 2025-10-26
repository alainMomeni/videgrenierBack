// backend/controllers/contactController.js
const { sendContactNotification, sendContactConfirmation } = require('../services/emailServiceAPI');

// ============================================
// SUBMIT CONTACT FORM
// ============================================
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    console.log('📬 ========================================');
    console.log('📬 NEW CONTACT FORM SUBMISSION');
    console.log('📬 Name:', name);
    console.log('📬 Email:', email);
    console.log('📬 Subject:', subject);
    console.log('📬 ========================================');

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Envoyer l'email de notification à l'admin
    try {
      await sendContactNotification({ name, email, subject, message });
      console.log('✅ Notification email sent to admin');
    } catch (emailError) {
      console.error('❌ Failed to send notification email:', emailError.message);
      return res.status(500).json({ 
        message: 'Failed to send your message. Please try again or contact us directly at ' + process.env.EMAIL_FROM,
        emailError: true
      });
    }

    // Envoyer l'email de confirmation à l'utilisateur
    try {
      await sendContactConfirmation({ name, email, subject, message });
      console.log('✅ Confirmation email sent to user');
    } catch (emailError) {
      console.log('⚠️ Failed to send confirmation email to user:', emailError.message);
      // Ne pas bloquer si la confirmation échoue
    }

    console.log('✅ ========================================');
    console.log('✅ CONTACT FORM PROCESSED SUCCESSFULLY');
    console.log('✅ ========================================');

    res.status(200).json({
      message: 'Thank you for contacting us! We will get back to you soon.',
      success: true
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ CONTACT FORM ERROR');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};