#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Validates required environment variables for production deployment
 */

const requiredEnvVars = {
  // Database
  PGHOST: 'PostgreSQL host',
  PGDATABASE: 'PostgreSQL database name',
  PGUSER: 'PostgreSQL user',
  PGPASSWORD: 'PostgreSQL password',
  
  // Security
  SESSION_SECRET: 'Session secret key (minimum 32 characters)',
  
  // Application
  NODE_ENV: 'Node environment (should be "production")',
  PORT: 'Application port',
  
  // URLs
  CLIENT_URL: 'Frontend URL',
  API_URL: 'API URL'
};

const recommendedEnvVars = {
  // Redis
  REDIS_URL: 'Redis connection URL',
  REDIS_PASSWORD: 'Redis password',
  
  // Email
  SMTP_HOST: 'SMTP server host',
  SMTP_USER: 'SMTP username',
  SMTP_PASS: 'SMTP password',
  
  // Monitoring
  SENTRY_DSN: 'Sentry error tracking DSN',
  LOG_LEVEL: 'Logging level',
  
  // External services
  STRIPE_SECRET_KEY: 'Stripe payment secret key',
  CLOUDINARY_CLOUD_NAME: 'Cloudinary cloud name'
};

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  console.log('📋 Required Variables:');
  for (const [envVar, description] of Object.entries(requiredEnvVars)) {
    const value = process.env[envVar];
    
    if (!value) {
      console.log(`❌ ${envVar}: Missing - ${description}`);
      hasErrors = true;
    } else if (envVar === 'SESSION_SECRET' && value.length < 32) {
      console.log(`⚠️  ${envVar}: Too short (${value.length} chars) - Should be at least 32 characters`);
      hasErrors = true;
    } else if (envVar === 'NODE_ENV' && value !== 'production') {
      console.log(`⚠️  ${envVar}: ${value} - Should be "production" for production deployment`);
      hasWarnings = true;
    } else {
      const maskedValue = envVar.includes('PASSWORD') || envVar.includes('SECRET') || envVar.includes('KEY') 
        ? '*'.repeat(value.length) 
        : value;
      console.log(`✅ ${envVar}: ${maskedValue}`);
    }
  }

  console.log('\n📋 Recommended Variables:');
  for (const [envVar, description] of Object.entries(recommendedEnvVars)) {
    const value = process.env[envVar];
    
    if (!value) {
      console.log(`⚠️  ${envVar}: Missing - ${description}`);
      hasWarnings = true;
    } else {
      const maskedValue = envVar.includes('PASSWORD') || envVar.includes('SECRET') || envVar.includes('KEY') 
        ? '*'.repeat(value.length) 
        : value;
      console.log(`✅ ${envVar}: ${maskedValue}`);
    }
  }

  // Additional security checks
  console.log('\n🔒 Security Checks:');
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.PGSSLMODE !== 'require') {
      console.log('⚠️  PGSSLMODE: Should be "require" for production');
      hasWarnings = true;
    } else {
      console.log('✅ PGSSLMODE: require');
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  if (hasErrors) {
    console.log('❌ Critical issues found. Please fix before deployment.');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Warnings found. Review before deployment.');
    process.exit(0);
  } else {
    console.log('✅ All checks passed! Ready for deployment.');
    process.exit(0);
  }
}

// Load environment from .env.production if it exists
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.production');

try {
  require('dotenv').config({ path: envPath });
  console.log(`📁 Loaded environment from ${envPath}`);
} catch (error) {
  console.log('📁 No .env.production file found, using system environment variables');
}

validateEnvironment();