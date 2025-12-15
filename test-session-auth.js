#!/usr/bin/env node
// Quick test script to verify session-based authentication works

const axios = require('axios');

async function testStoreOwnerAuth() {
  try {
    console.log('🔍 Testing session-based authentication...');
    
    // Create axios instance with cookies enabled
    const api = axios.create({
      baseURL: 'http://localhost:3001/api',
      withCredentials: true
    });

    console.log('📝 Testing store owner login...');
    
    // Test login (you'll need to use actual credentials or create test user)
    const loginResponse = await api.post('/store/login', {
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Store owner login successful');
      console.log('🍪 Session created, testing authenticated endpoint...');
      
      // Test authenticated endpoint
      const productsResponse = await api.get('/store/products');
      
      if (productsResponse.data.success) {
        console.log('✅ Authenticated request successful');
        console.log('🎉 Session-based authentication is working!');
      } else {
        console.log('❌ Authenticated request failed');
      }
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ Test failed: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
    } else {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testStoreOwnerAuth();
}

module.exports = { testStoreOwnerAuth };