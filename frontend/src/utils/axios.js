import axios from 'axios';

// API URL configuration - prioritize environment variable, fall back to smart detection
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Check if we're running in production (on a deployed domain)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Try to determine backend URL based on frontend URL
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // Specific handling for afrozy domain
    if (hostname.includes('afrozy.com')) {
      return 'https://api.afrozy.com/api';  // Backend API subdomain with /api prefix
    }

    // Common patterns for backend URLs
    if (hostname.includes('netlify.app') || hostname.includes('vercel.app')) {
      // For Netlify/Vercel deployments, try common backend patterns
      return `${protocol}//api.${hostname}/api`;
    }

    // For custom domains, assume API subdomain
    return `${protocol}//api.${hostname}/api`;
  }

  // Development fallback - include /api prefix
  return 'http://localhost:3001/api';
};

// Create axios instance with proper configuration
const instance = axios.create({
  baseURL: getApiUrl(),
  // No timeout - let requests complete naturally
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for consistent error handling
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle auth expiry globally
    if (error.response?.status === 401) {
      console.log('Authentication expired, clearing stored data');
      localStorage.removeItem('afrozy-market-user');
      // Optionally redirect to login page
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;