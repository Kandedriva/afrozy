const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');
const { authenticateSession } = require('./auth');

// Middleware to extract user ID or session ID
const extractUserOrSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    // User is authenticated via session
    req.isAuthenticated = true;
    req.userId = req.session.userId;
    next();
  } else {
    // Guest user - get session ID from headers
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required for guest checkout'
      });
    }
    
    req.sessionId = sessionId;
    req.isAuthenticated = false;
    next();
  }
};

// Create a payment intent for checkout
router.post('/create-payment-intent', extractUserOrSession, async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        userId: req.session?.userId || 'guest',
        sessionId: req.sessionId || '',
        ...metadata
      },
      payment_method_types: ['card'], // Only allow card payments
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Process checkout with cart items
router.post('/process', extractUserOrSession, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { deliveryInfo } = req.body;
    
    // Validate delivery information
    if (!deliveryInfo) {
      return res.status(400).json({
        success: false,
        message: 'Delivery information is required'
      });
    }
    
    const requiredFields = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    for (const field of requiredFields) {
      if (!deliveryInfo[field] || !deliveryInfo[field].trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required for delivery`
        });
      }
    }

    await client.query('BEGIN');
    
    // Get cart items
    let cartQuery, cartParams;
    if (req.isAuthenticated && req.userId) {
      cartQuery = `
        SELECT ci.*, p.name, p.price, p.stock_quantity, p.image_url, p.store_id
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1
      `;
      cartParams = [req.userId];
    } else {
      cartQuery = `
        SELECT ci.*, p.name, p.price, p.stock_quantity, p.image_url, p.store_id
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = $1
      `;
      cartParams = [req.sessionId];
    }

    const cartResult = await client.query(cartQuery, cartParams);
    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.quantity > item.stock_quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.name}. Available: ${item.stock_quantity}, Requested: ${item.quantity}`
        });
      }
    }

    // Group cart items by store for multi-vendor checkout
    const itemsByStore = cartItems.reduce((acc, item) => {
      if (!acc[item.store_id]) {
        acc[item.store_id] = [];
      }
      acc[item.store_id].push(item);
      return acc;
    }, {});

    // Calculate total amount
    const totalAmount = cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Get store information and Stripe accounts for all stores in the cart
    const storeIds = Object.keys(itemsByStore);
    const storeQuery = `
      SELECT id, store_name, stripe_connect_account_id, stripe_account_status
      FROM stores 
      WHERE id = ANY($1)
    `;
    const storeResult = await client.query(storeQuery, [storeIds]);
    const stores = storeResult.rows;

    // Check if all stores have connected Stripe accounts
    const storesWithoutStripe = stores.filter(store => 
      !store.stripe_connect_account_id || store.stripe_account_status !== 'connected'
    );

    if (storesWithoutStripe.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Some stores haven't set up payments yet: ${storesWithoutStripe.map(s => s.store_name).join(', ')}`,
        unavailableStores: storesWithoutStripe.map(s => s.store_name)
      });
    }

    // Calculate application fee (platform fee) - 3% of total
    const applicationFeePercent = 0.03;
    const applicationFeeAmount = Math.round(totalAmount * applicationFeePercent * 100);

    // For multi-vendor, we'll use the first store's connected account as the main account
    // and transfer to other accounts. Alternatively, you could create separate payment intents
    const primaryStore = stores[0];

    // Create payment intent with the primary store account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      application_fee_amount: applicationFeeAmount,
      on_behalf_of: primaryStore.stripe_connect_account_id,
      transfer_data: {
        destination: primaryStore.stripe_connect_account_id,
      },
      metadata: {
        userId: req.userId || 'guest',
        sessionId: req.sessionId || '',
        orderType: 'cart_checkout',
        customerName: deliveryInfo.fullName,
        customerEmail: deliveryInfo.email,
        storeIds: storeIds.join(','),
        multiVendor: storeIds.length > 1 ? 'true' : 'false'
      },
      payment_method_types: ['card'],
    });

    // Create order record with delivery information
    const orderInsertQuery = `
      INSERT INTO orders (
        user_id, session_id, total, total_amount, status, 
        payment_intent_id, items, payment_method, 
        delivery_name, delivery_email, delivery_phone, 
        delivery_address, delivery_city, delivery_state, 
        delivery_zip, delivery_country, delivery_instructions,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING id, created_at
    `;

    const orderResult = await client.query(orderInsertQuery, [
      req.userId || null,
      req.sessionId || null,
      totalAmount,  // For 'total' column
      totalAmount,  // For 'total_amount' column  
      'pending',
      paymentIntent.id,
      JSON.stringify(cartItems),
      'stripe',  // payment_method
      deliveryInfo.fullName,
      deliveryInfo.email,
      deliveryInfo.phone,
      deliveryInfo.address,
      deliveryInfo.city,
      deliveryInfo.state,
      deliveryInfo.zipCode,
      deliveryInfo.country || 'United States',
      deliveryInfo.deliveryInstructions || null
    ]);

    const orderId = orderResult.rows[0].id;

    // Update stock quantities
    for (const item of cartItems) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId,
        totalAmount,
        items: cartItems
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing checkout:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      success: false,
      message: 'Failed to process checkout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

