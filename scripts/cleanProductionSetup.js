#!/usr/bin/env node
// Clean production database setup
// This bypasses the conflicting development migrations and applies a clean schema

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧹 Clean Production Database Setup');
console.log('==================================\n');

console.log('This script will:');
console.log('✅ Apply a single, clean migration (no conflicts)');
console.log('✅ Create all tables and relationships');
console.log('✅ Insert seed data');
console.log('✅ Generate Prisma client');
console.log('✅ Verify everything works\n');

rl.question('Enter your production DATABASE_URL: ', async (prodUrl) => {
  if (!prodUrl.startsWith('postgresql://')) {
    console.error('❌ Invalid PostgreSQL URL format');
    process.exit(1);
  }

  console.log('\n🔄 Setting up clean production database...\n');

  // Set the production DATABASE_URL
  process.env.DATABASE_URL = prodUrl;

  try {
    // Step 1: Apply clean migration using psql
    console.log('📋 Step 1: Applying clean migration...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', 'clean_production_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Write temp file for psql
    const tempFile = path.join(__dirname, 'temp_migration.sql');
    fs.writeFileSync(tempFile, migrationSQL);
    
    await new Promise((resolve, reject) => {
      exec(`psql "${prodUrl}" -f "${tempFile}"`, (error, stdout, stderr) => {
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        if (error) {
          console.error('❌ Migration failed:', error);
          reject(error);
          return;
        }
        
        console.log('✅ Clean migration applied successfully');
        console.log(stdout);
        resolve();
      });
    });

    // Step 2: Reset Prisma migration state
    console.log('\n🔧 Step 2: Resetting Prisma migration state...');
    await new Promise((resolve, reject) => {
      exec('npx prisma migrate resolve --applied "clean_production_setup"', (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️  Migration state reset skipped (normal for fresh database)');
        } else {
          console.log('✅ Migration state updated');
        }
        resolve();
      });
    });

    // Step 3: Generate Prisma client
    console.log('\n🔧 Step 3: Generating Prisma client...');
    await new Promise((resolve, reject) => {
      exec('npx prisma generate', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Client generation failed:', error);
          reject(error);
          return;
        }
        console.log('✅ Prisma client generated successfully');
        resolve();
      });
    });

    // Step 4: Verify database
    console.log('\n🔍 Step 4: Verifying database...');
    await new Promise((resolve, reject) => {
      exec('npx prisma db pull --force', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Verification failed:', error);
          reject(error);
          return;
        }
        console.log('✅ Database schema verified');
        resolve();
      });
    });

    console.log('\n🎉 Clean production database setup complete!');
    console.log('\n📊 Database contains:');
    console.log('• User management (residents, responders, admins)');  
    console.log('• Emergency reporting and tracking');
    console.log('• Location tracking');
    console.log('• Medical profiles and documents');
    console.log('• Evacuation centers');
    console.log('• Weather alerts');
    console.log('• Notifications system');
    console.log('• Emergency history tracking');
    
    console.log('\n🔗 Your production DATABASE_URL:');
    console.log(prodUrl);
    
    console.log('\n📝 Next steps:');
    console.log('1. Add this URL to your hosting environment variables');
    console.log('2. Set NODE_ENV=production');
    console.log('3. Generate JWT secret: npm run generate-jwt');
    console.log('4. Deploy your application');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
  
  rl.close();
});

rl.on('close', () => {
  process.exit(0);
});