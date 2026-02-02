const logger = require('../config/logger');

/**
 * Comprehensive input validation middleware
 */

// Validation schemas for different endpoints
const validationSchemas = {
  email: {
    type: 'string',
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 255,
    message: 'Invalid email format'
  },
  
  password: {
    type: 'string',
    minLength: 6,
    maxLength: 128,
    // Removed complex pattern to match frontend validation (6 chars minimum)
    message: 'Password must be at least 6 characters'
  },
  
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z\s'-]+$/,
    sanitize: true,
    message: 'Name must contain only letters, spaces, hyphens, and apostrophes'
  },
  
  phone: {
    type: 'string',
    pattern: /^\+?[\d\s\-\(\)]+$/,
    minLength: 8,
    maxLength: 20,
    message: 'Invalid phone number format'
  },
  
  price: {
    type: 'number',
    min: 0,
    max: 999999.99,
    message: 'Price must be between 0 and 999,999.99'
  },
  
  quantity: {
    type: 'number',
    min: 0,
    max: 99999,
    integer: true,
    message: 'Quantity must be a positive integer'
  },
  
  text: {
    type: 'string',
    maxLength: 1000,
    sanitize: true,
    message: 'Text too long'
  },
  
  description: {
    type: 'string',
    maxLength: 5000,
    sanitize: true,
    message: 'Description too long'
  }
};

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate a single field against its schema
 */
function validateField(value, schema, fieldName) {
  const errors = [];
  
  // Check required
  if (schema.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return errors;
  }
  
  // Type validation
  if (schema.type === 'string' && typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return errors;
  }
  
  if (schema.type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      errors.push(`${fieldName} must be a number`);
      return errors;
    }
    value = numValue;
  }
  
  // String validations
  if (schema.type === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${fieldName} must be at least ${schema.minLength} characters long`);
    }
    
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${fieldName} must not exceed ${schema.maxLength} characters`);
    }
    
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(schema.message || `${fieldName} format is invalid`);
    }
  }
  
  // Number validations
  if (schema.type === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`${fieldName} must be at least ${schema.min}`);
    }
    
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`${fieldName} must not exceed ${schema.max}`);
    }
    
    if (schema.integer && !Number.isInteger(value)) {
      errors.push(`${fieldName} must be an integer`);
    }
  }
  
  return errors;
}

/**
 * Create validation middleware for specific endpoints
 */
function createValidationMiddleware(validationRules) {
  return (req, res, next) => {
    const errors = [];
    const sanitizedData = {};
    
    try {
      // Validate each field according to rules
      for (const [fieldName, schemaName] of Object.entries(validationRules)) {
        const schema = validationSchemas[schemaName];
        const value = req.body[fieldName];
        
        if (!schema) {
          logger.warn(`Unknown validation schema: ${schemaName}`);
          continue;
        }
        
        const fieldErrors = validateField(value, schema, fieldName);
        errors.push(...fieldErrors);
        
        // Sanitize if no errors and sanitization is enabled
        if (fieldErrors.length === 0 && value !== undefined && value !== null) {
          if (schema.sanitize && typeof value === 'string') {
            sanitizedData[fieldName] = sanitizeString(value);
          } else {
            sanitizedData[fieldName] = value;
          }
        }
      }
      
      // Return validation errors
      if (errors.length > 0) {
        logger.warn('Input validation failed', {
          endpoint: `${req.method} ${req.path}`,
          errors,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      
      // Add sanitized data to request
      req.validatedData = sanitizedData;
      next();
      
    } catch (error) {
      logger.error('Input validation error', error);
      return res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
}

/**
 * Pre-defined validation middlewares for common endpoints
 */
const validateUserRegistration = createValidationMiddleware({
  email: 'email',
  password: 'password',
  full_name: 'name',
  phone: 'phone'
});

const validateUserLogin = createValidationMiddleware({
  email: 'email',
  password: 'password'
});

const validateProduct = createValidationMiddleware({
  name: 'name',
  description: 'description',
  price: 'price',
  stock_quantity: 'quantity'
});

const validateStoreRegistration = createValidationMiddleware({
  email: 'email',
  password: 'password',
  fullName: 'name',  // Frontend sends camelCase
  phone: 'phone',
  storeName: 'name',  // Frontend sends camelCase
  storeDescription: 'description',  // Frontend sends camelCase
  storeAddress: 'text'  // Frontend sends camelCase
});

/**
 * General purpose sanitization middleware
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeString(value);
      }
    }
  }
  next();
}

/**
 * File upload validation middleware
 */
function validateFileUpload(options = {}) {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = [] } = options;
  
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`
      });
    }
    
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }
    
    next();
  };
}

module.exports = {
  createValidationMiddleware,
  validateUserRegistration,
  validateUserLogin,
  validateProduct,
  validateStoreRegistration,
  sanitizeInput,
  validateFileUpload,
  validationSchemas
};