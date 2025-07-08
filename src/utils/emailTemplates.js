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
export const generateWelcomeTemplate = (username) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to GreenSnap!</title>
    <style>
      body { margin:0; padding:0; background-color:#f2f2f2; font-family: Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .content { background:#ffffff; border-radius:8px; overflow:hidden; }
      .header { padding: 30px 0 10px; text-align: center; }
      .title { color:#2e7d32; font-size:24px; text-align:center; padding: 10px 0; }
      .message { padding: 20px 40px; font-size:16px; color:#333; line-height: 1.6; }
      .cta-button { display: inline-block; background-color: #2e7d32; color: white !important; 
                   text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold;
                   margin: 20px 0; }
      .features { padding: 0 40px; }
      .feature-item { display: flex; align-items: center; margin-bottom: 15px; }
      .feature-icon { width: 40px; height: 40px; margin-right: 15px; }
      .footer { background-color:#f9f9f9; padding:20px 40px; font-size:12px; color:#999; text-align:center; }
    </style>
  </head>
  <body>
    <table class="container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table class="content" width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <!-- Logo and Header -->
            <tr>
              <td class="header">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" fill="#2e7d32" />
                  <path d="M50 20 C65 20, 80 35, 50 80 C20 35, 35 20, 50 20 Z" fill="#a5d6a7"/>
                </svg>
                <h1 class="title">Welcome to GreenSnap, ${username}!</h1>
              </td>
            </tr>

            <!-- Welcome Message -->
            <tr>
              <td class="message">
                <p>Thank you for joining GreenSnap - your partner in creating cleaner, greener communities!</p>
                <p>Our mission is simple: empower people like you to report waste in your neighborhood and turn environmental awareness into action.</p>
                
                <div align="center">
                  <a href="${process.env.CLIENT_URL}/report" class="cta-button">
                    Report Your First Waste
                  </a>
                </div>
              </td>
            </tr>

            <!-- Features -->
            <tr>
              <td class="features">
                <h2 style="color:#2e7d32;">How You Make a Difference:</h2>
                
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24" fill="#2e7d32">
                      <path d="M21 6L3 6L3 8H21V6M3 11H18V13H3V11M3 16H15V18H3V16Z" />
                    </svg>
                  </div>
                  <div>
                    <h3>Report Waste</h3>
                    <p>Snap photos of improperly disposed waste in your community</p>
                  </div>
                </div>
                
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24" fill="#2e7d32">
                      <path d="M9 20L4 15.5L5.5 14L9 17.3L18.5 7.8L20 9.3L9 20Z" />
                    </svg>
                  </div>
                  <div>
                    <h3>Track Cleanups</h3>
                    <p>See your reports get resolved as local authorities take action</p>
                  </div>
                </div>
                
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24" fill="#2e7d32">
                      <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2M16.3 15.2L11 12.3V7H12.5V11.4L17 13.9L16.3 15.2Z" />
                    </svg>
                  </div>
                  <div>
                    <h3>Earn Rewards</h3>
                    <p>Collect points for each verified report and climb the leaderboard</p>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="footer">
                <p style="margin:0;">© ${new Date().getFullYear()} GreenSnap, Inc. All rights reserved.</p>
                <p style="margin:8px 0 0;">
                  Together, we're making communities cleaner, one report at a time
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