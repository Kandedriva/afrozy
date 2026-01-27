const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');
const { authenticateSession, authenticateAdmin } = require('./auth');
const { createNotification } = require('./notifications');
const emailService = require('../utils/emailService');

/**
 * POST - Request a refund (Customer or Admin)
 * Initiates a refund request for an order
 */
router.post('/request', authenticateSession, async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId, reason, refundType = 'full', items } = req.body;
    const userId = req.session.userId;

    if (!orderId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and reason are required'
      });
    }

    await client.query('BEGIN');

    // Get order details
    const orderQuery = `
      SELECT o.*, c.full_name, c.email
      FROM orders o
      LEFT JOIN customers c ON o.user_id = c.id
      WHERE o.id = $1 AND (o.user_id = $2 OR $2 IS NULL)
    `;
    const orderResult = await client.query(orderQuery, [orderId, userId]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Order not found or unauthorized'
      });
    }

    const order = orderResult.rows[0];

    // Check if order can be refunded
    if (order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot refund a cancelled order'
      });
    }

    if (order.refund_status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded'
      });
    }

    // Calculate refund amount
    let refundAmount;
    if (refundType === 'full') {
      refundAmount = parseFloat(order.total_amount);
    } else if (refundType === 'partial' && items && Array.isArray(items)) {
      // Calculate partial refund from items
      refundAmount = items.reduce((sum, item) => sum + parseFloat(item.refundAmount || 0), 0);
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid refund type or missing items for partial refund'
      });
    }

    // Validate refund amount
    if (refundAmount <= 0 || refundAmount > parseFloat(order.total_amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid refund amount'
      });
    }

    // Create refund record
    const refundQuery = `
      INSERT INTO refunds (
        order_id, user_id, refund_amount, refund_reason, refund_type,
        status, stripe_payment_intent_id, requested_by, requested_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const refundResult = await client.query(refundQuery, [
      orderId,
      order.user_id,
      refundAmount,
      reason,
      refundType,
      'pending',
      order.payment_intent_id,
      'customer',
      userId
    ]);

    const refund = refundResult.rows[0];

    // If partial refund, save items
    if (refundType === 'partial' && items) {
      for (const item of items) {
        await client.query(`
          INSERT INTO refund_items (refund_id, product_id, quantity, refund_amount, reason)
          VALUES ($1, $2, $3, $4, $5)
        `, [refund.id, item.productId, item.quantity, item.refundAmount, item.reason || '']);
      }
    }

    // Update order refund status
    await client.query(`
      UPDATE orders SET refund_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, ['requested', orderId]);

    await client.query('COMMIT');

    // Create notification for admin
    await createNotification(
      null, // Will be sent to all admins
      'admin',
      `New Refund Request #${refund.id}`,
      `Customer requested ${refundType} refund for order #${orderId}: $${refundAmount}`,
      'refund',
      `/admin/refunds/${refund.id}`
    );

    res.json({
      success: true,
      message: 'Refund request submitted successfully',
      data: {
        refundId: refund.id,
        status: refund.status,
        amount: refundAmount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error requesting refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

/**
 * POST - Process refund (Admin only)
 * Processes a pending refund request via Stripe
 */
router.post('/:id/process', authenticateAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.session.userId;

    await client.query('BEGIN');

    // Get refund details
    const refundQuery = `
      SELECT r.*, o.payment_intent_id, o.total_amount, c.email, c.full_name
      FROM refunds r
      JOIN orders o ON r.order_id = o.id
      LEFT JOIN customers c ON r.user_id = c.id
      WHERE r.id = $1
    `;
    const refundResult = await client.query(refundQuery, [id]);

    if (refundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    const refund = refundResult.rows[0];

    if (refund.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Refund is already ${refund.status}`
      });
    }

    // Update refund status to processing
    await client.query(`
      UPDATE refunds
      SET status = 'processing', processed_by_id = $1, admin_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [adminId, adminNotes, id]);

    try {
      // Process refund via Stripe
      const stripeRefund = await stripe.refunds.create({
        payment_intent: refund.payment_intent_id,
        amount: Math.round(parseFloat(refund.refund_amount) * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          refund_id: id.toString(),
          order_id: refund.order_id.toString(),
          refund_type: refund.refund_type
        }
      });

      // Update refund with Stripe refund ID and mark as completed
      await client.query(`
        UPDATE refunds
        SET
          status = 'completed',
          stripe_refund_id = $1,
          processed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [stripeRefund.id, id]);

      // Update order refund status
      await client.query(`
        UPDATE orders
        SET refund_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [refund.refund_type === 'full' ? 'completed' : 'partial', refund.order_id]);

      await client.query('COMMIT');

      // Send refund confirmation email
      if (refund.email) {
        try {
          await emailService.sendRefundConfirmation(
            refund.email,
            refund.full_name || 'Customer',
            {
              refundId: id,
              orderId: refund.order_id,
              refundAmount: parseFloat(refund.refund_amount),
              refundType: refund.refund_type,
              stripeRefundId: stripeRefund.id
            }
          );
          console.log(`✅ Refund confirmation email sent for refund #${id}`);
        } catch (emailError) {
          console.error('Failed to send refund email:', emailError.message);
        }
      }

      // Create notification for customer
      if (refund.user_id) {
        await createNotification(
          refund.user_id,
          'customer',
          `Refund Processed`,
          `Your refund of $${refund.refund_amount} for order #${refund.order_id} has been processed.`,
          'refund',
          `/account/orders/${refund.order_id}`
        );
      }

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId: id,
          stripeRefundId: stripeRefund.id,
          amount: parseFloat(refund.refund_amount),
          status: 'completed'
        }
      });

    } catch (stripeError) {
      // Stripe refund failed
      await client.query(`
        UPDATE refunds
        SET status = 'failed', admin_notes = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [`Stripe error: ${stripeError.message}`, id]);

      await client.query('COMMIT');

      throw new Error(`Stripe refund failed: ${stripeError.message}`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

/**
 * POST - Cancel refund request (Admin only)
 * Cancels a pending refund request
 */
router.post('/:id/cancel', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const adminId = req.session.userId;

    const result = await pool.query(`
      UPDATE refunds
      SET
        status = 'cancelled',
        admin_notes = $1,
        processed_by_id = $2,
        processed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [cancelReason, adminId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found or cannot be cancelled'
      });
    }

    const refund = result.rows[0];

    // Update order refund status back to none
    await pool.query(`
      UPDATE orders SET refund_status = 'none', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [refund.order_id]);

    // Notify customer if they have user_id
    if (refund.user_id) {
      await createNotification(
        refund.user_id,
        'customer',
        `Refund Request Cancelled`,
        `Your refund request for order #${refund.order_id} has been cancelled.`,
        'refund',
        `/account/orders/${refund.order_id}`
      );
    }

    res.json({
      success: true,
      message: 'Refund cancelled successfully',
      data: { refundId: id }
    });

  } catch (error) {
    console.error('Error cancelling refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel refund'
    });
  }
});

