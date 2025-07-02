// NEW: Deep link utilities
export const getDeepLinkBaseUrl = () => {
  // For production environment
  if (process.env.NODE_ENV === 'production') {
    return `${process.env.FRONTEND_PROD_DEEP_LINK_SCHEME}://`;
  }
  
  // For development environment
  return process.env.FRONTEND_DEEP_LINK_BASE_URL || 'exp://192.168.76.199:8081/--/';
};

export const generateResetLink = (token) => {
  const baseUrl = getDeepLinkBaseUrl();
  return `${baseUrl}reset-password?token=${token}`;
};