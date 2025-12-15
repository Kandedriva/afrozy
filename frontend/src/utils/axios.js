import axios from 'axios';

// Set up axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

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