# Session Persistence Fix for Store Owners

## Problem

Store owners were getting logged out when they reloaded their browser because the authentication system had inconsistencies between JWT token-based authentication and session-based authentication.

## Root Cause

The issue was caused by:

1. **Mixed Authentication Methods**: The store owner login used JWT tokens, but some components (like Stripe Connect) were trying to use session-based authentication.
2. **Inconsistent API URLs**: Some validation requests were using hardcoded localhost URLs instead of environment variables.
3. **Missing JWT Configuration**: JWT environment variables were not properly documented.

## Solution Implemented

### 1. Standardized Authentication for Store Owners

**Backend Changes:**
- Updated `routes/stripe-connect.js` to use JWT authentication instead of sessions
- Ensured all store owner endpoints consistently use JWT tokens
- Maintained backward compatibility with session auth as fallback

**Before (using sessions):**
```javascript
// ❌ Old approach - session based
authenticateSession('store_owner')(req, res, async (err) => {
  // Session validation logic
});
```

**After (using JWT):**
```javascript
// ✅ New approach - JWT based
function authenticateStoreOwner(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = { userId: decoded.userId, userType: decoded.userType };
  // ... rest of validation
}
```

### 2. Fixed API URL Configuration

**Frontend Changes:**
- Updated `App.tsx` to use environment variables for API URLs
- Fixed token validation on page reload

**Before:**
```javascript
// ❌ Hardcoded URL
const response = await fetch('http://localhost:3001/api/store/products', {
```

**After:**
```javascript
// ✅ Environment variable
const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';
const response = await fetch(`${apiUrl}/store/products`, {
```

### 3. Updated Stripe Connect Component

**Frontend Changes:**
- Modified all Stripe Connect API calls to use Authorization headers
- Removed dependency on cookies/sessions

**Before:**
```javascript
// ❌ Using cookies
const response = await axios.get(`${API_BASE_URL}/stripe-connect/account-status`, {
  withCredentials: true
});
```

**After:**
```javascript
// ✅ Using JWT token
const token = localStorage.getItem('afrozy-market-token');
const response = await axios.get(`${API_BASE_URL}/stripe-connect/account-status`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### 4. Enhanced Environment Configuration

**Added to backend `.env.example`:**
```env
# JWT Configuration (for Store Owner authentication)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

**Created frontend `.env.example`:**
```env
# Frontend Environment Configuration
REACT_APP_API_URL=https://localhost:3001/api
```

## Authentication Flow

### Store Owner Login Process

1. **Login**: Store owner enters credentials
2. **Token Generation**: Backend generates JWT token with 24-hour expiry
3. **Storage**: Frontend stores user data and JWT token in localStorage
4. **API Requests**: All subsequent requests include JWT token in Authorization header

### Session Persistence Process

1. **Page Reload**: App.tsx runs `validateStoredAuth()` on mount
2. **Token Validation**: Makes test API request with stored JWT token
3. **Success**: If token is valid, user remains logged in
4. **Failure**: If token is invalid/expired, user data is cleared

### Token Expiry Handling

1. **Automatic Detection**: Axios interceptor detects 401 responses
2. **Cleanup**: Automatically clears stored user data and tokens
3. **User Notification**: User can be redirected to login page

## Key Features

### ✅ Persistent Sessions
- Store owners stay logged in across browser reloads
- 24-hour token expiry for security
- Automatic cleanup on token expiry

### ✅ Consistent Authentication
- All store owner endpoints use JWT tokens
- Unified authentication middleware
- Backward compatibility maintained

### ✅ Secure Token Handling
- Tokens stored in localStorage (not sessionStorage)
- Automatic inclusion in API requests
- Proper error handling for expired tokens

### ✅ Environment Configuration
- API URLs configurable via environment variables
- Separate JWT configuration
- Development/production ready

## Testing the Fix

### Manual Testing Steps

1. **Login as Store Owner**:
   ```
   - Go to /store/login
   - Enter valid store owner credentials
   - Verify successful login to dashboard
   ```

2. **Test Session Persistence**:
   ```
   - Reload the browser page
   - Verify user remains logged in
   - Check that dashboard data loads correctly
   ```

3. **Test Stripe Connect**:
   ```
   - Go to Payments tab in store dashboard
   - Verify Stripe Connect interface loads
   - Test account creation/status checking
   ```

4. **Test Token Expiry**:
   ```
   - Manually expire token (change JWT_SECRET temporarily)
   - Reload page
   - Verify user is logged out and data is cleared
   ```

## Environment Setup

### Development

1. **Backend**: Copy `.env.example` to `.env` and configure:
   ```env
   JWT_SECRET=your-development-jwt-secret
   JWT_EXPIRES_IN=24h
   ```

2. **Frontend**: Create `.env` file:
   ```env
   REACT_APP_API_URL=https://localhost:3001/api
   ```

### Production

1. **Backend**: Set strong JWT secret:
   ```env
   JWT_SECRET=very-long-random-secure-production-secret
   JWT_EXPIRES_IN=24h
   ```

2. **Frontend**: Set production API URL:
   ```env
   REACT_APP_API_URL=https://your-domain.com/api
   ```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret in production
2. **Token Expiry**: 24-hour expiry balances security and user experience
3. **HTTPS**: Ensure all production traffic uses HTTPS
4. **Token Storage**: localStorage is used (survives tab close but not browser close in incognito)

## Troubleshooting

### Common Issues

1. **Still Getting Logged Out**:
   - Check browser console for API errors
   - Verify JWT_SECRET is set in backend .env
   - Confirm REACT_APP_API_URL is correctly set

2. **Stripe Connect Not Working**:
   - Verify JWT token is being sent in requests
   - Check backend logs for authentication errors
   - Confirm store owner has a valid store record

3. **Token Validation Failing**:
   - Check API URL configuration
   - Verify backend is running and accessible
   - Check JWT token format and expiry

### Debug Steps

1. **Check Token Storage**:
   ```javascript
   console.log('User:', localStorage.getItem('afrozy-market-user'));
   console.log('Token:', localStorage.getItem('afrozy-market-token'));
   ```

2. **Verify API Requests**:
   - Open browser DevTools → Network tab
   - Check that Authorization header is included
   - Verify API endpoints are being called correctly

3. **Backend Logs**:
   - Check for JWT verification errors
   - Look for database connection issues
   - Verify store owner record exists

## Benefits of This Fix

1. **Better User Experience**: Store owners don't lose their work when refreshing
2. **Consistent Authentication**: Single authentication method for store owners
3. **Secure**: JWT tokens with proper expiry and validation
4. **Maintainable**: Clear separation between authentication methods
5. **Scalable**: Ready for production deployment with environment configuration