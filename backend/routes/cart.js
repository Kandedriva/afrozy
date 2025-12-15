const express = require('express');
const { pool } = require('../config/database');
const { authenticateSession } = require('./auth');

const router = express.Router();

// Middleware to extract user ID or session ID
const extractUserOrSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    // User is authenticated via session
    authenticateSession()(req, res, (err) => {
      if (err) {
        return next(err);
      }
      req.isAuthenticated = true;
      next();
    });
  } else {
    // Guest user - get session ID from headers, body, or query
    const sessionId = req.headers['x-session-id'] || 
                     (req.body && req.body.sessionId) || 
                     (req.query && req.query.sessionId);
    
    if (sessionId) {
      req.sessionId = sessionId;
      req.isAuthenticated = false;
      next();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either authentication session or session ID is required'
      });
    }
  }
};

// GET /api/cart - Get cart items for user or session
router.get('/', extractUserOrSession, async (req, res) => {
  try {
    let query;
    let params;

    if (req.isAuthenticated) {
      // Get cart for authenticated user
      query = `
        SELECT ci.id, ci.product_id, ci.quantity, ci.added_at, ci.updated_at,
               p.name, p.price, p.image_url, p.stock_quantity
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1
        ORDER BY ci.added_at DESC
      `;
      params = [req.user.userId];
    } else {
      // Get cart for guest session
      query = `
        SELECT ci.id, ci.product_id, ci.quantity, ci.added_at, ci.updated_at,
               p.name, p.price, p.image_url, p.stock_quantity
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = $1
        ORDER BY ci.added_at DESC
      `;
      params = [req.sessionId];
    }

    const result = await pool.query(query, params);

    // Calculate total
    const items = result.rows;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      data: {
        items,
        total: parseFloat(total.toFixed(2)),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching cart:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// POST /api/cart/add - Add item to cart
router.post('/add', extractUserOrSession, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID and quantity are required'
      });
    }

    // Check if product exists and has stock
    const productCheck = await pool.query(
      'SELECT id, stock_quantity FROM products WHERE id = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productCheck.rows[0];
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    let query;
    let params;

    if (req.isAuthenticated) {
      // Add/update cart for authenticated user
      query = `
        INSERT INTO cart_items (user_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = CURRENT_TIMESTAMP
        RETURNING id, quantity
      `;
      params = [req.user.userId, productId, quantity];
    } else {
      // Add/update cart for guest session
      query = `
        INSERT INTO cart_items (session_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (session_id, product_id)
        DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = CURRENT_TIMESTAMP
        RETURNING id, quantity
      `;
      params = [req.sessionId, productId, quantity];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        cartItemId: result.rows[0].id,
        newQuantity: result.rows[0].quantity
      },
      message: 'Item added to cart successfully'
    });

  } catch (error) {
    console.error('Error adding item to cart:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// PUT /api/cart/update - Update cart item quantity
router.put('/update', extractUserOrSession, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID and quantity are required'
      });
    }

    // If quantity is 0, remove the item
    if (quantity === 0) {
      return removeCartItem(req, res, productId);
    }

    // Check stock availability
    const productCheck = await pool.query(
      'SELECT stock_quantity FROM products WHERE id = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (productCheck.rows[0].stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    let query;
    let params;

    if (req.isAuthenticated) {
      query = `
        UPDATE cart_items 
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND product_id = $3
        RETURNING id, quantity
      `;
      params = [quantity, req.user.userId, productId];
    } else {
      query = `
        UPDATE cart_items 
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $2 AND product_id = $3
        RETURNING id, quantity
      `;
      params = [quantity, req.sessionId, productId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    res.json({
      success: true,
      data: {
        cartItemId: result.rows[0].id,
        newQuantity: result.rows[0].quantity
      },
      message: 'Cart item updated successfully'
    });

  } catch (error) {
    console.error('Error updating cart item:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// DELETE /api/cart/remove - Remove item from cart
router.delete('/remove/:productId', extractUserOrSession, async (req, res) => {
  const { productId } = req.params;
  return removeCartItem(req, res, productId);
});

// Helper function to remove cart item
async function removeCartItem(req, res, productId) {
  try {
    let query;
    let params;

    if (req.isAuthenticated) {
      query = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING id';
      params = [req.user.userId, productId];
    } else {
      query = 'DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2 RETURNING id';
      params = [req.sessionId, productId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('Error removing cart item:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
}

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', extractUserOrSession, async (req, res) => {
  try {
    let query;
    let params;

    if (req.isAuthenticated) {
      query = 'DELETE FROM cart_items WHERE user_id = $1';
      params = [req.user.userId];
    } else {
      query = 'DELETE FROM cart_items WHERE session_id = $1';
      params = [req.sessionId];
    }

    await pool.query(query, params);

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing cart:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

// POST /api/cart/merge - Merge guest cart with user cart on login
router.post('/merge', authenticateSession(), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required for cart merging'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get guest cart items
      const guestItems = await client.query(
        'SELECT product_id, quantity FROM cart_items WHERE session_id = $1',
        [sessionId]
      );

      // Merge each guest item with user cart
      for (const item of guestItems.rows) {
        await client.query(`
          INSERT INTO cart_items (user_id, product_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, product_id)
          DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = CURRENT_TIMESTAMP
        `, [req.user.userId, item.product_id, item.quantity]);
      }

      // Delete guest cart items
      await client.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Cart merged successfully',
        data: {
          mergedItems: guestItems.rows.length
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error merging cart:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to merge cart'
    });
  }
});

// GET /api/cart/count - Get cart item count
router.get('/count', extractUserOrSession, async (req, res) => {
  try {
    let query;
    let params;

    if (req.isAuthenticated) {
      query = 'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = $1';
      params = [req.user.userId];
    } else {
      query = 'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE session_id = $1';
      params = [req.sessionId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        count: parseInt(result.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Error getting cart count:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart count'
    });
  }
});

module.exports = router;