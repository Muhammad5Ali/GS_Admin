// utils/emailTemplates.js
export const generateResetPasswordTemplate = (resetLink, token) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
      .logo { text-align: center; margin-bottom: 20px; }
      .logo h1 { color: #2e7d32; }
      .button { 
        display: inline-block; 
        padding: 10px 20px; 
        background-color: #2e7d32; 
        color: white !important; 
        text-decoration: none; 
        border-radius: 4px; 
        margin: 10px 0; 
      }
      .token-box {
        padding: 10px;
        background-color: #f8f9fa;
        border: 1px dashed #ccc;
        font-family: monospace;
        word-break: break-all;
        margin: 10px 0;
      }
      .note { color: #6c757d; font-size: 0.9em; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">
        <h1>GreenSnap</h1>
      </div>
      
      <h2>Password Reset</h2>
      <p>You've requested to reset your password. Click the button below to reset it:</p>
      
      <a href="${resetLink}" class="button">Reset Password</a>
      
      <p>Or copy this URL into your browser:</p>
      <p class="token-box">${resetLink}</p>
      
      <div class="manual-token">
        <p>If you're unable to use the link, enter this token in the app:</p>
        <div class="token-box">${token}</div>
      </div>
      
      <p class="note">This link will expire in 15 minutes. If you didn't request this, please ignore this email.</p>
    </div>
  </body>
  </html>
  `;
};

// New OTP email template for password reset
export const generateResetOTPTemplate = (otp, username) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GreenSnap Password Reset OTP</title>
    <style>
      body { margin:0; padding:0; background-color:#f2f2f2; }
      table { border-collapse: collapse; width: 100%; }
      .container { max-width: 600px; margin: 0 auto; }
      .content-table { background:#ffffff; border-radius:8px; overflow:hidden; font-family:Arial, sans-serif; }
      .header { padding: 30px 0 10px; text-align: center; }
      .title { margin:0; padding: 0 40px 10px; text-align:center; font-size:24px; color:#2e7d32; }
      .message { padding: 0 40px 20px; font-size:16px; color:#333; }
      .otp-display { display:inline-block; font-size:32px; font-weight:bold; color:#2e7d32; 
                     letter-spacing:4px; padding:15px 25px; border:2px dashed #2e7d32; 
                     border-radius:6px; margin: 0 auto; }
      .expiry-note { padding: 0 40px 20px; font-size:14px; color:#666; }
      .footer { background-color:#f9f9f9; padding:20px 40px; font-size:12px; color:#999; text-align:center; }
    </style>
  </head>
  <body>
    <table class="container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table class="content-table" width="600" cellpadding="0" cellspacing="0" role="presentation">
            <!-- Logo and Header -->
            <tr>
              <td class="header">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" fill="#2e7d32" />
                  <path d="M50 20 C65 20, 80 35, 50 80 C20 35, 35 20, 50 20 Z" fill="#a5d6a7"/>
                </svg>
              </td>
            </tr>
            <tr>
              <td>
                <h1 class="title">Password Reset OTP</h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td class="message">
                <p style="margin:0;">Hello, ${username},</p>
                <p style="margin:10px 0 0;">
                  You have requested to reset your password. Use the OTP below to proceed:
                </p>
              </td>
            </tr>

            <!-- OTP Display -->
            <tr>
              <td align="center" style="padding: 0 40px 30px;">
                <div class="otp-display">
                  ${otp}
                </div>
              </td>
            </tr>

            <!-- Expiry Notice -->
            <tr>
              <td class="expiry-note">
                This OTP will expire in 15 minutes. If you didn't request this, please ignore this email.
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="footer">
                <p style="margin:0;">© ${new Date().getFullYear()} GreenSnap, Inc. All rights reserved.</p>
                <p style="margin:8px 0 0;">
                  If you have any questions, feel free to contact us at
                  <a href="mailto:greensnapofficial@gmail.com" style="color:#2e7d32; text-decoration:none;">
                    greensnapofficial@gmail.com
                  </a>
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
};