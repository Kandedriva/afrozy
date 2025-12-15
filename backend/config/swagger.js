const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Afrozy Market API',
      version: '1.0.0',
      description: 'A comprehensive marketplace API with authentication, products, stores, and order management',
      contact: {
        name: 'Afrozy Market Team',
        email: 'support@afrozymarket.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'https://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sessionId',
          description: 'Session-based authentication using cookies'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            full_name: {
              type: 'string',
              description: 'Full name'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            address: {
              type: 'string',
              description: 'Address'
            },
            user_type: {
              type: 'string',
              enum: ['customer', 'admin', 'store_owner'],
              description: 'User type'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'User status'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              description: 'Product description'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Product price'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            image_url: {
              type: 'string',
              format: 'url',
              description: 'Product image URL'
            },
            stock_quantity: {
              type: 'integer',
              description: 'Available stock quantity'
            },
            store_id: {
              type: 'integer',
              description: 'Store ID that sells this product'
            }
          }
        },
        Store: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Store ID'
            },
            owner_id: {
              type: 'integer',
              description: 'Store owner user ID'
            },
            store_name: {
              type: 'string',
              description: 'Store name'
            },
            store_description: {
              type: 'string',
              description: 'Store description'
            },
            store_address: {
              type: 'string',
              description: 'Store address'
            },
            business_type: {
              type: 'string',
              description: 'Type of business'
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'suspended'],
              description: 'Store status'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: {
                    type: 'string'
                  },
                  param: {
                    type: 'string'
                  },
                  location: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer'
            },
            totalPages: {
              type: 'integer'
            },
            totalProducts: {
              type: 'integer'
            },
            limit: {
              type: 'integer'
            },
            hasNextPage: {
              type: 'boolean'
            },
            hasPreviousPage: {
              type: 'boolean'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './index.js'] // Paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};