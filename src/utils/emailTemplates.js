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
// utils/emailTemplates.js
export const generateWelcomeTemplate = (username) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to GreenSnap!</title>
    <style>
      body { margin:0; padding:0; background-color:#f5f9f5; font-family: Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; }
      .content { background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background-color: #2e7d32; padding: 40px 0; text-align: center; }
      .title { color:#ffffff; font-size:28px; font-weight:bold; text-align:center; padding: 10px 0; }
      .message { padding: 30px 40px; font-size:16px; color:#333; line-height: 1.7; }
      .mission-box { background-color: #f0f7f0; border-left: 4px solid #2e7d32; padding: 20px; margin: 25px 0; }
      .features { padding: 0 40px; }
      .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
      .feature-card { background: #f9fbf9; border-radius: 8px; padding: 20px; text-align: center; }
      .feature-icon { width: 50px; height: 50px; margin: 0 auto 15px; }
      .feature-title { color: #2e7d32; font-weight: bold; margin-bottom: 10px; }
      .impact-stats { background-color: #2e7d32; color: white; padding: 30px 40px; text-align: center; }
      .stat { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
      .stat-label { font-size: 14px; opacity: 0.9; }
      .footer { background-color:#1a4d1f; padding:25px 40px; font-size:12px; color:#d0e3d0; text-align:center; }
      .social-links { margin: 15px 0; }
      .social-link { display: inline-block; margin: 0 10px; }
    </style>
  </head>
  <body>
    <table class="container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding: 30px 10px;">
          <table class="content" width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <!-- Header -->
            <tr>
              <td class="header">
                <h1 class="title">Welcome to GreenSnap, ${username}!</h1>
                <p style="color: #a5d6a7; font-size: 18px; margin-top: 10px;">Together for a Cleaner Planet</p>
              </td>
            </tr>

            <!-- Welcome Message -->
            <tr>
              <td class="message">
                <p>We're thrilled to have you join our community of environmental champions! At GreenSnap, we believe that small actions create big changes.</p>
                
                <div class="mission-box">
                  <p style="margin:0;"><strong>Our Mission:</strong> Empower everyday people to transform their communities by reporting waste and inspiring collective action.</p>
                </div>
                
                <p>Your account is now active and ready to make a difference. Every report you submit helps create cleaner neighborhoods and healthier ecosystems.</p>
              </td>
            </tr>

            <!-- Features -->
            <tr>
              <td class="features">
                <h2 style="color:#2e7d32; text-align: center; margin-bottom: 25px;">How You Can Make an Impact</h2>
                
                <div class="feature-grid">
                  <div class="feature-card">
                    <div class="feature-icon">
                      <svg viewBox="0 0 24 24" fill="#2e7d32">
                        <path d="M12 2L1 9L12 16L23 9L12 2M18 12.3V18H13V12.3L12 11.6L11 12.3V18H6V12.3L1 9L12 2L23 9L18 12.3Z" />
                      </svg>
                    </div>
                    <div class="feature-title">Report Waste</div>
                    <p>Document improperly disposed waste with photos and location details</p>
                  </div>
                  
                  <div class="feature-card">
                    <div class="feature-icon">
                      <svg viewBox="0 0 24 24" fill="#2e7d32">
                        <path d="M9 20L4 15.5L5.5 14L9 17.3L18.5 7.8L20 9.3L9 20Z" />
                      </svg>
                    </div>
                    <div class="feature-title">Track Progress</div>
                    <p>See your reports get resolved as local authorities take action</p>
                  </div>
                  
                  <div class="feature-card">
                    <div class="feature-icon">
                      <svg viewBox="0 0 24 24" fill="#2e7d32">
                        <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2M16.3 15.2L11 12.3V7H12.5V11.4L17 13.9L16.3 15.2Z" />
                      </svg>
                    </div>
                    <div class="feature-title">Earn Rewards</div>
                    <p>Collect points for each verified report and climb the leaderboard</p>
                  </div>
                  
                  <div class="feature-card">
                    <div class="feature-icon">
                      <svg viewBox="0 0 24 24" fill="#2e7d32">
                        <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" />
                      </svg>
                    </div>
                    <div class="feature-title">Inspire Others</div>
                    <p>Share your achievements and motivate friends to join the movement</p>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Final Encouragement -->
            <tr>
              <td class="message">
                <h3 style="color:#2e7d32; text-align: center;">Ready to Make Your First Impact?</h3>
                <p style="text-align: center;">Open the GreenSnap app and start reporting waste in your community today!</p>
                
                <p style="text-align: center; margin-top: 30px;"><em>"The greatest threat to our planet is the belief that someone else will save it."</em><br>- Robert Swan</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="footer">
                <p style="margin:0; font-size:14px;">© ${new Date().getFullYear()} GreenSnap, Inc. All rights reserved.</p>
                <p style="margin:10px 0;">Together, we're making communities cleaner, one report at a time</p>
                
                
                <p style="margin:8px 0 0; font-size:11px; opacity:0.7;">
                  You're receiving this email because you joined GreenSnap<br>
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