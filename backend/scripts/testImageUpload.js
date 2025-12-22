#!/usr/bin/env node

require('dotenv').config();
const r2Service = require('../config/r2');

async function testImageUpload() {
  console.log('🔧 Testing image upload URL generation...');
  
  try {
    // Create a mock file object to test URL generation
    const mockFile = {
      buffer: Buffer.from('test image content'),
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg',
      size: 1024
    };
    
    // Test the image upload process (this will actually upload to R2)
    console.log('📤 Testing image upload...');
    const imageUrls = await r2Service.uploadImage(mockFile, { prefix: 'test' });
    
    console.log('✅ Image upload successful!');
    console.log('📋 Generated URLs:');
    console.log('   - Original:', imageUrls.original);
    console.log('   - Large:', imageUrls.large);
    console.log('   - Medium:', imageUrls.medium);
    console.log('   - Thumb:', imageUrls.thumb);
    
    // Clean up the test image
    if (imageUrls.keys && imageUrls.keys.length > 0) {
      console.log('🧹 Cleaning up test images...');
      await r2Service.deleteImage(imageUrls.keys);
      console.log('✅ Test images deleted');
    }
    
    // Verify the URL format
    if (imageUrls.large.includes('/api/images/proxy/')) {
      console.log('✅ URLs are correctly formatted to use API proxy');
    } else {
      console.log('⚠️  URLs are not using API proxy format');
    }
    
    console.log('✅ Image upload test completed successfully');
  } catch (error) {
    console.error('❌ Error testing image upload:', error.message);
  }
}

if (require.main === module) {
  testImageUpload();
}

module.exports = testImageUpload;