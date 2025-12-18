import axios from 'axios';

// Set up axios defaults
axios.defaults.withCredentials = true;

// API URL configuration - prioritize environment variable, fall back to localhost
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if we're running in production (on a deployed domain)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Try to determine backend URL based on frontend URL
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Common patterns for backend URLs
    if (hostname.includes('netlify.app') || hostname.includes('vercel.app')) {
      // For Netlify/Vercel deployments, try common backend patterns
      return `${protocol}//api.${hostname}/api`;
    }
    
    // For custom domains, assume API subdomain
    return `${protocol}//api.${hostname}/api`;
  }
  
  // Development fallback
  return 'http://localhost:3001/api';
};

axios.defaults.baseURL = getApiUrl();

// Add response interceptor for consistent error handling
axios.interceptors.response.use(
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

export default axios;