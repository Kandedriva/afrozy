/**
 * Migration Script: Add Email Verification Fields
 *
 * Adds the following columns to users, store_owners, admins, and drivers tables:
 * - email_verified (BOOLEAN) - Whether email has been verified
 * - verification_code (VARCHAR(6)) - 6-digit verification code
 * - verification_code_expires (TIMESTAMP) - Code expiration time
 */

const { pool } = require('../config/database');

async function addEmailVerificationFields() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting email verification migration...\n');

    await client.query('BEGIN');

    // Tables to update
    const tables = ['users', 'customers', 'store_owners', 'admins', 'drivers'];

    for (const table of tables) {
      console.log(`📝 Updating table: ${table}`);

      // Check if columns already exist
      const checkQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        AND column_name IN ('email_verified', 'verification_code', 'verification_code_expires')
      `;
      const existingColumns = await client.query(checkQuery, [table]);
      const existingColumnNames = existingColumns.rows.map(row => row.column_name);

      // Add email_verified column if it doesn't exist
      if (!existingColumnNames.includes('email_verified')) {
        await client.query(`
          ALTER TABLE ${table}
          ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL
        `);
        console.log(`  ✅ Added email_verified column to ${table}`);
      } else {
        console.log(`  ⏭️  email_verified column already exists in ${table}`);
      }

      // Add verification_code column if it doesn't exist
      if (!existingColumnNames.includes('verification_code')) {
        await client.query(`
          ALTER TABLE ${table}
          ADD COLUMN verification_code VARCHAR(6)
        `);
        console.log(`  ✅ Added verification_code column to ${table}`);
      } else {
        console.log(`  ⏭️  verification_code column already exists in ${table}`);
      }

      // Add verification_code_expires column if it doesn't exist
      if (!existingColumnNames.includes('verification_code_expires')) {
        await client.query(`
          ALTER TABLE ${table}
          ADD COLUMN verification_code_expires TIMESTAMP
        `);
        console.log(`  ✅ Added verification_code_expires column to ${table}`);
      } else {
        console.log(`  ⏭️  verification_code_expires column already exists in ${table}`);
      }

      // For existing users, set email_verified to true (grandfather them in)
      const updateResult = await client.query(`
        UPDATE ${table}
        SET email_verified = true
        WHERE email_verified = false
        AND verification_code IS NULL
      `);

      if (updateResult.rowCount > 0) {
        console.log(`  ✅ Verified ${updateResult.rowCount} existing user(s) in ${table}`);
      }

      console.log('');
    }

    // Create index for faster verification code lookups
    console.log('📝 Creating indexes for verification lookups...');

    for (const table of tables) {
      const indexName = `idx_${table}_verification`;

      // Check if index already exists
      const indexCheck = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = $1 AND indexname = $2
      `, [table, indexName]);

      if (indexCheck.rows.length === 0) {
        await client.query(`
          CREATE INDEX ${indexName}
          ON ${table}(email, verification_code)
          WHERE verification_code IS NOT NULL
        `);
        console.log(`  ✅ Created index ${indexName}`);
      } else {
        console.log(`  ⏭️  Index ${indexName} already exists`);
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Email verification migration completed successfully!');
    console.log('\nSummary:');
    console.log('  - Added email_verified (BOOLEAN) to all user tables');
    console.log('  - Added verification_code (VARCHAR(6)) to all user tables');
    console.log('  - Added verification_code_expires (TIMESTAMP) to all user tables');
    console.log('  - Created indexes for faster verification lookups');
    console.log('  - Existing users marked as verified');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  addEmailVerificationFields()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addEmailVerificationFields;
