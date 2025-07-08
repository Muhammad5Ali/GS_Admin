// utils/emailTemplates.js

// Verification Email Template
export const generateVerificationTemplate = (verificationCode, username) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>GreenSnap Verification Code</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f2f2;">
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="background-color:#f2f2f2; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="background:#ffffff; border-radius:8px; overflow:hidden; font-family:Arial, sans-serif;"
          >

            <!-- Inline SVG Logo -->
            <tr>
              <td align="center" style="padding: 30px 0 10px;">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" fill="#2e7d32" />
                  <path d="M50 20 C65 20, 80 35, 50 80 C20 35, 35 20, 50 20 Z" fill="#a5d6a7"/>
                </svg>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 0 40px 10px; text-align:center;">
                <h1 style="margin:0; font-size:24px; color:#2e7d32;">
                  Your GreenSnap Verification Code
                </h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding: 0 40px 20px; font-size:16px; color:#333;">
               <p style="margin:0;">Hello, ${username},</p>
                <p style="margin:10px 0 0;">
                  Thank you for signing up for <strong>GreenSnap</strong>. Please use the verification code below to confirm your email address:
                </p>
              </td>
            </tr>

            <!-- Code Display -->
            <tr>
              <td align="center" style="padding: 0 40px 30px;">
                <div
                  style="
                    display:inline-block;
                    font-size:32px;
                    font-weight:bold;
                    color:#2e7d32;
                    letter-spacing:4px;
                    padding:15px 25px;
                    border:2px dashed #2e7d32;
                    border-radius:6px;
                  "
                >
                  ${verificationCode}
                </div>
              </td>
            </tr>

            <!-- Expiry Notice -->
            <tr>
              <td style="padding: 0 40px 20px; font-size:14px; color:#666;">
                This code will expire in <strong>5 minutes</strong>. If you did not request this, simply ignore this email.
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9f9f9; padding:20px 40px; font-size:12px; color:#999; text-align:center;">
                <p style="margin:0;">
                  © ${new Date().getFullYear()} GreenSnap, Inc. All rights reserved.
                </p>
                <p style="margin:8px 0 0;">
                  If you have any questions, feel free to contact us at
                  <a href="mailto:greensnapofficial@gmail.com">greensnapofficial@gmail.com</a>
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

// Password Reset OTP Template
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