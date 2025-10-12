# Sagipero Backend Deployment Guide

## Free Hosting Options (Recommended for Small Scale)

### Option 1: Railway.app (Recommended)
- **Database**: Free PostgreSQL (500MB)
- **Backend**: Free deployment with custom domain
- **Steps**:
  1. Create account at railway.app
  2. Connect GitHub repo
  3. Add PostgreSQL service
  4. Set environment variables in Railway dashboard:
     ```
     NODE_ENV=production
     JWT_SECRET=your-generated-secret-here
     APP_BASE_URL=https://your-app-name.up.railway.app
     ```
  5. Railway automatically provides `DATABASE_URL`

### Option 2: Render.com
- **Database**: Free PostgreSQL (100MB, expires after 90 days)
- **Backend**: Free web service (spins down after 15min idle)
- **Steps**:
  1. Create account at render.com
  2. Create PostgreSQL database service
  3. Create web service from GitHub
  4. Set build command: `npm run build`
  5. Set start command: `npm run start:prod`
  6. Add environment variables

### Option 3: Supabase + Vercel
- **Database**: Supabase (Free PostgreSQL)
- **Backend**: Vercel Functions (Limited free tier)
- More complex setup but good for scaling

## Pre-Deployment Checklist

### 1. Generate Strong JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update Environment Variables
Copy `.env.production` and update:
- `JWT_SECRET` - Use generated secret above
- `APP_BASE_URL` - Your hosting domain
- `DATABASE_URL` - Will be provided by hosting service

### 3. Build and Test
```bash
npm run build
npm run start:prod
```

### 4. Database Migration
After deployment, run:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Port Configuration
- Backend: 8080 (production)
- Mobile App: 8081 (development)
- Adminer: 8082 (development only)
- Admin Web: 3000 (development), will be separate deployment

## File Uploads
- Currently uses local disk storage (fine for small scale)
- Files served via Express static middleware
- For production scale, migrate to AWS S3 or Cloudinary

## Security Notes
- CORS configured for production domains
- Request logging reduced in production
- JWT secret must be changed from default
- Database credentials managed by hosting service

## Deployment Commands
```bash
# Local development
npm run dev

# Production build
npm run build

# Production start
npm run start:prod
```

## Free Tier Limitations
- Railway: 500MB DB, $5/month after trial
- Render: 100MB DB (90 days), slow cold starts
- Consider paid tiers for production use ($7-15/month)

## Next Steps After Deployment
1. Update admin-web API endpoints to point to production backend
2. Update mobile app API configuration
3. Test all flows end-to-end
4. Set up monitoring (free tier available on most platforms)