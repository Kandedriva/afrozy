const express = require('express');
const { pool } = require('../config/database');
const { authenticateAdmin } = require('./auth');
const router = express.Router();

// GET all products for admin
router.get('/products', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, price, category, image_url, stock_quantity, 
             created_at, updated_at 
      FROM products 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching products for admin:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// POST create new product
router.post('/products', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock_quantity } = req.body;
    
    // Validate required fields
    if (!name || !description || !price || !category || !image_url || stock_quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO products (name, description, price, category, image_url, stock_quantity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, price, category, image_url, stock_quantity]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
});

// PUT update product
router.put('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image_url, stock_quantity } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !image_url || stock_quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await pool.query(`
      UPDATE products 
      SET name = $1, description = $2, price = $3, category = $4, 
          image_url = $5, stock_quantity = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, price, category, image_url, stock_quantity, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// DELETE product
router.delete('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// GET dashboard statistics
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    // Get product count
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    
    // Get order statistics
    const orderStats = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'completed' OR status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
    `);

    // Get user statistics
    const userStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM store_owners) as total_store_owners,
        (SELECT COUNT(*) FROM admins) as total_admins
    `);

    // Get recent orders (last 10)
    const recentOrders = await pool.query(`
      SELECT 
        o.id,
        o.delivery_name as customer_name,
        o.delivery_email as customer_email,
        o.total_amount,
        o.status,
        o.created_at,
        COALESCE(c.username, 'Guest') as customer_username
      FROM orders o
      LEFT JOIN customers c ON o.user_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Get top products by order frequency
    const topProducts = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.image_url,
        p.category,
        COALESCE(order_stats.order_count, 0) as sales_count
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id,
          COUNT(*) as order_count
        FROM (
          SELECT 
            CAST(item->>'product_id' AS INTEGER) as product_id
          FROM orders,
          jsonb_array_elements(items::jsonb) as item
          WHERE items IS NOT NULL AND items != ''
        ) product_orders
        GROUP BY product_id
      ) order_stats ON p.id = order_stats.product_id
      ORDER BY order_stats.order_count DESC NULLS LAST, p.created_at DESC
      LIMIT 10
    `);

    // Get low stock products
    const lowStockProducts = await pool.query(`
      SELECT id, name, stock_quantity, category, price
      FROM products 
      WHERE stock_quantity < 10 
      ORDER BY stock_quantity ASC
      LIMIT 10
    `);

    // Get category statistics
    const topCategories = await pool.query(`
      SELECT 
        category, 
        COUNT(*) as product_count,
        AVG(price) as avg_price,
        SUM(stock_quantity) as total_stock
      FROM products 
      GROUP BY category 
      ORDER BY product_count DESC
      LIMIT 10
    `);

    const orderData = orderStats.rows[0];
    const userData = userStats.rows[0];
    
    const stats = {
      totalProducts: parseInt(productCount.rows[0].count),
      totalOrders: parseInt(orderData.total_orders) || 0,
      pendingOrders: parseInt(orderData.pending_orders) || 0,
      completedOrders: parseInt(orderData.completed_orders) || 0,
      cancelledOrders: parseInt(orderData.cancelled_orders) || 0,
      totalRevenue: parseFloat(orderData.total_revenue) || 0,
      totalCustomers: parseInt(userData.total_customers) || 0,
      totalStoreOwners: parseInt(userData.total_store_owners) || 0,
      totalAdmins: parseInt(userData.total_admins) || 0,
      totalUsers: (parseInt(userData.total_customers) || 0) + (parseInt(userData.total_store_owners) || 0) + (parseInt(userData.total_admins) || 0),
      recentOrders: recentOrders.rows.map(order => ({
        id: order.id,
        customer: order.customer_name || order.customer_username,
        email: order.customer_email,
        total: parseFloat(order.total_amount),
        status: order.status,
        date: order.created_at.toISOString().split('T')[0]
      })),
      topProducts: topProducts.rows.map(product => ({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        image_url: product.image_url,
        category: product.category,
        sales: parseInt(product.sales_count) || 0
      })),
      lowStockProducts: lowStockProducts.rows,
      topCategories: topCategories.rows.map(cat => ({
        category: cat.category,
        product_count: parseInt(cat.product_count),
        avg_price: parseFloat(cat.avg_price) || 0,
        total_stock: parseInt(cat.total_stock) || 0
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// GET low stock alerts
router.get('/alerts/low-stock', authenticateAdmin, async (req, res) => {
  try {
    const threshold = req.query.threshold || 10;
    
    const result = await pool.query(`
      SELECT id, name, stock_quantity, category
      FROM products 
      WHERE stock_quantity < $1
      ORDER BY stock_quantity ASC
    `, [threshold]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts'
    });
  }
});

// POST bulk update stock
router.post('/products/bulk-update-stock', authenticateAdmin, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, stock_quantity }
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const update of updates) {
        await client.query(`
          UPDATE products 
          SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [update.stock_quantity, update.id]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: `Successfully updated ${updates.length} products`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error bulk updating stock:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update product stock'
    });
  }
});

// GET category analytics
router.get('/analytics/categories', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        COUNT(*) as product_count,
        AVG(price) as avg_price,
        SUM(stock_quantity) as total_stock,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products 
      GROUP BY category 
      ORDER BY product_count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching category analytics:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category analytics'
    });
  }
});

// === STORE MANAGEMENT ENDPOINTS ===

// GET all stores for admin
router.get('/stores', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        u.full_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone
      FROM stores s
      JOIN store_owners u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `);
    
    // Parse the categories JSON field
    const stores = result.rows.map(store => ({
      ...store,
      categories: typeof store.categories === 'string' ? JSON.parse(store.categories) : store.categories
    }));

    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('Error fetching stores for admin:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stores'
    });
  }
});

// PUT update store status
router.put('/stores/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or suspended'
      });
    }

    const result = await pool.query(`
      UPDATE stores 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Store status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating store status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update store status'
    });
  }
});

// GET store details by ID
router.get('/stores/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.*,
        u.full_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        u.address as owner_address
      FROM stores s
      JOIN store_owners u ON s.owner_id = u.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Parse the categories JSON field
    const store = {
      ...result.rows[0],
      categories: typeof result.rows[0].categories === 'string' 
        ? JSON.parse(result.rows[0].categories) 
        : result.rows[0].categories
    };

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Error fetching store details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store details'
    });
  }
});

// GET store statistics for admin dashboard
router.get('/stores/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_stores,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_stores,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_stores,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_stores
      FROM stores
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching store statistics:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store statistics'
    });
  }
});

module.exports = router;