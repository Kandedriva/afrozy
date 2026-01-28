# Store Owner Refund Processing System - Afrozy Marketplace

## Overview

The Afrozy marketplace now supports **dual refund processing** - store owners can process refunds for their own products, while admins continue to handle refunds for platform products.

---

## How It Works

### Refund Routing Logic

When a customer requests a refund:

1. **System checks the product**: Is it from a store or platform?
2. **Store Products**: Refund request goes to the **store owner dashboard**
3. **Platform Products**: Refund request goes to the **admin dashboard**

```
Customer Requests Refund
         ↓
   Check Product Owner
         ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Store Product      Platform Product
    ↓                   ↓
Store Owner        Admin Dashboard
 Dashboard
```

---

## Database Schema Changes

### New Column: `store_owner_id`

Added to the `refunds` table:

```sql
ALTER TABLE refunds ADD COLUMN store_owner_id INTEGER REFERENCES store_owners(id);
CREATE INDEX idx_refunds_store_owner_id ON refunds(store_owner_id);
```

**Purpose**: Identifies which store owner should process the refund

**Values**:
- `NULL` = Platform product (admin processes)
- `<store_owner_id>` = Store product (store owner processes)

---

## API Endpoints

### Store Owner Endpoints

#### **GET /api/refunds/store-owner/all**
Get all refund requests for the store owner's products

**Authentication**: Required (store owner session)

**Query Parameters**:
- `status` (optional): Filter by status (pending, processing, completed, failed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "order_id": 456,
      "refund_amount": "49.99",
      "refund_reason": "Product defective",
      "status": "pending",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "created_at": "2026-01-28T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "pages": 1
  }
}
```

#### **POST /api/refunds/store-owner/:id/process**
Process a refund for a store product

**Authentication**: Required (store owner session)

**Authorization**: Must be the owner of the store that sold the product

**Request Body**:
```json
{
  "adminNotes": "Approved - product damaged as described"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": 123,
    "stripeRefundId": "re_1AbCdEfGhIjKlMnO",
    "amount": 49.99,
    "status": "completed"
  }
}
```

**Process Flow**:
1. Validates refund belongs to store owner
2. Updates status to 'processing'
3. Processes refund via Stripe API
4. Updates status to 'completed'
5. Sends confirmation email to customer
6. Creates customer notification

#### **POST /api/refunds/store-owner/:id/cancel**
Cancel a refund request for a store product

**Authentication**: Required (store owner session)

**Authorization**: Must be the owner of the store that sold the product

**Request Body**:
```json
{
  "cancelReason": "Customer withdrew request"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Refund cancelled successfully",
  "data": {
    "refundId": 123
  }
}
```

---

## Admin Endpoints (Modified)

Admin endpoints now **only show platform product refunds**:

### **GET /api/refunds/admin/all**
- Only returns refunds where `store_owner_id IS NULL`
- Store product refunds are hidden from admin view

### **POST /api/refunds/:id/process**
- Only processes refunds where `store_owner_id IS NULL`
- Returns error if trying to process store product refund

### **POST /api/refunds/:id/cancel**
- Only cancels refunds where `store_owner_id IS NULL`
- Returns error if trying to cancel store product refund

---

## Notification System

### Store Owner Notifications

When a customer requests a refund for a store product:

```javascript
await createNotification(
  storeOwnerId,
  'store_owner',
  `New Refund Request #${refund.id}`,
  `Customer requested ${refundType} refund for order #${orderId}: $${refundAmount}`,
  'refund',
  `/store/refunds/${refund.id}`
);
```

**Notification Type**: `store_owner`
**Link**: `/store/refunds/{refundId}`

### Admin Notifications (Platform Products Only)

When a customer requests a refund for a platform product:

```javascript
await createNotification(
  null, // Sent to all admins
  'admin',
  `New Refund Request #${refund.id}`,
  `Customer requested ${refundType} refund for order #${orderId}: $${refundAmount}`,
  'refund',
  `/admin/refunds/${refund.id}`
);
```

---

## Authentication & Authorization

### Store Owner Authentication Middleware

```javascript
function authenticateStoreOwner(req, res, next) {
  // Checks:
  // 1. Session exists
  // 2. User type is 'store_owner'
  // 3. Store exists for owner

  // Adds to request:
  req.user = {
    userId: session.userId,
    userType: 'store_owner',
    email: session.email,
    storeId: storeId
  };
}
```

### Authorization Checks

**Store Owner Refund Processing**:
- Endpoint: `/api/refunds/store-owner/:id/process`
- Check: `WHERE r.store_owner_id = $1` (ensures ownership)

**Admin Refund Processing**:
- Endpoint: `/api/refunds/:id/process`
- Check: `WHERE r.store_owner_id IS NULL` (platform products only)

---

## How Refunds Are Assigned

### During Refund Request Creation

```javascript
// Fetch order with store information
const orderQuery = `
  SELECT o.*,
         p.store_id,
         s.owner_id as store_owner_id
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN products p ON oi.product_id = p.id
  LEFT JOIN stores s ON p.store_id = s.id
  WHERE o.id = $1
`;