// Confirm payment and complete order
router.post('/confirm', extractUserOrSession, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    await client.query('BEGIN');

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Get order details first
      const getOrderQuery = `
        SELECT id, user_id, session_id, items
        FROM orders 
        WHERE payment_intent_id = $1
      `;
      
      const orderResult = await client.query(getOrderQuery, [paymentIntentId]);
      
      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        const orderItems = JSON.parse(order.items);
        
        // Handle multi-vendor transfers if needed
        const isMultiVendor = paymentIntent.metadata?.multiVendor === 'true';
        
        if (isMultiVendor && paymentIntent.metadata?.storeIds) {
          const storeIds = paymentIntent.metadata.storeIds.split(',');
          
          // Group items by store and calculate amounts
          const itemsByStore = orderItems.reduce((acc, item) => {
            if (!acc[item.store_id]) {
              acc[item.store_id] = [];
            }
            acc[item.store_id].push(item);
            return acc;
          }, {});

          // Get store Stripe accounts
          const storeQuery = `
            SELECT id, stripe_connect_account_id, store_name
            FROM stores 
            WHERE id = ANY($1) AND stripe_connect_account_id IS NOT NULL
          `;
          const storeResult = await client.query(storeQuery, [storeIds]);
          const stores = storeResult.rows;

          // Create transfers to other stores (excluding primary store that received the payment)
          const primaryStoreId = storeIds[0];
          const otherStores = stores.filter(store => store.id.toString() !== primaryStoreId);

          const failedTransfers = [];

          for (const store of otherStores) {
            const storeItems = itemsByStore[store.id];
            if (storeItems && storeItems.length > 0) {
              const storeAmount = storeItems.reduce((total, item) => {
                return total + (parseFloat(item.price) * item.quantity);
              }, 0);

              // Create transfer to this store (minus platform fee)
              const platformFeePercent = 0.03;
              const transferAmount = Math.round(storeAmount * (1 - platformFeePercent) * 100);

              // Retry logic for failed transfers
              let transferSuccess = false;
              let lastError = null;
              const maxRetries = 3;

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  await stripe.transfers.create({
                    amount: transferAmount,
                    currency: 'usd',
                    destination: store.stripe_connect_account_id,
                    metadata: {
                      orderId: order.id.toString(),
                      storeId: store.id.toString(),
                      storeName: store.store_name,
                    },
                  });

                  console.log(`✅ Transfer created for store ${store.store_name}: $${transferAmount / 100}`);
                  transferSuccess = true;
                  break; // Success, exit retry loop
                } catch (transferError) {
                  lastError = transferError;
                  console.error(`❌ Transfer attempt ${attempt}/${maxRetries} failed for store ${store.store_name}:`, transferError.message);

                  if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                  }
                }
              }

              // If all retries failed, log for manual review
              if (!transferSuccess) {
                failedTransfers.push({
                  storeId: store.id,
                  storeName: store.store_name,
                  amount: transferAmount,
                  accountId: store.stripe_connect_account_id,
                  error: lastError.message
                });

                // Store failed transfer in database for admin review
                try {
                  await client.query(`
                    INSERT INTO failed_transfers
                    (order_id, store_id, store_name, amount_cents, stripe_account_id, error_message, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                  `, [
                    order.id,
                    store.id,
                    store.store_name,
                    transferAmount,
                    store.stripe_connect_account_id,
                    lastError.message
                  ]);
                  console.warn(`⚠️  Failed transfer logged for admin review: Order ${order.id}, Store ${store.store_name}`);
                } catch (logError) {
                  // If failed_transfers table doesn't exist, just log to console
                  console.error('Could not log failed transfer to database:', logError.message);
                  console.error('CRITICAL: Manual transfer needed for:', {
                    orderId: order.id,
                    storeId: store.id,
                    storeName: store.store_name,
                    amount: transferAmount / 100,
                    accountId: store.stripe_connect_account_id
                  });
                }
              }
            }
          }

          // If there were failed transfers, add note to order
          if (failedTransfers.length > 0) {
            await client.query(`
              UPDATE orders
              SET notes = COALESCE(notes || E'\n', '') || $1
              WHERE id = $2
            `, [
              `⚠️ ${failedTransfers.length} transfer(s) failed and require manual processing`,
              order.id
            ]);
          }
        }

        // Update order status
        const updateOrderQuery = `
          UPDATE orders 
          SET status = 'completed', updated_at = NOW()
          WHERE payment_intent_id = $1
        `;
        
        await client.query(updateOrderQuery, [paymentIntentId]);
        
        // Clear cart
        if (order.user_id) {
          await client.query('DELETE FROM cart_items WHERE user_id = $1', [order.user_id]);
        } else if (order.session_id) {
          await client.query('DELETE FROM cart_items WHERE session_id = $1', [order.session_id]);
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Payment confirmed and order completed',
          data: {
            orderId: order.id,
            paymentStatus: paymentIntent.status,
            multiVendor: isMultiVendor
          }
        });
      } else {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
    } else {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Payment not successful',
        data: {
          paymentStatus: paymentIntent.status
        }
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// Get checkout session info
router.get('/session/:paymentIntentId', extractUserOrSession, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    // Get order details
    const orderQuery = `
      SELECT id, total_amount, status, items, created_at,
             delivery_name, delivery_email, delivery_phone,
             delivery_address, delivery_city, delivery_state,
             delivery_zip, delivery_country, delivery_instructions
      FROM orders
      WHERE payment_intent_id = $1
      AND (user_id = $2 OR session_id = $3)
    `;
    
    const orderResult = await pool.query(orderQuery, [
      paymentIntentId,
      req.session?.userId || null,
      req.sessionId || null
    ]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }

    const order = orderResult.rows[0];

    res.json({
      success: true,
      data: {
        orderId: order.id,
        totalAmount: order.total_amount,
        status: order.status,
        items: order.items,
        createdAt: order.created_at,
        deliveryInfo: {
          fullName: order.delivery_name,
          email: order.delivery_email,
          phone: order.delivery_phone,
          address: order.delivery_address,
          city: order.delivery_city,
          state: order.delivery_state,
          zipCode: order.delivery_zip,
          country: order.delivery_country,
          deliveryInstructions: order.delivery_instructions
        }
      }
    });

  } catch (error) {
    console.error('Error fetching checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;