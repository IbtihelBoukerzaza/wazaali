# EmailJS Setup Guide - No Backend Required

## What is EmailJS?
EmailJS is a service that lets you send emails directly from your React Native app without needing a backend server.

## Setup Steps

### 1. Create EmailJS Account
1. Go to: https://www.emailjs.com/
2. Click "Sign Up" (Free plan available)
3. Create account with your email

### 2. Create Email Service
1. After login, click "Add New Email Service"
2. Choose your email provider (Gmail, Outlook, etc.)
3. Configure your email service with SMTP settings

### 3. Create Email Templates

#### Approval Template
1. Click "Add New Template"
2. Template Name: "Account Approved"
3. Subject: "تمت الموافقة على حسابك في وزعلي ✅"
4. HTML Content:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">وزعلي</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">منصة إدارة الملبنات والمحلات</p>
  </div>
  <div style="padding: 30px; background: white; margin: 20px; border-radius: 8px; direction: rtl; text-align: right;">
    <h2 style="color: #333; font-size: 22px; margin-bottom: 15px;">مرحباً {{user_name}}،</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.8;">
      نود إعلامك بأنه تمت <strong style="color: #4CAF50;">الموافقة</strong> على حسابك كـ<strong>{{user_role}}</strong> في منصة وزعلي.
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
  <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; direction: rtl;">
    <p style="margin: 0;">هذا بريد إلكتروني تلقائي من منصة وزعلي. لا ترد على هذا البريد.</p>
    <p style="margin: 5px 0 0 0;">© 2024 وزعلي - جميع الحقوق محفوظة</p>
  </div>
</div>
```

#### Rejection Template
1. Click "Add New Template"  
2. Template Name: "Account Rejected"
3. Subject: "تم رفض حسابك في وزعلي ❌"
4. HTML Content:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #f44336, #d32f2f); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">وزعلي</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">منصة إدارة الملبنات والمحلات</p>
  </div>
  <div style="padding: 30px; background: white; margin: 20px; border-radius: 8px; direction: rtl; text-align: right;">
    <h2 style="color: #333; font-size: 22px; margin-bottom: 15px;">مرحباً {{user_name}}،</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.8;">
      نأسف لإعلامك بأنه تم <strong style="color: #f44336;">رفض</strong> حسابك كـ<strong>{{user_role}}</strong> في منصة وزعلي.
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
  <div style="padding: 20px; text-align: center; color: #999; font-size: 12px; direction: rtl;">
    <p style="margin: 0;">هذا بريد إلكتروني تلقائي من منصة وزعلي. لا ترد على هذا البريد.</p>
    <p style="margin: 5px 0 0 0;">© 2024 وزعلي - جميع الحقوق محفوظة</p>
  </div>
</div>
```

### 4. Get Your Credentials
1. Go to "Account" → "Integration" → "API Keys"
2. Copy your:
   - **Service ID**
   - **Public Key**  
   - **Template IDs** (for approved and rejected templates)

### 5. Update Your Code

Replace the placeholders in `firestoreService.js`:

```javascript
await emailjs.send(
  'YOUR_SERVICE_ID',           // Your EmailJS service ID
  'YOUR_APPROVED_TEMPLATE_ID', // Approved template ID
  emailParams,
  'YOUR_PUBLIC_KEY'           // Your EmailJS public key
);
```

### 6. Test Your Setup
1. Build your APK
2. Test admin approve/reject functionality
3. Check if emails are sent to users

## Benefits of EmailJS
✅ **No backend server needed**
✅ **Works directly from React Native**
✅ **Free tier available** (200 emails/month)
✅ **Easy to setup**
✅ **No deployment issues**

## Next Steps
1. Create EmailJS account
2. Setup email service and templates
3. Update code with your credentials
4. Build and test APK
5. Your emails will work perfectly!