// Insert refund with store_owner_id
INSERT INTO refunds (
  ...,
  store_owner_id
) VALUES (
  ...,
  order.store_owner_id || null  // NULL if platform product
);
```

**Logic**:
- If product has `store_id` → refund assigned to store owner
- If product has no `store_id` → refund assigned to admin (NULL)

---

## Stripe Integration

### Refund Metadata

Store owner refunds include additional metadata:

```javascript
const stripeRefund = await stripe.refunds.create({
  payment_intent: refund.payment_intent_id,
  amount: Math.round(parseFloat(refund.refund_amount) * 100),
  reason: 'requested_by_customer',
  metadata: {
    refund_id: id.toString(),
    order_id: refund.order_id.toString(),
    refund_type: refund.refund_type,
    processed_by: 'store_owner'  // ← Indicates store owner processed
  }
});
```

**Admin refunds** don't include `processed_by` metadata (or set to 'admin').

---

## Email Notifications

### Refund Confirmation Email

**Sent To**: Customer
**Trigger**: When store owner or admin processes refund
**Contains**:
- Refund amount
- Order number
- Refund ID
- Processing timeline (5-10 business days)

**No distinction** in customer email between admin vs store owner processing.

---

## Testing

### Test Store Owner Refund Flow

```bash
# 1. Create a test order with a store product
curl -X POST http://localhost:3001/api/checkout/process \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=customer-session" \
  -d '{
    "deliveryInfo": {...},
    "items": [
      {
        "productId": 123,  // Product from a store
        "quantity": 1
      }
    ]
  }'

# 2. Customer requests refund
curl -X POST http://localhost:3001/api/refunds/request \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=customer-session" \
  -d '{
    "orderId": 456,
    "reason": "Product defective",
    "refundType": "full"
  }'

# 3. Check store owner notifications
curl http://localhost:3001/api/notifications \
  -H "Cookie: connect.sid=store-owner-session"

# 4. Store owner views pending refunds
curl http://localhost:3001/api/refunds/store-owner/all?status=pending \
  -H "Cookie: connect.sid=store-owner-session"

# 5. Store owner processes refund
curl -X POST http://localhost:3001/api/refunds/store-owner/789/process \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=store-owner-session" \
  -d '{
    "adminNotes": "Approved - product damaged"
  }'

# 6. Verify refund completed
curl http://localhost:3001/api/refunds/789
```

### Test Admin Cannot Process Store Refunds

```bash
# Admin tries to process a store refund (should fail)
curl -X POST http://localhost:3001/api/refunds/789/process \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=admin-session" \
  -d '{
    "adminNotes": "Approved"
  }'

# Expected Response:
{
  "success": false,
  "message": "Refund not found or belongs to a store owner"
}
```

### Test Platform Product Refunds Still Go to Admin

```bash
# 1. Create order with platform product (no store_id)
# 2. Request refund
# 3. Verify admin receives notification (not store owner)
# 4. Admin processes refund successfully
```

---

## Migration

### Running the Migration

```bash
cd backend
node migrations/addStoreOwnerToRefunds.js
```

**Output**:
```
🔄 Adding store owner support to refunds table...
✅ Added store_owner_id column to refunds table
✅ Index created for store_owner_id

✅ Migration completed successfully!

Columns added to refunds:
  - store_owner_id (references store_owners for store product refunds)
```

### Existing Refunds

Existing refunds will have `store_owner_id = NULL` (platform products).

New refunds will automatically populate `store_owner_id` based on the product's store ownership.

---

## Security Considerations

### Authorization Checks

1. **Store owners can ONLY**:
   - View refunds for their own products
   - Process refunds for their own products
   - Cancel refunds for their own products

2. **Admins can ONLY**:
   - View platform product refunds
   - Process platform product refunds
   - Cannot interfere with store refunds

### SQL Injection Prevention

All queries use **parameterized statements**:

```javascript
// ✅ SAFE
WHERE r.store_owner_id = $1 AND r.id = $2

