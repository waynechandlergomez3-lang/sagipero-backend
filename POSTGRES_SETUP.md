# 🗄️ Production PostgreSQL Setup Guide

## Your Local Database Configuration
- Database: `sagipero_db`
- User: `postgres`
- Password: `808080`
- Host: `localhost:5432`

## Free PostgreSQL Hosting Options

### 🟢 **Option 1: Supabase (Recommended)**
**Why:** Free forever, 500MB, excellent performance, built-in dashboard

**Steps:**
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → Sign up
3. Create new project:
   - Project name: `sagipero-backend`
   - Database password: Choose strong password (save it!)
   - Region: Choose closest to your users
4. Wait for setup (2-3 minutes)
5. Go to Settings → Database → Connection string
6. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijk.supabase.co:5432/postgres
   ```

### 🟡 **Option 2: Railway**
**Why:** Easy setup, integrates with GitHub, $5/month after free trial

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project → Add PostgreSQL
4. Railway auto-generates DATABASE_URL
5. Copy from Variables tab:
   ```
   postgresql://postgres:[GENERATED-PASS]@containers-us-west-X.railway.app:5432/railway
   ```

### 🔶 **Option 3: Render.com**
**Why:** Good free tier, but database expires after 90 days

**Steps:**
1. Go to [render.com](https://render.com)
2. Sign up → Dashboard
3. New → PostgreSQL
4. Database name: `sagipero_db`
5. User: `sagipero` (or leave default)
6. Copy Internal Database URL:
   ```
   postgresql://sagipero:[PASSWORD]@dpg-xxxxx-a.oregon-postgres.render.com/sagipero_db
   ```

### 🟣 **Option 4: Neon.tech**
**Why:** Generous free tier, serverless PostgreSQL

**Steps:**
1. Go to [neon.tech](https://neon.tech)
2. Sign up → Create project
3. Project name: `sagipero`
4. Database name: `sagipero_db`
5. Copy connection string from dashboard

## 🚀 **Database Migration Process**

### Method 1: Automated Script (Recommended)
```bash
# Run the setup script
node scripts/setupProductionDB.js

# Follow prompts to enter your production DATABASE_URL
# Script will automatically:
# - Apply all migrations
# - Generate Prisma client
# - Seed initial data
# - Verify schema
```

### Method 2: Manual Steps
```bash
# 1. Set production DATABASE_URL temporarily
export DATABASE_URL="your-production-url-here"

# 2. Apply migrations (creates all tables)
npx prisma migrate deploy

# 3. Generate Prisma client
npx prisma generate

# 4. Seed database (optional, creates admin users)
npx prisma db seed

# 5. Verify everything matches
npx prisma db pull
```

## 🔍 **Verification Steps**

After setup, verify your production database:

```bash
# Check tables exist
npx prisma studio
# Opens browser interface to view data

# Or connect with psql
psql "your-production-database-url"
\dt  # List all tables
```

**Expected tables:**
- User
- Emergency  
- Location
- Notification
- EvacuationCenter
- WeatherAlert
- Article
- UserDocument
- CommonMedicalCondition
- CommonAllergy
- EmergencyHistory

## 🎯 **Final Production URL**

Once you have your DATABASE_URL, update your production environment:

```env
# Your production .env
DATABASE_URL="postgresql://user:password@host:5432/database"
NODE_ENV=production
JWT_SECRET="your-secure-jwt-secret"
APP_BASE_URL="https://your-app-domain.com"
```

## 🛡️ **Security Notes**
- Never commit DATABASE_URL to Git
- Use different passwords for local vs production
- Enable SSL in production (most hosts do this automatically)
- Consider connection pooling for high traffic

## 📊 **Free Tier Limits**
- **Supabase**: 500MB, unlimited projects, 2 databases per project
- **Railway**: 500MB, then $5/month
- **Render**: 1GB for 90 days, then paid
- **Neon**: 3GB, 1 project, excellent performance

**Recommendation**: Start with Supabase for long-term free hosting, or Railway if you plan to scale quickly.