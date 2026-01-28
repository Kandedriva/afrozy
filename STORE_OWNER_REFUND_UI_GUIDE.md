# Store Owner Refund UI Guide - Afrozy Marketplace

## Overview

The store owner dashboard now includes a complete refund management interface, allowing store owners to view, approve, and cancel refund requests for their products directly from their dashboard.

---

## Accessing the Refund Dashboard

### Navigation

1. Log in as a store owner
2. Go to Store Dashboard
3. Click the **"Refunds"** tab in the navigation menu

**Tab Location**: Between "Sales" and "Analytics" tabs

---

## Dashboard Features

### 1. Statistics Cards

Three prominent stat cards at the top:

**Pending Refunds** (Yellow)
- Shows count of refunds awaiting your decision
- Icon: Clock
- Urgent attention indicator

**Completed Refunds** (Green)
- Shows total number of processed refunds
- Icon: Checkmark
- Historical tracking

**Total Refunded** (Blue)
- Shows total dollar amount refunded
- Icon: Dollar sign
- Financial tracking

### 2. Status Filters

Quick filter buttons to view refunds by status:

- **All**: Show all refunds
- **Pending**: Show only refunds awaiting action
- **Completed**: Show successfully processed refunds
- **Cancelled**: Show cancelled refund requests

Active filter is highlighted in purple.

### 3. Refunds Table

Comprehensive table showing all refund requests with 8 columns:

| Column | Description |
|--------|-------------|
| Refund ID | Unique refund identifier (#123) |
| Order ID | Associated order number (#456) |
| Customer | Customer name and email |
| Amount | Refund amount in dollars |
| Type | Full or Partial refund |
| Status | Current status with color badge |
| Date | Request date |
| Actions | "View Details" button |

**Status Badges**:
- 🟡 **Pending**: Yellow badge - Awaiting your action
- 🔵 **Processing**: Blue badge - Currently being processed
- 🟢 **Completed**: Green badge - Successfully refunded
- 🔴 **Failed**: Red badge - Stripe processing failed
- ⚫ **Cancelled**: Gray badge - Request cancelled

### 4. Refund Details Modal

Click "View Details" on any refund to open a detailed modal showing:

**Basic Information**:
- Refund ID
- Order ID
- Refund Amount (large, prominent)
- Refund Type (Full/Partial)
- Status Badge
- Request Date

**Customer Information**:
- Customer Name
- Customer Email

**Refund Reason**:
- Customer's explanation in a highlighted box

**Processing Notes** (if processed):
- Your approval/cancellation notes

**Stripe Refund ID** (if completed):
- Stripe transaction ID for reference

---

## Processing Refunds

### How to Approve a Refund

1. Click **"View Details"** on a pending refund
2. Review the refund details and customer reason
3. In the "Process Refund" section:
   - Enter your approval notes (required)
   - Example: "Approved - product damaged as described"
4. Click **"Approve & Process Refund"** button
5. Wait for processing (button shows "Processing...")
6. Success message appears: "Refund #123 processed successfully!"
7. Customer automatically receives:
   - Stripe refund to original payment method
   - Email confirmation
   - In-app notification

**What Happens**:
- Refund is processed via Stripe immediately
- Customer receives money in 5-10 business days
- Status changes to "completed"
- Refund appears in completed list

### How to Cancel a Refund

1. Click **"View Details"** on a pending refund
2. Review the refund details
3. In the "Cancel Refund" section:
   - Enter your cancellation reason (required)
   - Example: "Customer withdrew request"
4. Click **"Cancel Refund Request"** button
5. Success message appears: "Refund #123 cancelled successfully"
6. Customer receives notification

**What Happens**:
- No money is refunded
- Status changes to "cancelled"
- Order status reverts to original
- Customer is notified via in-app notification

---

## User Interface Elements

### Notifications

**Success Messages** (Green):
- Auto-dismiss after 5 seconds
- Can be manually dismissed with X button
- Examples:
  - "Refund #123 processed successfully! Customer will be refunded $49.99"
  - "Refund #123 cancelled successfully"

**Error Messages** (Red):
- Stay visible until manually dismissed
- Show specific error from backend
- Examples:
  - "Failed to process refund"
  - "Please provide a reason for approving this refund"

### Loading States

**Table Loading**:
- Spinning purple loader in center
- Shows while fetching refunds

**Button Loading**:
- Button text changes to "Processing..."
- Button becomes disabled
- Prevents double-submissions

### Empty States

- "No refunds found" when no refunds match filter
- Clean, centered message

---

## Refund Workflow

### Complete Approval Flow

```
1. Customer requests refund
         ↓
2. You receive notification
         ↓
3. Click "Refunds" tab in dashboard
         ↓
4. See pending refund in yellow card stat
         ↓
5. Click "View Details" on refund
         ↓
6. Review customer's reason
         ↓
7. Add your approval notes
         ↓
8. Click "Approve & Process Refund"
         ↓
9. Stripe processes refund automatically
         ↓
10. Customer receives email + notification
         ↓
11. Status changes to "completed"
         ↓
12. Refund moves to completed list
```

### Complete Cancellation Flow

```
1. Customer requests refund
         ↓
2. You receive notification
         ↓
3. Review refund details
         ↓
4. Determine refund is not warranted
         ↓
5. Add cancellation reason
         ↓
6. Click "Cancel Refund Request"
         ↓
7. Customer receives notification
         ↓
8. Status changes to "cancelled"
         ↓
9. Order remains as-is
```

---

## Best Practices

### For Store Owners

**Review Promptly** ⏰
- Check refunds daily
- Process within 24 hours
- Customers appreciate quick responses

**Be Thorough** 🔍
- Read customer's reason carefully
- Check order history
- Verify product condition if returned

**Document Well** 📝
- Add clear approval/cancellation notes
- Explain your decision
- Helps with future reference

**Communicate** 💬
- If you need more info, contact customer first
- Use clear, professional language in notes
- Set customer expectations

**Monitor Trends** 📊
- High refund rates may indicate quality issues
- Track common refund reasons
- Adjust products/descriptions accordingly

### Decision Guidelines

**Consider Approving When**:
- ✅ Product defective or damaged
- ✅ Item not as described
- ✅ Shipping damage
- ✅ Wrong item sent
- ✅ Quality concerns
- ✅ Customer dissatisfaction with valid reason

**Consider Cancelling When**:
- ❌ Customer withdrew request
- ❌ Issue resolved through support
- ❌ Return period expired
- ❌ Product shows signs of use/damage by customer
- ❌ Fraudulent claim suspected
- ❌ Policy clearly states non-refundable

---

## Keyboard Shortcuts

**Modal Navigation**:
- `ESC` - Close refund details modal
- `Tab` - Navigate between fields
- `Enter` - Submit form (when in textarea)

---

## Mobile Experience

The refund dashboard is fully responsive:

**Mobile Layout**:
- Stats cards stack vertically (1 column)
- Table scrolls horizontally
- Modal fits screen with scroll
- Touch-friendly buttons
- Optimized for small screens

**Tablet Layout**:
- Stats cards in 2 columns
- Better table visibility
- Larger touch targets

**Desktop Layout**:
- Stats cards in 3 columns
- Full table width
- Modal in center overlay

---

## Common Scenarios

### Scenario 1: Damaged Product

**Customer Reason**: "Product arrived damaged"

**Your Action**:
1. Review order details
2. Check if shipping insurance applies
3. Approve refund
4. Notes: "Approved - shipping damage confirmed"

### Scenario 2: Wrong Item Sent

**Customer Reason**: "Received wrong item"

**Your Action**:
1. Check order vs what was shipped
2. Verify the mistake
3. Approve refund
4. Notes: "Approved - wrong item shipped, our error"
5. Consider sending correct item separately

### Scenario 3: Customer Changed Mind

**Customer Reason**: "No longer need this item"

**Your Action** (depends on policy):
1. Check your return policy
2. Verify return period
3. If within policy: Approve
4. If outside policy: Cancel with explanation
5. Notes: "Cancelled - outside 30-day return window"

### Scenario 4: Quality Concerns

**Customer Reason**: "Product quality not as expected"

**Your Action**:
1. Review product description
2. Check if expectations were set correctly
3. Consider partial refund
4. Notes: "Approved - customer dissatisfaction"
5. Update product description if needed

---

## Troubleshooting

### "Failed to process refund"

**Possible Causes**:
- Stripe API error
- Original payment can't be refunded
- Order already refunded
- Network issue

**Solutions**:
1. Retry the refund
2. Check Stripe dashboard
3. Verify order status
4. Contact support if persists

### Refund not appearing in list

**Solutions**:
1. Refresh the page
2. Check status filter (might be filtered out)
3. Verify you're logged in as store owner
4. Check if refund is for your store's product

### Can't see "Approve" button

**Reason**: Refund is not in "pending" status

**Explanation**:
- Only pending refunds can be processed
- Completed/cancelled refunds show status indicator
- Processing refunds are being handled by Stripe

---

## Integration with Stripe

### How Stripe Refunds Work

**When you approve a refund**:

1. **Immediate**: Refund sent to Stripe
2. **Stripe Process**: 1-2 minutes
3. **Status Update**: "completed" in dashboard
4. **Customer Bank**: 5-10 business days

**Refund Metadata** (tracked in Stripe):
- Refund ID
- Order ID
- Refund Type
- Processed by: "store_owner"

**View in Stripe**:
- Go to Stripe Dashboard
- Navigate to Payments → Refunds
- Find refund by Stripe Refund ID
- See full transaction details

---

## Frequently Asked Questions

### Q: Can I approve partial refunds?

**A**: Yes! The system supports both full and partial refunds. The refund type is set when the customer requests the refund.

### Q: What if I accidentally approve the wrong refund?

**A**: Once approved and processed through Stripe, refunds cannot be reversed automatically. You would need to:
1. Contact the customer
2. Ask them to return the money
3. Or create a new order for them

**Prevention**: Always double-check before clicking "Approve & Process Refund"

### Q: How long does Stripe take to process refunds?

**A**: Stripe processes refunds immediately (1-2 minutes), but it takes 5-10 business days for the money to appear in the customer's account. This is due to banking processing times.

### Q: Can admins process my store's refunds?

**A**: No. The refund system is designed for **store owners** to process their own product refunds. Admins only handle refunds for platform products (products added through admin dashboard).

### Q: Do I get notified of new refund requests?

**A**: Yes! You receive:
- In-app notification (bell icon)
- Notification details with refund info
- Link to refund dashboard

### Q: What if customer doesn't return the product?

**A**: This system only handles the financial refund. Product returns should be managed separately:
1. Communicate with customer about return
2. Provide return shipping label if needed
3. Wait for product return confirmation
4. Then process refund in dashboard

### Q: Can I see refund history?

**A**: Yes! Use the filters:
- Click "Completed" to see all approved refunds
- Click "Cancelled" to see all declined refunds
- Click "All" to see entire history

### Q: Are there any fees for processing refunds?

**A**: Stripe does **not** return the processing fees when you refund. You'll lose the Stripe transaction fee (usually 2.9% + $0.30). The customer gets the full refund amount.

---

## Security & Privacy

### Data Protection

- All API calls use session authentication
- Only store owners can see their own refunds
- Customer email addresses are protected
- Stripe refund IDs are secure

### Authorization

- You can ONLY process refunds for your store's products
- Attempting to process other stores' refunds will fail
- Backend enforces ownership validation

---

## Support

### Need Help?

**Common Issues**:
1. Check the Troubleshooting section above
2. Verify your store owner authentication
3. Check browser console for errors
4. Try refreshing the page

**Contact Support**:
- For technical issues: support@afrozy.com
- For policy questions: Check merchant guidelines
- For Stripe issues: Check Stripe Dashboard

---

## Updates & Future Features

### Planned Enhancements

- [ ] **Bulk Actions**: Process multiple refunds at once
- [ ] **Refund Analytics**: Charts and trends
- [ ] **Export to CSV**: Download refund history
- [ ] **Email Templates**: Customize refund emails
- [ ] **Automatic Rules**: Auto-approve small amounts
- [ ] **Return Labels**: Generate prepaid return labels
- [ ] **Dispute Management**: Handle customer disputes
- [ ] **Refund Notes History**: Track all notes/changes

---

## Changelog

### Version 1.0 (January 28, 2026)
- ✅ Initial release
- ✅ Full refund management UI
- ✅ Approve/cancel functionality
- ✅ Stats dashboard
- ✅ Status filtering
- ✅ Detailed refund modal
- ✅ Stripe integration
- ✅ Email notifications
- ✅ Mobile responsive

---

**Last Updated**: January 28, 2026
**Status**: ✅ Fully Implemented and Production-Ready
**Platform**: Store Owner Dashboard

---

## Quick Reference

### At a Glance

| Action | Location | Result |
|--------|----------|--------|
| View refunds | Dashboard → Refunds tab | See all refunds |
| Filter pending | Click "Pending" button | Show only pending |
| View details | Click "View Details" | Open modal |
| Approve refund | Modal → Add notes → Approve | Stripe processes refund |
| Cancel refund | Modal → Add reason → Cancel | Request cancelled |

### Status Colors

- 🟡 Yellow = Pending (action needed)
- 🔵 Blue = Processing (in progress)
- 🟢 Green = Completed (done)
- 🔴 Red = Failed (error)
- ⚫ Gray = Cancelled (rejected)

---

**Remember**: Always review refund requests promptly and communicate clearly with customers. Good refund management builds trust and improves customer satisfaction!