// ❌ NEVER DO THIS
WHERE r.store_owner_id = ${ownerId}
```

### Session Validation

Every store owner request validates:
- Session exists
- User type is 'store_owner'
- Store exists for owner
- Refund belongs to owner's store

---

## Best Practices

### For Store Owners

1. **Review Promptly**: Process refund requests within 24 hours
2. **Add Clear Notes**: Explain approval/cancellation decisions
3. **Communicate**: If you need more info, contact customer first
4. **Monitor Trends**: High refund rates may indicate product quality issues

### For Platform Admins

1. **Monitor Overall Metrics**: Track refund rates across all stores
2. **Flag Suspicious Activity**: High refund rates from specific stores
3. **Platform Refunds Only**: Let store owners handle their own refunds
4. **Support Store Owners**: Provide guidance on refund policies

---

## Troubleshooting

### Store Owner Not Receiving Refund Notifications

**Check**:
1. Is the product associated with a store? (`SELECT store_id FROM products WHERE id = ?`)
2. Does the store have an owner? (`SELECT owner_id FROM stores WHERE id = ?`)
3. Is `store_owner_id` populated in refund? (`SELECT store_owner_id FROM refunds WHERE id = ?`)

**Solution**: Verify product → store → store_owner relationship is intact.

### Admin Trying to Process Store Refund

**Error**: "Refund not found or belongs to a store owner"

**Cause**: Admin endpoint filters `WHERE store_owner_id IS NULL`

**Solution**: Store owner must process their own refunds.

### Store Owner Cannot See Refund

**Check**:
1. Is store owner logged in? (`req.session.userType === 'store_owner'`)
2. Does refund belong to their store? (`SELECT store_owner_id FROM refunds WHERE id = ?`)

**Solution**: Verify authentication and ownership.

---

## Files Created/Modified

### Created
- `backend/migrations/addStoreOwnerToRefunds.js` - Migration to add store owner support
- `STORE_OWNER_REFUND_SYSTEM.md` - This documentation

### Modified
- `backend/routes/refunds.js`:
  - Added `authenticateStoreOwner` middleware
  - Added `GET /api/refunds/store-owner/all` endpoint
  - Added `POST /api/refunds/store-owner/:id/process` endpoint
  - Added `POST /api/refunds/store-owner/:id/cancel` endpoint
  - Modified admin endpoints to filter `store_owner_id IS NULL`
  - Updated refund request to populate `store_owner_id`
  - Updated notifications to route to store owner or admin

---

## Future Enhancements

### Planned Features

- [ ] **Store Owner Dashboard UI**: Frontend interface for managing refunds
- [ ] **Refund Analytics**: Per-store refund metrics and trends
- [ ] **Automated Refund Rules**: Auto-approve small refunds (<$20)
- [ ] **Refund Dispute System**: Escalate store refund disputes to admin
- [ ] **Multi-Store Orders**: Handle refunds for orders with products from multiple stores
- [ ] **Partial Refund UI**: Better interface for selecting which items to refund
- [ ] **Refund Reports**: CSV export of refund history for stores
- [ ] **Refund Limits**: Set maximum refund amount store owners can process without admin approval

---

## Production Checklist

Before deploying to production:

- [x] Run database migration
- [x] Test store owner refund request flow
- [x] Test store owner refund processing
- [x] Test admin cannot process store refunds
- [x] Test platform product refunds still go to admin
- [ ] Update store owner dashboard UI to show refund section
- [ ] Add refund management to store owner navigation
- [ ] Test with real Stripe account
- [ ] Monitor refund processing for first week
- [ ] Create store owner guide for refund processing

---

**Last Updated**: January 28, 2026
**Status**: ✅ Backend Fully Implemented
**Frontend**: ⏳ Pending Dashboard UI Implementation
**Migration**: ✅ Successfully Executed

---

## Summary

The store owner refund system is now **fully functional** at the backend level:

✅ **Store owners** receive and process refunds for their products
✅ **Admins** receive and process refunds for platform products
✅ **Automatic routing** based on product ownership
✅ **Stripe integration** works for both admin and store owner refunds
✅ **Email notifications** sent to customers regardless of processor
✅ **Authorization** prevents cross-processing (admin can't process store refunds)

**Next Step**: Build the frontend store owner dashboard UI to display and manage refund requests.
