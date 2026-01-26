const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// GET all products with store information
router.get('/', async (req, res) => {
  try {
    console.log('Attempting to fetch products...');
    const result = await pool.query(`
      SELECT
        p.*,
        s.store_name,
        s.store_description,
        s.store_address
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      ORDER BY p.created_at DESC
    `);
    console.log(`Found ${result.rows.length} products`);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// GET product by ID with store information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        p.*,
        s.store_name,
        s.store_description,
        s.store_address
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// GET products by category with store information
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await pool.query(`
      SELECT
        p.*,
        s.store_name,
        s.store_description,
        s.store_address
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.category = $1
      ORDER BY p.created_at DESC
    `, [category]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching products by category:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products by category'
    });
  }
});

module.exports = router;