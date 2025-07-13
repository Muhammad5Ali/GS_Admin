export const sendToken = (user, statusCode, message, res) => {
  const token = user.generateToken();
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
  };

  // Include role in response
  const userData = {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage
  };

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      user: userData,
      message,
      token,
    });
};