/**
 * GET - Get all refunds (Admin only)
 * Lists all refund requests with filtering
 */
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        r.*,
        o.payment_intent_id,
        o.total_amount as order_total,
        c.full_name as customer_name,
        c.email as customer_email
      FROM refunds r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN customers c ON r.user_id = c.id
    `;

    const params = [];
    if (status) {
      query += ` WHERE r.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = status
      ? `SELECT COUNT(*) FROM refunds WHERE status = $1`
      : `SELECT COUNT(*) FROM refunds`;
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refunds'
    });
  }
});

/**
 * GET - Get refund by ID
 * View details of a specific refund
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const refundQuery = `
      SELECT
        r.*,
        o.payment_intent_id,
        o.total_amount as order_total,
        o.status as order_status,
        c.full_name as customer_name,
        c.email as customer_email,
        admin.username as processed_by_name
      FROM refunds r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN customers c ON r.user_id = c.id
      LEFT JOIN admins admin ON r.processed_by_id = admin.id
      WHERE r.id = $1
    `;

    const refundResult = await pool.query(refundQuery, [id]);

    if (refundResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    const refund = refundResult.rows[0];

    // Get refund items if partial refund
    if (refund.refund_type === 'partial') {
      const itemsQuery = `
        SELECT ri.*, p.name as product_name
        FROM refund_items ri
        LEFT JOIN products p ON ri.product_id = p.id
        WHERE ri.refund_id = $1
      `;
      const itemsResult = await pool.query(itemsQuery, [id]);
      refund.items = itemsResult.rows;
    }

    res.json({
      success: true,
      data: refund
    });

  } catch (error) {
    console.error('Error fetching refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refund details'
    });
  }
});

/**
 * GET - Get customer's refunds
 * Lists all refunds for the authenticated customer
 */
router.get('/customer/my-refunds', authenticateSession, async (req, res) => {
  try {
    const userId = req.session.userId;

    const query = `
      SELECT
        r.*,
        o.payment_intent_id,
        o.total_amount as order_total
      FROM refunds r
      LEFT JOIN orders o ON r.order_id = o.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching customer refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refunds'
    });
  }
});

module.exports = router;
