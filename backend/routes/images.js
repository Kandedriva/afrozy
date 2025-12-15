const express = require('express');
const router = express.Router();
const r2Service = require('../config/r2');
const { uploadSingle, uploadMultiple, requireFile } = require('../middleware/upload');
const { authenticateSession } = require('../utils/auth');
const logger = require('../config/logger');


// Middleware to check R2 configuration
const checkR2Config = (req, res, next) => {
  if (!r2Service.isConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Image upload service is not configured. Please contact administrator.'
    });
  }
  next();
};


// Test R2 connection endpoint
router.get('/test-connection', authenticateSession(), async (req, res) => {
  try {
    const isConnected = await r2Service.testConnection();
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'R2 connection successful' : 'R2 connection failed'
    });
  } catch (error) {
    logger.error('R2 connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test R2 connection'
    });
  }
});

// Upload single image
router.post('/upload', 
  authenticateSession(),
  checkR2Config,
  uploadSingle('image'),
  requireFile,
  async (req, res) => {
    try {
      const file = req.file;
      const options = {
        width: parseInt(req.body.width) || 800,
        height: parseInt(req.body.height) || 600,
        quality: parseInt(req.body.quality) || 85
      };

      const imageUrls = await r2Service.uploadImage(file, options);

      logger.info(`Image uploaded by user ${req.user.userId}: ${file.originalname}`);

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          urls: imageUrls,
          originalName: file.originalname,
          size: file.size,
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Image upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload image'
      });
    }
  }
);

// Upload multiple images
router.post('/upload-multiple',
  authenticateSession(),
  checkR2Config,
  uploadMultiple('images', 5), // Max 5 images for products
  requireFile,
  async (req, res) => {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const options = {
        width: parseInt(req.body.width) || 800,
        height: parseInt(req.body.height) || 600,
        quality: parseInt(req.body.quality) || 85
      };

      const uploadResults = await r2Service.uploadMultipleImages(files, options);

      logger.info(`${files.length} images uploaded by user ${req.user.userId}`);

      res.json({
        success: true,
        message: `${files.length} images uploaded successfully`,
        data: {
          images: uploadResults.map((urls, index) => ({
            urls,
            originalName: files[index].originalname,
            size: files[index].size
          })),
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Multiple image upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload images'
      });
    }
  }
);

// Delete image
router.delete('/delete',
  authenticateSession(),
  checkR2Config,
  async (req, res) => {
    try {
      const { keys } = req.body;

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Image keys are required'
        });
      }

      await r2Service.deleteImage(keys);

      logger.info(`Images deleted by user ${req.user.userId}: ${keys.join(', ')}`);

      res.json({
        success: true,
        message: 'Images deleted successfully'
      });

    } catch (error) {
      logger.error('Image deletion error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete images'
      });
    }
  }
);

// Get image metadata
router.get('/metadata/:key',
  authenticateSession(),
  checkR2Config,
  async (req, res) => {
    try {
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Image key is required'
        });
      }

      const metadata = await r2Service.getImageMetadata(key);

      res.json({
        success: true,
        data: metadata
      });

    } catch (error) {
      logger.error('Get metadata error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get image metadata'
      });
    }
  }
);

// Upload product image (specific for products)
router.post('/product',
  authenticateSession(),
  checkR2Config,
  uploadSingle('image'),
  requireFile,
  async (req, res) => {
    try {
      const file = req.file;
      const productId = req.body.productId;

      // Specific options for product images
      const options = {
        width: 800,
        height: 600,
        quality: 90
      };

      const imageUrls = await r2Service.uploadImage(file, options);

      logger.info(`Product image uploaded by user ${req.user ? req.user.userId : 'unknown'}: ${file.originalname}`);

      res.json({
        success: true,
        message: 'Product image uploaded successfully',
        data: {
          imageUrl: imageUrls.large, // Return large size for product display
          thumbnailUrl: imageUrls.thumb,
          allUrls: imageUrls,
          originalName: file.originalname
        }
      });

    } catch (error) {
      logger.error('Product image upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload product image'
      });
    }
  }
);

// Upload store logo
router.post('/store-logo',
  authenticateSession(),
  checkR2Config,
  uploadSingle('logo'),
  requireFile,
  async (req, res) => {
    try {
      const file = req.file;
      const storeId = req.body.storeId;

      // Specific options for store logos (square format)
      const options = {
        width: 300,
        height: 300,
        quality: 95
      };

      const imageUrls = await r2Service.uploadImage(file, {
        ...options,
        prefix: storeId ? `stores/${storeId}/logo` : 'stores/logos'
      });

      logger.info(`Store logo uploaded by user ${req.user.userId}: ${file.originalname}`);

      res.json({
        success: true,
        message: 'Store logo uploaded successfully',
        data: {
          logoUrl: imageUrls.medium,
          thumbnailUrl: imageUrls.thumb,
          allUrls: imageUrls,
          originalName: file.originalname
        }
      });

    } catch (error) {
      logger.error('Store logo upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload store logo'
      });
    }
  }
);

module.exports = router;