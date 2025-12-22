#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function testDashboardStats() {
  console.log('🔧 Testing dashboard stats queries directly...');
  
  try {
    console.log('1. Testing product count...');
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log('✅ Product count:', productCount.rows[0].count);

    console.log('2. Testing order statistics...');
    const orderStats = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'completed' OR status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
    `);
    console.log('✅ Order stats:', orderStats.rows[0]);

    console.log('3. Testing user statistics...');
    const userStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM store_owners) as total_store_owners,
        (SELECT COUNT(*) FROM admins) as total_admins
    `);
    console.log('✅ User stats:', userStats.rows[0]);

    console.log('4. Testing recent orders...');
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
    console.log('✅ Recent orders count:', recentOrders.rows.length);

    console.log('5. Testing FIXED top products...');
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
          jsonb_array_elements(items) as item
          WHERE items IS NOT NULL 
            AND jsonb_typeof(items) = 'array'
            AND jsonb_array_length(items) > 0
        ) product_orders
        GROUP BY product_id
      ) order_stats ON p.id = order_stats.product_id
      ORDER BY order_stats.order_count DESC NULLS LAST, p.created_at DESC
      LIMIT 10
    `);
    console.log('✅ Top products count:', topProducts.rows.length);

    console.log('6. Testing low stock products...');
    const lowStockProducts = await pool.query(`
      SELECT id, name, stock_quantity, category, price
      FROM products 
      WHERE stock_quantity < 10 
      ORDER BY stock_quantity ASC
      LIMIT 10
    `);
    console.log('✅ Low stock products count:', lowStockProducts.rows.length);

    console.log('7. Testing category statistics...');
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
    console.log('✅ Top categories count:', topCategories.rows.length);

    console.log('✅ All dashboard stats queries completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in dashboard stats test:', error.message);
    console.error('Full error:', error);
    logger.error('Dashboard stats test error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testDashboardStats();
}

module.exports = testDashboardStats;