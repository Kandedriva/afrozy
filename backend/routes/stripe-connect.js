const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');

// Session-based authentication middleware for store owners
function authenticateStoreOwner(req, res, next) {
  // Check session authentication
  if (!req.session || !req.session.userId || !req.session.userType) {
    return res.status(401).json({
      success: false,
      message: 'Store owner authentication required. Please log in.'
    });
  }

  // Verify user is a store owner
  if (req.session.userType !== 'store_owner') {
    return res.status(403).json({
      success: false,
      message: 'Store owner access required'
    });
  }

  req.user = { 
    userId: req.session.userId, 
    userType: req.session.userType, 
    email: req.session.email 
  };

  // Get store ID for this store owner
  pool.query('SELECT id, stripe_connect_account_id, stripe_account_status FROM stores WHERE owner_id = $1', [req.user.userId])
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No store found for this user'
        });
      }

      req.user.store = result.rows[0];
      req.user.storeId = result.rows[0].id;
      next();
    })
    .catch(error => {
      console.error('Error verifying store owner:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    });
}

// POST /api/stripe-connect/create-account - Create Stripe Connect account
router.post('/create-account', authenticateStoreOwner, async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { businessInfo } = req.body;

    // Check if store already has a Stripe Connect account
    if (req.user.store.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Store already has a Stripe Connect account'
      });
    }

    // Get store details
    const storeQuery = `
      SELECT s.*, so.email, so.full_name, so.phone 
      FROM stores s 
      JOIN store_owners so ON s.owner_id = so.id 
      WHERE s.id = $1
    `;
    const storeResult = await pool.query(storeQuery, [storeId]);
    const store = storeResult.rows[0];

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: store.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // or 'company' based on business_type
      individual: {
        email: store.email,
        first_name: store.full_name?.split(' ')[0] || '',
        last_name: store.full_name?.split(' ').slice(1).join(' ') || '',
        phone: store.phone || '',
      },
      business_profile: {
        name: store.store_name,
        product_description: store.store_description || 'Online marketplace store',
        support_email: store.email,
        url: `${process.env.CLIENT_URL}/store/${storeId}`,
      },
      metadata: {
        store_id: storeId.toString(),
        store_name: store.store_name,
        owner_id: store.owner_id.toString(),
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.CLIENT_URL}/store-dashboard?tab=payments&refresh=true`,
      return_url: `${process.env.CLIENT_URL}/store-dashboard?tab=payments&success=true`,
      type: 'account_onboarding',
    });

    // Update store with Stripe Connect account ID and onboarding URL
    await pool.query(`
      UPDATE stores 
      SET stripe_connect_account_id = $1, 
          stripe_account_status = 'pending',
          stripe_onboarding_url = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [account.id, accountLink.url, storeId]);

    res.json({
      success: true,
      message: 'Stripe Connect account created successfully',
      data: {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      }
    });

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    
    // Handle specific Stripe Connect signup error
    if (error.message && error.message.includes('signed up for Connect')) {
      return res.status(400).json({
        success: false,
        message: 'Stripe Connect is not enabled for this account. Please visit https://dashboard.stripe.com/connect/accounts/overview to enable Stripe Connect for your account.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        connectSignupRequired: true
      });
    }
    
    // Handle invalid URL error
    if (error.code === 'url_invalid') {
      return res.status(400).json({
        success: false,
        message: 'Invalid store URL configuration. Please contact support.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create Stripe Connect account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/stripe-connect/account-status - Get account status
router.get('/account-status', authenticateStoreOwner, async (req, res) => {
  try {
    const accountId = req.user.store.stripe_connect_account_id;

    if (!accountId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          status: 'not_connected',
          message: 'No Stripe Connect account found'
        }
      });
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const accountData = {
      connected: true,
      accountId: account.id,
      status: req.user.store.stripe_account_status,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
      capabilities: account.capabilities,
    };

    // Update local database with latest status
    await pool.query(`
      UPDATE stores 
      SET stripe_details_submitted = $1,
          stripe_charges_enabled = $2,
          stripe_payouts_enabled = $3,
          stripe_account_status = $4,
          stripe_onboarding_completed = $5,
          stripe_connected_at = CASE 
            WHEN $2 = true AND $3 = true AND stripe_connected_at IS NULL 
            THEN CURRENT_TIMESTAMP 
            ELSE stripe_connected_at 
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [
      account.details_submitted,
      account.charges_enabled,
      account.payouts_enabled,
      account.charges_enabled && account.payouts_enabled ? 'connected' : 'pending',
      account.details_submitted,
      req.user.storeId
    ]);

    res.json({
      success: true,
      data: accountData
    });

  } catch (error) {
    console.error('Error retrieving Stripe Connect account status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve account status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/stripe-connect/create-onboarding-link - Create new onboarding link
router.post('/create-onboarding-link', authenticateStoreOwner, async (req, res) => {
  try {
    const accountId = req.user.store.stripe_connect_account_id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe Connect account found'
      });
    }

    // Create new account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.CLIENT_URL}/store-dashboard?tab=payments&refresh=true`,
      return_url: `${process.env.CLIENT_URL}/store-dashboard?tab=payments&success=true`,
      type: 'account_onboarding',
    });

    // Update onboarding URL in database
    await pool.query(`
      UPDATE stores 
      SET stripe_onboarding_url = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [accountLink.url, req.user.storeId]);

    res.json({
      success: true,
      message: 'New onboarding link created',
      data: {
        onboardingUrl: accountLink.url,
      }
    });

  } catch (error) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create onboarding link',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/stripe-connect/create-login-link - Create dashboard login link
router.post('/create-login-link', authenticateStoreOwner, async (req, res) => {
  try {
    const accountId = req.user.store.stripe_connect_account_id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe Connect account found'
      });
    }

    // Check if account is fully onboarded
    if (req.user.store.stripe_account_status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Account must be fully onboarded to access dashboard'
      });
    }

    // Create login link for Stripe dashboard
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    res.json({
      success: true,
      message: 'Dashboard login link created',
      data: {
        loginUrl: loginLink.url,
      }
    });

  } catch (error) {
    console.error('Error creating dashboard login link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard login link',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/stripe-connect/balance - Get account balance
router.get('/balance', authenticateStoreOwner, async (req, res) => {
  try {
    const accountId = req.user.store.stripe_connect_account_id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe Connect account found'
      });
    }

    // Check if account can receive payments
    if (req.user.store.stripe_account_status !== 'connected') {
      return res.json({
        success: true,
        data: {
          available: [],
          pending: [],
          message: 'Account not fully connected'
        }
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    res.json({
      success: true,
      data: balance
    });

  } catch (error) {
    console.error('Error retrieving balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/stripe-connect/disconnect - Disconnect Stripe account
router.delete('/disconnect', authenticateStoreOwner, async (req, res) => {
  try {
    const accountId = req.user.store.stripe_connect_account_id;
    const storeId = req.user.storeId;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe Connect account found'
      });
    }

    // Note: We don't delete the Stripe account as it may have pending payouts
    // Instead, we just disconnect it from our platform
    
    // Update store to remove Stripe Connect association
    await pool.query(`
      UPDATE stores 
      SET stripe_connect_account_id = NULL,
          stripe_account_status = 'not_connected',
          stripe_onboarding_completed = FALSE,
          stripe_details_submitted = FALSE,
          stripe_charges_enabled = FALSE,
          stripe_payouts_enabled = FALSE,
          stripe_onboarding_url = NULL,
          stripe_connected_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [storeId]);

    res.json({
      success: true,
      message: 'Stripe Connect account disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Stripe account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Stripe account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;