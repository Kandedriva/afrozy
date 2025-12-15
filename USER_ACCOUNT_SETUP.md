# User Account Management System Setup

## 🎯 Overview

This document outlines the comprehensive user account management system added to Afrozy Market, including notifications, orders, and settings management.

## 🆕 Features Added

### 📱 **User Account Dashboard**
- **Navigation**: Sidebar navigation with profile info and section tabs
- **Responsive Design**: Mobile-friendly layout with proper spacing
- **User Context**: Displays user information and avatar initials

### 🔔 **Notifications System**
- **Real-time Notifications**: Order updates, promotions, system messages
- **Filter Options**: Filter by type (orders, promotions) or read status
- **Interactive Actions**: Mark as read, delete, bulk mark all as read
- **Rich Content**: Icons, timestamps, action links

### 📦 **Order Management**
- **Order History**: Complete order tracking with status indicators
- **Order Details**: Detailed view with items, shipping, payment info
- **Status Tracking**: Visual status progression with colored indicators
- **Order Actions**: Cancel orders, track packages

### ⚙️ **Settings Management**
- **Profile Updates**: Edit name, phone, address (email readonly)
- **Password Change**: Secure password update with validation
- **Notification Preferences**: Granular control over notification types
- **Privacy Controls**: Data export, 2FA setup, account deletion

## 📁 Files Created/Modified

### Frontend Components
```
frontend/src/
├── pages/
│   └── UserAccount.tsx              # Main account page with navigation
├── components/account/
│   ├── Notifications.tsx           # Notifications management
│   ├── Orders.tsx                   # Order history and details
│   └── Settings.tsx                 # User settings and preferences
```

### Backend Routes
```
backend/routes/
├── notifications.js                # Notification CRUD operations
└── orders.js                      # Order management endpoints
```

### Database Scripts
```
backend/scripts/
├── createNotificationsTable.js     # Notifications table schema
└── createOrdersTable.js           # Orders and order_items tables
```

### Updated Files
- `frontend/src/App.tsx` - Added account routing and navigation
- `backend/index.js` - Added new route endpoints

## 🗄️ Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) CHECK (type IN ('order', 'promotion', 'system', 'account')),
  action_link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Tables
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  estimated_delivery TIMESTAMP,
  tracking_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Setup Instructions

### 1. Create Database Tables

Run the table creation scripts:

```bash
cd backend
node scripts/createNotificationsTable.js
node scripts/createOrdersTable.js
```

### 2. Update Environment Variables

Ensure your `.env` file has the required database configuration:

```env
PGHOST=your_postgres_host
PGDATABASE=your_database_name
PGUSER=your_database_user
PGPASSWORD=your_database_password
JWT_SECRET=your_secure_jwt_secret
```

### 3. Install Dependencies

No additional dependencies required - uses existing packages.

### 4. Start Services

```bash
# Backend
cd backend
npm run dev

# Frontend  
cd frontend
npm start
```

## 🔗 API Endpoints

### Notifications API
```
GET    /api/notifications          # Get user notifications
POST   /api/notifications/:id/mark-read  # Mark as read
POST   /api/notifications/mark-all-read  # Mark all as read  
DELETE /api/notifications/:id      # Delete notification
POST   /api/notifications/create   # Create notification (internal)
```

### Orders API
```
GET    /api/orders                 # Get user orders
GET    /api/orders/:id            # Get order details
POST   /api/orders                # Create new order
PUT    /api/orders/:id/cancel     # Cancel order
```

### Authentication
All endpoints require valid JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## 💡 Usage Examples

### Accessing User Account
1. User logs in to the application
2. Click "My Account" button in the user menu
3. Navigate between Notifications, Orders, and Settings tabs

### Notifications Management
- View all notifications with filtering options
- Click notification to mark as read
- Use bulk actions for multiple notifications
- Delete unwanted notifications

### Order Tracking
- View complete order history with status
- Filter orders by status (pending, shipped, delivered)
- Click order for detailed information
- Track packages with tracking numbers

### Profile Management
- Update personal information (name, phone, address)
- Change password with security validation
- Manage notification preferences
- Privacy and security controls

## 🎨 UI/UX Features

### Design Elements
- **Clean Interface**: Modern, intuitive design
- **Responsive Layout**: Works on all device sizes  
- **Visual Feedback**: Loading states, success/error messages
- **Consistent Styling**: Follows existing design system

### Interactive Components
- **Toggle Switches**: For notification preferences
- **Status Badges**: Color-coded order status indicators
- **Modal Views**: Detailed order information
- **Form Validation**: Real-time input validation

### Accessibility
- **Semantic HTML**: Proper heading structure
- **Keyboard Navigation**: Tab-friendly interface
- **Color Contrast**: Meets accessibility standards
- **Screen Readers**: ARIA labels where needed

## 🔒 Security Considerations

### Authentication & Authorization
- JWT token validation on all endpoints
- User isolation (users only see their own data)
- Admin-only endpoints properly protected

### Data Protection
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection through React's built-in escaping

### Privacy
- Email addresses are read-only
- Sensitive information properly masked
- Account deletion option available
- Data export functionality planned

## 📊 Testing

### Manual Testing Checklist
- [ ] User can access account page after login
- [ ] Notifications display correctly with filters
- [ ] Orders show proper status and details
- [ ] Profile updates save successfully
- [ ] Password change works with validation
- [ ] Navigation between sections smooth
- [ ] Responsive design on mobile devices

### API Testing
Use tools like Postman or curl to test endpoints:

```bash
# Login first to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Test notifications endpoint
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Future Enhancements

### Planned Features
1. **Real-time Notifications**: WebSocket integration
2. **Email Notifications**: Send notifications via email
3. **Order Tracking Integration**: Real shipping provider APIs
4. **Wishlist Management**: Save favorite products
5. **Address Book**: Multiple shipping addresses
6. **Payment Methods**: Saved payment options
7. **Two-Factor Authentication**: Enhanced security
8. **Social Login**: OAuth integration

### Performance Optimizations
1. **Pagination**: Large order/notification lists
2. **Caching**: Redis for frequently accessed data
3. **Image Optimization**: Lazy loading for order items
4. **Database Indexing**: Optimize query performance

## 🐛 Troubleshooting

### Common Issues

1. **"My Account" button not showing**
   - Ensure user is logged in
   - Check JWT token validity
   - Verify user object in context

2. **Database errors on table creation**
   - Check database connection
   - Verify user permissions
   - Run scripts in correct order

3. **API endpoints returning 401**
   - Verify JWT token in localStorage
   - Check token expiration
   - Ensure proper Authorization header

4. **Notifications not displaying**
   - Check database has notifications table
   - Verify user_id foreign key constraints
   - Run sample data insertion scripts

## ✨ Conclusion

The user account management system provides a comprehensive solution for user engagement and order management. The modular design allows for easy extension and the secure implementation ensures user data protection.

Key benefits:
- **Enhanced User Experience**: Centralized account management
- **Improved Engagement**: Rich notification system
- **Order Transparency**: Complete order tracking
- **User Control**: Comprehensive settings management
- **Scalable Architecture**: Easy to extend with new features