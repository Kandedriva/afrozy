# Stripe Connect Implementation Guide

## Overview

This document outlines the implementation of Stripe Connect for the Jamaa Market multi-vendor platform, allowing individual store owners to receive payments directly from their customers while the platform takes a commission.

## Architecture

### Database Schema

The implementation adds the following fields to the `stores` table:

```sql
-- Stripe Connect account fields
stripe_connect_account_id VARCHAR(255)           -- Stripe Connect account ID
stripe_account_status VARCHAR(50) DEFAULT 'not_connected'  -- Account status
stripe_onboarding_completed BOOLEAN DEFAULT FALSE   -- Onboarding completion status  
stripe_details_submitted BOOLEAN DEFAULT FALSE      -- Details submission status
stripe_charges_enabled BOOLEAN DEFAULT FALSE        -- Can accept payments
stripe_payouts_enabled BOOLEAN DEFAULT FALSE        -- Can receive payouts
stripe_onboarding_url TEXT                          -- Current onboarding URL
stripe_connected_at TIMESTAMP                       -- When account was fully connected
```

### Backend Endpoints

#### Stripe Connect Management (`/api/stripe-connect/`)

1. **POST `/create-account`** - Create new Stripe Connect account
2. **GET `/account-status`** - Get current account status and capabilities
3. **POST `/create-onboarding-link`** - Generate new onboarding link
4. **POST `/create-login-link`** - Generate Stripe dashboard login link
5. **GET `/balance`** - Get account balance information
6. **DELETE `/disconnect`** - Disconnect Stripe account

#### Webhook Handler (`/api/webhooks/stripe`)

Handles Stripe Connect account events:
- `account.updated` - Updates account status and capabilities
- `account.application.authorized` - Account authorization events
- `account.application.deauthorized` - Account deauthorization events
- `capability.updated` - Individual capability status changes

### Frontend Components

#### StripeConnect Component

Location: `/frontend/src/components/store/StripeConnect.tsx`

Features:
- Account status display with visual indicators
- One-click Stripe Connect account creation
- Onboarding flow management
- Balance display for connected accounts
- Stripe dashboard access
- Account disconnection functionality

### Multi-Vendor Payment Flow

#### 1. Payment Processing

When a customer checks out with items from multiple stores:

1. **Store Validation**: All stores must have connected Stripe accounts
2. **Payment Intent Creation**: Creates payment intent with primary store account
3. **Platform Fee**: Automatically deducts 3% platform fee
4. **Primary Store Payment**: First store receives the full payment

#### 2. Multi-Vendor Transfers

After successful payment:

1. **Transfer Calculation**: Calculates individual store amounts
2. **Automatic Transfers**: Creates transfers to other store accounts (minus platform fee)
3. **Error Handling**: Logs transfer failures without affecting order completion

## Setup Instructions

### 1. Environment Configuration

Add to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Dashboard Setup

1. **Enable Connect**: Go to Stripe Dashboard → Connect → Get Started
2. **Platform Settings**: Configure your platform information
3. **Webhook Endpoint**: Add webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
4. **Webhook Events**: Enable these events:
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized` 
   - `capability.updated`

### 3. Database Migration

Run the database migration:

```bash
cd backend
node scripts/addStripeConnectToStores.js
```

### 4. Testing

Use Stripe test mode with test Connect accounts:

1. Create test store owner accounts
2. Connect test Stripe accounts
3. Test payment flows with test cards
4. Verify transfers and platform fees

## Store Owner Experience

### 1. Initial Setup

1. **Login to Dashboard**: Store owners log into their dashboard
2. **Navigate to Payments**: Click the "Payments" tab
3. **Connect Account**: Click "Connect with Stripe"
4. **Complete Onboarding**: Fill out Stripe's onboarding form

### 2. Account Management

- **Status Monitoring**: View connection status and requirements
- **Dashboard Access**: Direct link to Stripe dashboard
- **Balance Viewing**: See available and pending balances
- **Account Disconnection**: Option to disconnect if needed

### 3. Payment Reception

- **Automatic Processing**: Payments processed automatically on customer checkout
- **Platform Fee Deduction**: 3% fee automatically deducted
- **Bank Deposits**: Funds deposited according to Stripe's payout schedule

## Customer Experience

### Multi-Store Checkout

1. **Cart Validation**: System checks all stores have payment processing enabled
2. **Seamless Payment**: Single payment process for all items
3. **Error Handling**: Clear messaging if any store can't accept payments

## Platform Revenue

- **Commission**: 3% of all transactions
- **Automatic Collection**: Platform fee collected via Stripe Connect
- **Transparent**: Store owners see net amounts after fees

## Security Features

1. **Account Validation**: All stores verified before payment processing
2. **Webhook Validation**: Stripe webhook signature verification
3. **Session Authentication**: Secure store owner authentication
4. **Error Isolation**: Transfer failures don't affect order completion

## Monitoring and Support

### Logging

- Transfer events logged for debugging
- Account status changes tracked
- Error conditions recorded

### Support Workflows

- Store owners can access Stripe support directly
- Platform can assist with connection issues
- Transfer failures logged for platform review

## Compliance and Risk

- **KYC**: Stripe handles all identity verification
- **PCI Compliance**: Stripe provides PCI compliant payment processing
- **Risk Management**: Stripe's fraud detection applies to all transactions

## Development Notes

### Testing Considerations

1. **Test Data**: Use Stripe test mode for development
2. **Webhook Testing**: Use Stripe CLI for local webhook testing
3. **Multi-Store Carts**: Test scenarios with items from multiple stores
4. **Error Scenarios**: Test failed transfers and account issues

### Production Deployment

1. **Live Keys**: Switch to live Stripe keys
2. **Webhook Endpoint**: Configure production webhook URL
3. **SSL Required**: Ensure HTTPS for all webhook endpoints
4. **Monitoring**: Set up error tracking for transfer failures

## Future Enhancements

1. **Advanced Analytics**: Store-specific revenue analytics
2. **Commission Tiers**: Variable commission rates per store
3. **Instant Payouts**: Express payout options for stores
4. **Multi-Currency**: Support for international stores
5. **Subscription Support**: Recurring payment handling

## Support Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Platform Fee Guide](https://stripe.com/docs/connect/charges-transfers#collecting-fees)
- [Webhook Documentation](https://stripe.com/docs/webhooks)