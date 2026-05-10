require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Verify admin secret key
const verifyAdmin = (req, res, next) => {
  const { adminSecretKey } = req.body;
  if (adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// Create transporter based on email service
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'brevo') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  // Default: Gmail
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

// Email templates
const getEmailTemplate = (status, userName, userRole) => {
  const roleLabel = userRole === 'dairy_owner' ? 'صاحب ملبنة' : 'صاحب محل';

  if (status === 'approved') {
    return {
      subject: 'تمت الموافقة على حسابك في وزعلي ✅',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">وزعلي</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">منصة إدارة الملبنات والمحلات</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px; background: white; margin: 20px; border-radius: 8px; direction: rtl; text-align: right;">
            <h2 style="color: #333; font-size: 22px; margin-bottom: 15px;">مرحباً ${userName}،</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.8;">
              نود إعلامك بأنه تمت <strong style="color: #4CAF50;">الموافقة</strong> على حسابك كـ<strong>${roleLabel}</strong> في منصة وزعلي.
            </p>
            <div style="background: #e8f5e9; border-right: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #2e7d32; font-size: 15px;">
                ✅ يمكنك الآن تسجيل الدخول واستخدام جميع خدمات المنصة
              </p>
            </div>
            <a href="https://waze3li.firebaseapp.com" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-size: 16px; margin-top: 10px;">
              تسجيل الدخول الآن
            </a>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; direction: rtl;">
            <p style="margin: 0;">هذا بريد إلكتروني تلقائي من منصة وزعلي. لا ترد على هذا البريد.</p>
            <p style="margin: 5px 0 0 0;">© 2024 وزعلي - جميع الحقوق محفوظة</p>
          </div>
        </div>
      `,
    };
  }

  // Rejected
  return {
    subject: 'تم رفض حسابك في وزعلي ❌',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f44336, #d32f2f); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">وزعلي</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">منصة إدارة الملبنات والمحلات</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: white; margin: 20px; border-radius: 8px; direction: rtl; text-align: right;">
          <h2 style="color: #333; font-size: 22px; margin-bottom: 15px;">مرحباً ${userName}،</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.8;">
            نأسف لإعلامك بأنه تم <strong style="color: #f44336;">رفض</strong> حسابك كـ<strong>${roleLabel}</strong> في منصة وزعلي.
          </p>
          <div style="background: #ffebee; border-right: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #c62828; font-size: 15px;">
              ❌ يمكنك إنشاء حساب جديد بنفس البريد الإلكتروني أو التواصل مع الدعم الفني
            </p>
          </div>
          <a href="mailto:support@waze3li.com" style="display: inline-block; background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-size: 16px; margin-top: 10px;">
            تواصل مع الدعم الفني
          </a>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; direction: rtl;">
          <p style="margin: 0;">هذا بريد إلكتروني تلقائي من منصة وزعلي. لا ترد على هذا البريد.</p>
          <p style="margin: 5px 0 0 0;">© 2024 وزعلي - جميع الحقوق محفوظة</p>
        </div>
      </div>
    `,
  };
};

// POST /api/send-status-email
app.post('/api/send-status-email', verifyAdmin, async (req, res) => {
  try {
    const { userEmail, status, userName, userRole } = req.body;

    if (!userEmail || !status || !userName) {
      return res.status(400).json({
        success: false,
        error: 'userEmail, status, and userName are required',
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status must be "approved" or "rejected"',
      });
    }

    const transporter = createTransporter();
    const template = getEmailTemplate(status, userName, userRole || 'user');

    const mailOptions = {
      from: `"وزعلي - Waze3li" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: template.subject,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${userEmail}: ${status} - MessageId: ${info.messageId}`);

    res.json({
      success: true,
      message: `Email sent to ${userEmail}`,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Waze3li email server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
});
