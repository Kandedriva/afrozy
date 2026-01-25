const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
// Safely require sharp with fallback
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('⚠️ Sharp not available, image processing will be disabled:', error.message);
  sharp = null;
}
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('./logger');

class R2Service {
  constructor() {
    // Construct endpoint - support both R2_ENDPOINT and R2_ACCOUNT_ID formats
    let endpoint;
    if (process.env.R2_ENDPOINT) {
      endpoint = process.env.R2_ENDPOINT;
    } else if (process.env.R2_ACCOUNT_ID) {
      endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    } else {
      console.error('❌ R2 configuration error: Neither R2_ENDPOINT nor R2_ACCOUNT_ID is set');
      endpoint = 'https://placeholder.r2.cloudflarestorage.com';
    }
    
    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: false,
      maxAttempts: 3,
      retryMode: 'adaptive',
      requestTimeout: 120000, // Increased to 2 minutes for large files
      maxSockets: 25,
      keepAlive: true,
      keepAliveMsecs: 1000
    });
    
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL;
    this.endpoint = endpoint;
  }

  /**
   * Validate image file
   */
  validateImageFile(file) {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    return true;
  }

  /**
   * Process and optimize image
   */
  async processImage(buffer, options = {}) {
    // If sharp is not available, return the original buffer
    if (!sharp) {
      console.warn('⚠️ Image processing skipped - sharp not available');
      return buffer;
    }

    const {
      width = 800,
      height = 600,
      quality = 85,
      format = 'webp'
    } = options;

    try {
      const sharpInstance = sharp(buffer);
      
      // Optimize for performance
      const processedImage = await sharpInstance
        .resize(width, height, { 
          fit: 'inside', 
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        })
        .toFormat(format, { 
          quality,
          progressive: true,
          optimizeScans: true,
          mozjpeg: format === 'jpeg'
        })
        .toBuffer({ resolveWithObject: false });

      return processedImage;
    } catch (error) {
      logger.error('Error processing image:', error);
      console.warn('⚠️ Falling back to original image due to processing error');
      return buffer;
    }
  }

  /**
   * Generate unique filename
   */
  generateFileName(originalName, prefix = 'products') {
    const extension = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const uniqueId = uuidv4().split('-')[0];
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    return `${prefix}/${timestamp}_${uniqueId}_${cleanName}`;
  }

  /**
   * Upload image to R2
   */
  async uploadImage(file, options = {}) {
    try {
      // Validate R2 configuration
      if (!this.isConfigured()) {
        throw new Error('R2 service is not properly configured. Please check environment variables.');
      }

      // Validate file
      this.validateImageFile(file);

      // Process image for different sizes
      const originalBuffer = file.buffer;
      const fileName = this.generateFileName(file.originalname, options.prefix || 'products');
      const baseName = fileName.replace(/\.[^/.]+$/, "");

      // Process and upload single optimized image
      const processedBuffer = await this.processImage(originalBuffer, {
        width: options.width || 800,
        height: options.height || 600, 
        quality: options.quality || 85
      });
      
      // Use .webp extension for optimized format
      const finalFileName = `${baseName}.webp`;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: finalFileName,
        Body: processedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000', // 1 year cache
        ContentDisposition: 'inline',
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      };

      // Use Upload with progress tracking for larger files
      if (processedBuffer.length > 1024 * 1024) { // 1MB
        const upload = new Upload({
          client: this.client,
          params: uploadParams,
          partSize: 1024 * 1024 * 5, // 5MB parts
          leavePartsOnError: false
        });

        await upload.done();
      } else {
        // Use simple put for smaller files
        await this.client.send(new PutObjectCommand(uploadParams));
      }
      
      // Generate public URL
      let publicUrl;

      // ALWAYS use the CDN URL if R2_PUBLIC_URL is configured
      // This ensures images are served from the public CDN, not the private R2 storage endpoint
      if (this.publicUrl) {
        // Use the public URL (CDN or R2 public domain)
        publicUrl = this.publicUrl.endsWith('/')
          ? `${this.publicUrl}${finalFileName}`
          : `${this.publicUrl}/${finalFileName}`;

        logger.info(`✅ Using CDN URL: ${publicUrl}`);
        logger.info(`   Public URL: ${this.publicUrl}`);
        logger.info(`   Endpoint: ${this.endpoint}`);
      } else {
        // Fallback to API proxy if no R2_PUBLIC_URL is configured
        logger.warn('⚠️ No R2_PUBLIC_URL configured, falling back to API proxy');
        logger.warn(`   This.publicUrl: ${this.publicUrl}`);
        logger.warn(`   This.endpoint: ${this.endpoint}`);

        let apiBaseUrl;
        if (process.env.NODE_ENV === 'production') {
          apiBaseUrl = process.env.API_BASE_URL ||
                      process.env.CLIENT_URL?.replace(':3000', ':3001') ||
                      'https://api.afrozy.com';
        } else {
          apiBaseUrl = 'http://localhost:3001';
        }

        const pathParts = finalFileName.split('/');
        if (pathParts.length >= 2) {
          const folder = pathParts[0];
          const filename = pathParts.slice(1).join('/');
          publicUrl = `${apiBaseUrl}/api/images/proxy/${folder}/${filename}`;
        } else {
          publicUrl = `${apiBaseUrl}/api/images/proxy/general/${finalFileName}`;
        }
      }
      
      // Structure the response for backwards compatibility
      const imageUrls = {
        url: publicUrl,
        original: publicUrl,
        large: publicUrl, 
        medium: publicUrl,
        thumb: publicUrl,
        keys: [finalFileName]
      };

      logger.info(`Image uploaded successfully: ${fileName}`);
      return imageUrls;

    } catch (error) {
      logger.error('Error uploading image to R2:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files, options = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    const maxFiles = 10;
    if (files.length > maxFiles) {
      throw new Error(`Too many files. Maximum ${maxFiles} files allowed.`);
    }

    const uploadPromises = files.map(file => this.uploadImage(file, options));
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete image from R2
   */
  async deleteImage(keys) {
    if (!keys || keys.length === 0) {
      return;
    }

    try {
      const deletePromises = keys.map(key => {
        const deleteParams = {
          Bucket: this.bucketName,
          Key: key,
        };
        return this.client.send(new DeleteObjectCommand(deleteParams));
      });

      await Promise.all(deletePromises);
      logger.info(`Images deleted successfully: ${keys.join(', ')}`);
    } catch (error) {
      logger.error('Error deleting image from R2:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(key) {
    try {
      const getParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      const response = await this.client.send(new GetObjectCommand(getParams));
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata
      };
    } catch (error) {
      logger.error('Error getting image metadata:', error);
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    const hasEndpoint = process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID;
    const hasCredentials = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;
    const hasBucket = process.env.R2_BUCKET_NAME;
    const hasPublicUrl = process.env.R2_PUBLIC_URL;
    
    const isConfigured = !!(hasEndpoint && hasCredentials && hasBucket && hasPublicUrl);
    
    if (!isConfigured) {
      console.log('❌ R2 Configuration Check:');
      console.log(`  - Endpoint: ${hasEndpoint ? '✅' : '❌'} (R2_ENDPOINT or R2_ACCOUNT_ID)`);
      console.log(`  - Credentials: ${hasCredentials ? '✅' : '❌'} (R2_ACCESS_KEY_ID & R2_SECRET_ACCESS_KEY)`);
      console.log(`  - Bucket: ${hasBucket ? '✅' : '❌'} (R2_BUCKET_NAME)`);
      console.log(`  - Public URL: ${hasPublicUrl ? '✅' : '❌'} (R2_PUBLIC_URL)`);
    }
    
    return isConfigured;
  }

  /**
   * Test R2 connection
   */
  async testConnection() {
    try {
      // Try to list bucket contents (just to test connection)
      const testKey = 'test-connection.txt';
      const testParams = {
        Bucket: this.bucketName,
        Key: testKey,
        Body: 'Connection test',
        ContentType: 'text/plain'
      };

      await this.client.send(new PutObjectCommand(testParams));
      await this.deleteImage([testKey]);
      
      logger.info('R2 connection test successful');
      return true;
    } catch (error) {
      logger.error('R2 connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const r2Service = new R2Service();
module.exports = r2Service;