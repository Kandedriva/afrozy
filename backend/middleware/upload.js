const multer = require('multer');
const logger = require('../config/logger');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Middleware for single image upload
const uploadSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error:', err);
        
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'File size too large. Maximum size is 5MB.'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              message: 'Too many files uploaded.'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: `Unexpected field name. Expected '${fieldName}'.`
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'File upload error: ' + err.message
            });
        }
      } else if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      next();
    });
  };
};

// Middleware for multiple image upload
const uploadMultiple = (fieldName = 'images', maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error:', err);
        
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'File size too large. Maximum size is 5MB per file.'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              message: `Too many files uploaded. Maximum ${maxCount} files allowed.`
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: `Unexpected field name. Expected '${fieldName}'.`
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'File upload error: ' + err.message
            });
        }
      } else if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      next();
    });
  };
};

// Middleware to check if file was uploaded
const requireFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select an image file.'
    });
  }
  next();
};

// Middleware to validate file presence for optional uploads
const validateOptionalFile = (req, res, next) => {
  // If no file uploaded, continue without validation
  if (!req.file && !req.files) {
    return next();
  }
  
  // If file exists, validate it
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  requireFile,
  validateOptionalFile
};