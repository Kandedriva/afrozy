const { pool } = require('../config/database');
const logger = require('../config/logger');

async function addPasswordResetFields() {
  try {
    logger.info('Adding password reset fields to user tables...');

    const tables = ['customers', 'store_owners', 'admins'];

    for (const table of tables) {
      // Add reset_token column
      try {
        await pool.query(`
          ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)
        `);
        logger.info(`✅ Added reset_token column to ${table}`);
      } catch (error) {
        logger.warn(`⚠️  Column reset_token may already exist in ${table}`);
      }

      // Add reset_token_expires column
      try {
        await pool.query(`
          ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
        `);
        logger.info(`✅ Added reset_token_expires column to ${table}`);
      } catch (error) {
        logger.warn(`⚠️  Column reset_token_expires may already exist in ${table}`);
      }

      // Create index on reset_token for faster lookups
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_reset_token
          ON ${table}(reset_token)
        `);
        logger.info(`✅ Created index on reset_token for ${table}`);
      } catch (error) {
        logger.warn(`⚠️  Index may already exist for ${table}`);
      }
    }

    logger.info('✅ Password reset fields added successfully');
  } catch (error) {
    logger.error('Error adding password reset fields:', error);
    throw error;
  }
}

module.exports = addPasswordResetFields;

// Run if called directly
if (require.main === module) {
  addPasswordResetFields()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}
