# Sagipero Backend API

Emergency response system backend built with Node.js, Express, TypeScript, and PostgreSQL.

hey

## 🚀 Quick Deploy

### Railway (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Connect this repository
2. Set environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secure-jwt-secret
   DATABASE_URL=your-postgresql-url
   ```

### Render.com
1. Create new Web Service
2. **Build Command**: `npm run build`
3. **Start Command**: `npm run start:prod`
4. Add environment variables (same as above)

## 🔧 Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
JWT_SECRET=your-256-bit-secret

# Optional
APP_BASE_URL=https://your-domain.com
AWS_S3_BUCKET=your-bucket (for file uploads)
```

## 📋 Features

- **User Management**: Residents, Responders, Admins
- **Emergency Reporting**: Real-time SOS and emergency tracking
- **Location Services**: GPS tracking and responder dispatch
- **Medical Profiles**: Special circumstances and medical conditions
- **Weather Alerts**: Disaster preparedness notifications
- **Real-time Communication**: WebSocket support
- **File Uploads**: Document management system

## 🗄️ Database

Uses PostgreSQL with Prisma ORM. Database schema includes:
- Users (with roles and medical profiles)
- Emergency reports and tracking
- Location data
- Notifications system
- Evacuation centers
- Weather alerts

## 🔒 Security

- JWT authentication
- CORS configuration
- Environment-based settings
- Input validation
- SQL injection protection (Prisma)

## 📚 API Endpoints

- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/emergencies` - List emergencies
- `POST /api/emergencies` - Create emergency
- `GET /api/users/profile` - User profile
- `WebSocket` - Real-time updates

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

## 📦 Deployment

1. Set up PostgreSQL database (Supabase recommended)
2. Run database migration: `npm run clean-production-setup`
3. Deploy to hosting service
4. Set environment variables
5. Access your API at: `https://your-domain.com/api`

## 🔍 Health Check

Visit `/health` endpoint to verify deployment:
```json
{"status": "healthy"}
```

## 📄 License

MIT License - see LICENSE file for details.

<!-- force-push-trigger: minor edit to trigger push -->
<!-- backend: note added 2025-11-24 to trigger deployment push -->