# Admin Authentication Setup

## 🔐 Secure Admin Authentication Implementation

This document outlines the secure admin authentication system that has been implemented for Afrozy Market.

## 🔄 Changes Made

### 1. Backend Authentication Routes (`backend/routes/auth.js`)

#### New Admin Login Endpoint
- **Route**: `POST /api/auth/admin/login`
- **Purpose**: Dedicated endpoint for admin authentication
- **Security Features**:
  - Only accepts users with `user_type = 'admin'`
  - Validates email format and password
  - Checks account status (must be 'active')
  - Updates last login timestamp
  - Returns JWT token with admin flag

#### New Authentication Middleware
- **`authenticateAdmin`**: Verifies JWT token AND admin privileges
- **Security Checks**:
  - Valid JWT token required
  - User type must be 'admin'
  - Token must have `isAdmin: true` flag

### 2. Admin Routes Security (`backend/routes/admin.js`)

- **Updated**: All admin routes now use `authenticateAdmin` middleware
- **Security**: Removed insecure demo authentication
- **Protection**: All admin endpoints now require valid admin JWT token

### 3. Frontend Admin Login (`frontend/src/components/admin/AdminLogin.tsx`)

- **Updated**: Now uses real API authentication
- **Changes**:
  - Uses email instead of username
  - Makes HTTP request to `/api/auth/admin/login`
  - Handles proper JWT token storage
  - Shows appropriate error messages

### 4. Main App Integration (`frontend/src/App.tsx`)

- **Updated**: Admin login handler now processes JWT tokens
- **Security**: Stores admin token for subsequent API calls

## 🚀 Setup Instructions

### 1. Create Admin User

Run the admin user creation script:

```bash
cd backend
node scripts/createAdminUser.js
```

**Default Admin Credentials:**
- Email: `admin@afrozymarket.com`
- Password: `admin123`

⚠️ **IMPORTANT**: Change the default password after first login!

### 2. Environment Variables

Ensure your `.env` file in the backend has:

```env
JWT_SECRET=your_secure_jwt_secret_here
PGHOST=your_postgres_host
PGDATABASE=your_database_name
PGUSER=your_database_user
PGPASSWORD=your_database_password
```

### 3. Frontend Configuration

Update your frontend environment if needed:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🔒 Security Features

### 1. **Admin-Only Access**
- Database query filters by `user_type = 'admin'`
- Prevents regular users from accessing admin endpoints

### 2. **JWT Token Security**
- Tokens include `isAdmin: true` flag
- Middleware validates both token validity and admin status
- Configurable token expiration

### 3. **Password Security**
- bcrypt hashing with 10 salt rounds
- Secure password comparison

### 4. **Input Validation**
- Email format validation
- Required field checking
- Account status verification

## 🧪 Testing the Setup

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm start
```

### 3. Test Admin Access

1. Navigate to `/admin` in your browser
2. You'll be redirected to admin login
3. Use the admin credentials from step 1
4. Verify access to admin dashboard

### 4. Test API Endpoints

You can test admin endpoints with curl:

```bash
# First, login and get token
curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@afrozymarket.com","password":"admin123"}'

# Use the returned token for admin endpoints
curl -X GET http://localhost:5000/api/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🚨 Security Best Practices

### 1. **Change Default Credentials**
- Update admin password after first login
- Use strong, unique passwords

### 2. **Environment Security**
- Use strong JWT secret
- Keep environment variables secure
- Don't commit secrets to version control

### 3. **Token Management**
- Implement token refresh if needed
- Consider shorter token expiration for high-security environments
- Implement logout endpoint if required

### 4. **Monitoring**
- Log admin authentication attempts
- Monitor for suspicious activity
- Implement rate limiting if needed

## 📋 API Endpoints Summary

### Admin Authentication
- `POST /api/auth/admin/login` - Admin login

### Protected Admin Routes
All require `Authorization: Bearer <token>` header:
- `GET /api/admin/products` - Get all products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/alerts/low-stock` - Low stock alerts
- `POST /api/admin/products/bulk-update-stock` - Bulk update
- `GET /api/admin/analytics/categories` - Category analytics

## 🔧 Troubleshooting

### Common Issues

1. **"Admin access required" error**
   - Ensure user has `user_type = 'admin'` in database
   - Check JWT token includes `isAdmin: true`

2. **"Invalid token" error**
   - Verify JWT_SECRET is consistent
   - Check token format: `Bearer <token>`

3. **Login fails**
   - Verify admin user exists in database
   - Check email and password are correct
   - Ensure account status is 'active'

## ✅ Security Verification Checklist

- [ ] Admin user created with secure credentials
- [ ] JWT secret is strong and secure
- [ ] All admin routes protected with `authenticateAdmin`
- [ ] Frontend makes authenticated requests
- [ ] Database queries filter by admin user type
- [ ] Password is properly hashed
- [ ] Token includes admin flag
- [ ] Default credentials changed

## 🎯 Next Steps

1. **Implement Password Change**: Add endpoint for admins to change passwords
2. **Add Role-Based Permissions**: Different admin roles with different permissions
3. **Implement Audit Logging**: Track admin actions
4. **Add Two-Factor Authentication**: Enhanced security for admin accounts
5. **Session Management**: Implement proper session handling and logout