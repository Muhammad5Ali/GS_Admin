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