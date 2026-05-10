# Waze3li Backend - Email Service

Backend server for sending email notifications when admin approves/rejects user accounts.

## Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Email Service

Edit `.env` file:

**Option 1: Gmail (Free)**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-character-app-password
```

**Option 2: Brevo (300 emails/day free)**
```env
EMAIL_SERVICE=brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_APP_PASSWORD=your-brevo-smtp-key
```

**Gmail Setup:**
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Step Verification
3. Create App Password (16 characters)
4. Use App Password in `.env`

**Brevo Setup:**
1. Sign up at https://www.brevo.com
2. Get SMTP credentials from Settings → SMTP & API
3. Use credentials in `.env`

### 3. Start Server
```bash
npm start
# or for development with auto-restart
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

### POST /api/send-status-email
Sends email notification to user about account status.

**Request:**
```json
{
  "userEmail": "user@example.com",
  "status": "approved" | "rejected",
  "userName": "User Name",
  "userRole": "dairy_owner" | "shop_owner",
  "adminSecretKey": "waze3li-admin-secret-2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent to user@example.com",
  "messageId": "abc123"
}
```

### GET /api/health
Health check endpoint.

## Email Templates

- **Approved Email:** Professional green template with login link
- **Rejected Email:** Red template with support contact
- **RTL Support:** Full Arabic right-to-left support
- **Responsive:** Works on mobile and desktop

## Security

- Admin secret key verification
- CORS enabled for frontend
- Environment variables for sensitive data
- Input validation on all endpoints
