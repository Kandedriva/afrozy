const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe webhook handler for Connect account events
router.post('/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    // Handle the event
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      
      case 'account.application.authorized':
        await handleAccountAuthorized(event.data.object);
        break;
      
      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object);
        break;
      
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object);
        break;
      
      case 'transfer.created':
        console.log('Transfer created:', event.data.object.id);
        break;
      
      case 'transfer.updated':
        console.log('Transfer updated:', event.data.object.id);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle account update events
async function handleAccountUpdated(account) {
  try {
    console.log('Processing account update for:', account.id);

    // Determine account status based on capabilities and requirements
    let accountStatus = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      accountStatus = 'connected';
    } else if (account.requirements && account.requirements.disabled_reason) {
      accountStatus = 'restricted';
    }

    // Update store information
    const updateQuery = `
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
      WHERE stripe_connect_account_id = $6
    `;

    const result = await pool.query(updateQuery, [
      account.details_submitted,
      account.charges_enabled,
      account.payouts_enabled,
      accountStatus,
      account.details_submitted,
      account.id
    ]);

    if (result.rowCount > 0) {
      console.log(`Updated store with Stripe account ${account.id}`);
    } else {
      console.warn(`No store found with Stripe account ${account.id}`);
    }

  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

// Handle account authorization
async function handleAccountAuthorized(account) {
  try {
    console.log('Account authorized:', account.id);
    // Additional logic for when account is authorized
  } catch (error) {
    console.error('Error handling account authorization:', error);
  }
}

// Handle account deauthorization
async function handleAccountDeauthorized(account) {
  try {
    console.log('Account deauthorized:', account.id);
    
    // Update store to reflect deauthorization
    const updateQuery = `
      UPDATE stores 
      SET stripe_account_status = 'not_connected',
          stripe_charges_enabled = FALSE,
          stripe_payouts_enabled = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE stripe_connect_account_id = $1
    `;

    await pool.query(updateQuery, [account.id]);
    
  } catch (error) {
    console.error('Error handling account deauthorization:', error);
  }
}

// Handle capability updates
async function handleCapabilityUpdated(capability) {
  try {
    console.log('Capability updated:', capability.id, 'Status:', capability.status);
    
    // Get the account this capability belongs to
    const accountId = capability.account;
    
    // You might want to update specific capability statuses
    // This is useful for more granular control over account features
    
  } catch (error) {
    console.error('Error handling capability update:', error);
  }
}

module.exports = router;