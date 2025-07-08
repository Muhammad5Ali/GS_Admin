// export const sendToken = (user, statusCode, message, res) => {
//   const token = user.generateToken();
//   res
//     .status(statusCode)
//     .cookie("token", token, {
//       expires: new Date(
//         Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
//       ),
//       httpOnly: true,
//     })
//     .json({
//     success: true,
//       user,
//       message,
//       token,
//     });
// };
export const sendToken = (user, statusCode, message, res) => {
  const token = user.generateToken();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: isProduction,  // HTTPS only in production
    sameSite: isProduction ? "none" : "lax"  // Cross-site in production, lax in development
  };

  // Set cookie and send response
  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      user,
      message,
      token,
    });
};