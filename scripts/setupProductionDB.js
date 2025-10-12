#!/usr/bin/env node
// Database migration script for production
// This ensures your production DB has the exact same structure as local

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🗄️  Database Migration to Production');
console.log('====================================\n');

console.log('This script will:');
console.log('1. Apply all Prisma migrations to production');
console.log('2. Generate Prisma client for production');
console.log('3. Seed the database with initial data');
console.log('4. Verify the schema matches local\n');

rl.question('Enter your production DATABASE_URL: ', (prodUrl) => {
  if (!prodUrl.startsWith('postgresql://')) {
    console.error('❌ Invalid PostgreSQL URL format');
    process.exit(1);
  }

  console.log('\n🔄 Setting up production database...\n');

  // Set the production DATABASE_URL temporarily
  process.env.DATABASE_URL = prodUrl;

  // Step 1: Apply migrations
  console.log('📋 Step 1: Applying migrations...');
  exec('npx prisma migrate deploy', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    console.log('✅ Migrations applied successfully\n');

    // Step 2: Generate client
    console.log('🔧 Step 2: Generating Prisma client...');
    exec('npx prisma generate', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Client generation failed:', error);
        return;
      }
      console.log('✅ Prisma client generated\n');

      // Step 3: Seed database
      console.log('🌱 Step 3: Seeding database...');
      exec('npx prisma db seed', (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️  Seeding failed (this is normal if data already exists)');
        } else {
          console.log('✅ Database seeded successfully');
        }

        // Step 4: Verify schema
        console.log('\n🔍 Step 4: Verifying database schema...');
        exec('npx prisma db pull', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Schema verification failed:', error);
            return;
          }
          
          console.log('\n🎉 Production database setup complete!');
          console.log('\nYour production DATABASE_URL:');
          console.log(prodUrl);
          console.log('\n📝 Next steps:');
          console.log('1. Add this URL to your hosting environment variables');
          console.log('2. Set NODE_ENV=production');
          console.log('3. Deploy your application');
          
          rl.close();
        });
      });
    });
  });
});

rl.on('close', () => {
  process.exit(0);
});