const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const router = express.Router();

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Middleware to authenticate driver session
function authenticateDriver(req, res, next) {
  if (!req.session || !req.session.userId || !req.session.userType) {
    return res.status(401).json({
      success: false,
      message: 'Driver authentication required. Please log in.'
    });
  }

  // Check if user is a driver
  if (req.session.userType !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Driver access required'
    });
  }

  req.driver = {
    driverId: req.session.userId,
    email: req.session.email,
    userType: req.session.userType,
    driverCode: req.session.driverCode
  };
  next();
}

// POST /api/drivers/register - Driver registration
router.post('/register', async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      phone, 
      password, 
      licenseNumber, 
      vehicleType, 
      vehiclePlate 
    } = req.body;

    // Validation
    if (!fullName || !email || !phone || !password || !licenseNumber || !vehicleType || !vehiclePlate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if driver already exists
    const existingDriver = await pool.query(
      'SELECT id FROM drivers WHERE email = $1',
      [email]
    );

    if (existingDriver.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Driver with this email already exists'
      });
    }

    // Generate driver ID
    const driverIdResult = await pool.query(
      'SELECT COUNT(*) as count FROM drivers'
    );
    const driverCount = parseInt(driverIdResult.rows[0].count);
    const driverId = `DRV${String(driverCount + 1).padStart(3, '0')}`;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new driver
    const insertDriverQuery = `
      INSERT INTO drivers (driver_id, full_name, email, phone, password_hash, license_number, vehicle_type, vehicle_plate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, driver_id, full_name, email, phone, license_number, vehicle_type, vehicle_plate, status, is_verified, created_at
    `;

    const result = await pool.query(insertDriverQuery, [
      driverId,
      fullName,
      email,
      phone,
      passwordHash,
      licenseNumber,
      vehicleType,
      vehiclePlate
    ]);

    const driver = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Driver registration successful. Awaiting verification.',
      data: {
        driver: {
          id: driver.id,
          driverId: driver.driver_id,
          fullName: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          licenseNumber: driver.license_number,
          vehicleType: driver.vehicle_type,
          vehiclePlate: driver.vehicle_plate,
          status: driver.status,
          isVerified: driver.is_verified,
          createdAt: driver.created_at
        }
      }
    });

  } catch (error) {
    console.error('Driver registration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// POST /api/drivers/login - Driver login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Find driver by email
    const driverQuery = `
      SELECT id, driver_id, full_name, email, phone, password_hash, license_number, 
             vehicle_type, vehicle_plate, status, is_verified, rating, total_deliveries, created_at
      FROM drivers 
      WHERE email = $1
    `;
    
    const result = await pool.query(driverQuery, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const driver = result.rows[0];

    // Check if driver is verified
    if (!driver.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending verification. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, driver.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update status to online and last login
    await pool.query(
      'UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['online', driver.id]
    );

    // Create session
    req.session.userId = driver.id;
    req.session.userType = 'driver';
    req.session.email = driver.email;
    req.session.driverCode = driver.driver_id;

    // Remove sensitive data before sending response
    delete driver.password_hash;

    res.json({
      success: true,
      message: 'Driver login successful',
      data: {
        driver: {
          id: driver.id,
          driverId: driver.driver_id,
          fullName: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          licenseNumber: driver.license_number,
          vehicleType: driver.vehicle_type,
          vehiclePlate: driver.vehicle_plate,
          status: 'online',
          isVerified: driver.is_verified,
          rating: parseFloat(driver.rating),
          totalDeliveries: driver.total_deliveries,
          createdAt: driver.created_at
        },
        token: 'session-based' // Placeholder for frontend compatibility
      }
    });

  } catch (error) {
    console.error('Driver login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// POST /api/drivers/logout - Driver logout
router.post('/logout', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    // Update status to offline
    await pool.query(
      'UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['offline', driverId]
    );

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error during logout'
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Driver logout successful'
      });
    });

  } catch (error) {
    console.error('Driver logout error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

// PUT /api/drivers/status - Update driver status
router.put('/status', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const { status } = req.body;

    const validStatuses = ['online', 'offline', 'busy'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: online, offline, busy'
      });
    }

    await pool.query(
      'UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, driverId]
    );

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: { status }
    });

  } catch (error) {
    console.error('Status update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});

// PUT /api/drivers/location - Update driver location
router.put('/location', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    await pool.query(
      'UPDATE drivers SET current_location_lat = $1, current_location_lng = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [latitude, longitude, driverId]
    );

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Location update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// GET /api/drivers/profile - Get driver profile
router.get('/profile', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    const driverQuery = `
      SELECT id, driver_id, full_name, email, phone, license_number, 
             vehicle_type, vehicle_plate, status, is_verified, rating, 
             total_deliveries, current_location_lat, current_location_lng, created_at
      FROM drivers 
      WHERE id = $1
    `;
    
    const result = await pool.query(driverQuery, [driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driver = result.rows[0];

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          driverId: driver.driver_id,
          fullName: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          licenseNumber: driver.license_number,
          vehicleType: driver.vehicle_type,
          vehiclePlate: driver.vehicle_plate,
          status: driver.status,
          isVerified: driver.is_verified,
          rating: parseFloat(driver.rating),
          totalDeliveries: driver.total_deliveries,
          currentLocation: driver.current_location_lat && driver.current_location_lng ? {
            latitude: parseFloat(driver.current_location_lat),
            longitude: parseFloat(driver.current_location_lng)
          } : null,
          createdAt: driver.created_at
        }
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/drivers/orders - Get orders assigned to driver
router.get('/orders', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const { status, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT o.id, o.order_number, o.status, o.total, o.shipping_address, 
             o.assigned_at, o.picked_up_at, o.delivered_at, o.estimated_delivery,
             u.full_name as customer_name, u.phone as customer_phone,
             COUNT(oi.id) as item_count
      FROM orders o
      JOIN customers u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.driver_id = $1
    `;
    const queryParams = [driverId];

    // Add status filter
    if (status && status !== 'all') {
      query += ` AND o.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    query += ` GROUP BY o.id, u.full_name, u.phone ORDER BY o.assigned_at DESC`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsQuery = `
          SELECT oi.id, oi.quantity, oi.price, p.name as product_name
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [order.id]);

        return {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          total: parseFloat(order.total),
          shippingAddress: order.shipping_address,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          assignedAt: order.assigned_at,
          pickedUpAt: order.picked_up_at,
          deliveredAt: order.delivered_at,
          estimatedDelivery: order.estimated_delivery,
          items: itemsResult.rows.map(item => ({
            id: item.id,
            productName: item.product_name,
            quantity: item.quantity,
            price: parseFloat(item.price)
          }))
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithItems
      }
    });

  } catch (error) {
    console.error('Error fetching driver orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// PUT /api/drivers/orders/:id/status - Update order status
router.put('/orders/:id/status', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: picked_up, in_transit, delivered'
      });
    }

    // Check if order is assigned to this driver
    const orderCheck = await pool.query(
      'SELECT id, status FROM orders WHERE id = $1 AND driver_id = $2',
      [orderId, driverId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you'
      });
    }

    const currentStatus = orderCheck.rows[0].status;

    // Validate status transition
    const validTransitions = {
      'assigned': ['picked_up'],
      'picked_up': ['in_transit'],
      'in_transit': ['delivered']
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${currentStatus} to ${status}`
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update order status and timestamp
      const updateQuery = `
        UPDATE orders 
        SET status = $1, ${status}_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await client.query(updateQuery, [status, orderId]);

      // Create delivery tracking entry
      await client.query(
        `INSERT INTO delivery_tracking (order_id, driver_id, status, timestamp)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [orderId, driverId, status]
      );

      // If delivered, update driver stats and set status back to online
      if (status === 'delivered') {
        await client.query(
          `UPDATE drivers 
           SET total_deliveries = total_deliveries + 1, status = 'online'
           WHERE id = $1`,
          [driverId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: { status }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// GET /api/drivers/stats - Get driver statistics
router.get('/stats', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const { range = 'week' } = req.query;

    let dateFilter = '';
    switch (range) {
      case 'today':
        dateFilter = "AND delivered_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND delivered_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND delivered_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        dateFilter = '';
    }

    // Get delivery counts
    const deliveryStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE delivered_at >= CURRENT_DATE) as completed_today,
        COUNT(*) FILTER (WHERE delivered_at >= CURRENT_DATE - INTERVAL '7 days') as completed_this_week,
        COUNT(*) FILTER (WHERE delivered_at >= CURRENT_DATE - INTERVAL '30 days') as completed_this_month,
        COUNT(*) as total_deliveries
      FROM orders 
      WHERE driver_id = $1 AND status = 'delivered'
    `, [driverId]);

    // Get earnings (mock calculation - 10% of order total)
    const earningsStats = await pool.query(`
      SELECT 
        COALESCE(SUM(total * 0.1) FILTER (WHERE delivered_at >= CURRENT_DATE), 0) as earnings_today,
        COALESCE(SUM(total * 0.1) FILTER (WHERE delivered_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as earnings_this_week,
        COALESCE(SUM(total * 0.1) FILTER (WHERE delivered_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as earnings_this_month,
        COALESCE(SUM(total * 0.1), 0) as total_earnings
      FROM orders 
      WHERE driver_id = $1 AND status = 'delivered'
    `, [driverId]);

    // Get status breakdown
    const statusBreakdown = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders 
      WHERE driver_id = $1 AND status IN ('assigned', 'picked_up', 'in_transit', 'delivered')
      GROUP BY status
    `, [driverId]);

    // Get recent deliveries
    const recentDeliveries = await pool.query(`
      SELECT o.id, o.order_number, o.total, o.delivered_at, u.full_name as customer_name
      FROM orders o
      JOIN customers u ON o.user_id = u.id
      WHERE o.driver_id = $1 AND o.status = 'delivered'
      ORDER BY o.delivered_at DESC
      LIMIT 10
    `, [driverId]);

    // Get driver rating
    const driverInfo = await pool.query(
      'SELECT rating FROM drivers WHERE id = $1',
      [driverId]
    );

    const stats = deliveryStats.rows[0];
    const earnings = earningsStats.rows[0];
    const breakdown = {};
    
    // Initialize breakdown with zeros
    ['assigned', 'picked_up', 'in_transit', 'delivered'].forEach(status => {
      breakdown[status] = 0;
    });
    
    // Fill in actual counts
    statusBreakdown.rows.forEach(row => {
      breakdown[row.status] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        totalDeliveries: parseInt(stats.total_deliveries),
        completedToday: parseInt(stats.completed_today),
        completedThisWeek: parseInt(stats.completed_this_week),
        completedThisMonth: parseInt(stats.completed_this_month),
        averageRating: parseFloat(driverInfo.rows[0]?.rating || 5.0),
        totalEarnings: parseFloat(earnings.total_earnings),
        earningsToday: parseFloat(earnings.earnings_today),
        earningsThisWeek: parseFloat(earnings.earnings_this_week),
        earningsThisMonth: parseFloat(earnings.earnings_this_month),
        deliveryStatusBreakdown: breakdown,
        recentDeliveries: recentDeliveries.rows.map(delivery => ({
          id: delivery.id,
          orderNumber: delivery.order_number,
          customerName: delivery.customer_name,
          total: parseFloat(delivery.total),
          deliveredAt: delivery.delivered_at,
          rating: 5 // Mock rating
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching driver stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// PUT /api/drivers/profile - Update driver profile
router.put('/profile', authenticateDriver, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const { fullName, email, phone, vehicleType, vehiclePlate } = req.body;

    // Validation
    if (!fullName || !email || !phone || !vehicleType || !vehiclePlate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if email is already taken by another driver
    const existingDriver = await pool.query(
      'SELECT id FROM drivers WHERE email = $1 AND id != $2',
      [email, driverId]
    );

    if (existingDriver.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already taken by another driver'
      });
    }

    // Update driver profile
    const updateQuery = `
      UPDATE drivers 
      SET full_name = $1, email = $2, phone = $3, vehicle_type = $4, vehicle_plate = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING full_name, email, phone, vehicle_type, vehicle_plate
    `;

    const result = await pool.query(updateQuery, [
      fullName, email, phone, vehicleType, vehiclePlate, driverId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating driver profile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Export the authenticateDriver middleware for use in other routes
router.authenticateDriver = authenticateDriver;

module.exports = router;