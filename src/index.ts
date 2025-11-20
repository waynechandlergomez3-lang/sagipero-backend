import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from './generated/prisma';
import { db } from './services/database';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import locationRoutes from './routes/locationRoutes';
import medicalProfileRoutes from './routes/medicalProfileRoutes';
import { setIO } from './realtime';

// Initialize environment variables
dotenv.config();

// CRITICAL FIX: Force correct DATABASE_URL to use transaction pooler (port 6543)
// Also optimize for Philippines -> US East 2 geographic distance
if (process.env.DATABASE_URL) {
  // Force transaction pooler (6543) if session pooler (5432) is detected
  if (process.env.DATABASE_URL.includes(':5432')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(':5432', ':6543');
    console.log('🔧 Fixed: DATABASE_URL port changed from 5432 to 6543 (transaction pooler)');
  }
  
  // Add connection optimizations for Philippines -> US East 2 latency
  if (!process.env.DATABASE_URL.includes('connection_limit')) {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.set('connection_limit', '10');
    url.searchParams.set('pool_timeout', '60');
    url.searchParams.set('connect_timeout', '30');
    process.env.DATABASE_URL = url.toString();
    console.log('🌏 Optimized: DATABASE_URL configured for Philippines -> US East 2 latency');
  }
  
  console.log('🔗 Final DATABASE_URL port:', process.env.DATABASE_URL.includes(':6543') ? '6543 ✅' : '5432 ❌');
}
// This prevents "prepared statement does not exist" errors from session pooler (port 5432)
const CORRECT_DATABASE_URL = "postgresql://postgres.vsrvdgzvyhlpnnvktuwn:Sagipero081@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes(':5432')) {
  console.log('🔧 Fixing DATABASE_URL: Forcing transaction pooler (port 6543)');
  process.env.DATABASE_URL = CORRECT_DATABASE_URL;
} else if (process.env.DATABASE_URL.includes(':6543')) {
  console.log('✅ DATABASE_URL already correct (port 6543)');
} else {
  console.log('⚠️  Unknown DATABASE_URL format - setting correct one');
  process.env.DATABASE_URL = CORRECT_DATABASE_URL;
}

// Create Express app
const app = express();

// For backward compatibility, export prisma client (but prefer using db service)
export const prisma = new PrismaClient();

// Export the enhanced database service for new code
export { db };

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.APP_BASE_URL || '',
        // Allow Vercel preview/deployments and hosted admin UIs
        'https://admin-web-pearl.vercel.app',
        'https://admin-ifzcd9xpi-waynes-projects-cf252c82.vercel.app', // Current Vercel deployment
        'https://sagipero-admin.vercel.app', // Allow Vercel deployment
        'https://sagipero-admin.netlify.app', // Allow Netlify deployment
        'http://localhost:3000', // Allow local Vite dev server
        'http://localhost:4173', // Allow Vite preview server
        'http://localhost:5173', // Allow default Vite dev server
        'http://127.0.0.1:3000', // Allow localhost variants
        'http://127.0.0.1:4173',
        'http://127.0.0.1:5173',
        'exp://192.168.1.1:8081' // Allow Expo dev client, update IP as needed
      ].filter(url => url && url.length > 0)
    : '*', // Allow all origins in development
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
  } else {
    // Enhanced logging in production for debugging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body status:', req.body ? 'Present' : 'UNDEFINED');
    if (req.body) {
      console.log('Body keys:', Object.keys(req.body));
      console.log('Body content:', JSON.stringify(req.body));
    }
  }
  next();
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// register io instance for other modules
setIO(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle SOS alerts
  socket.on('sos:triggered', async (data) => {
    console.log('SOS triggered:', data);
    // Broadcast to admin channel
    io.to('admin_channel').emit('emergency:new', {
      ...data,
      socketId: socket.id
    });
  });

  // Handle emergency alerts
  socket.on('emergency_alert', async (data) => {
    console.log('Emergency alert:', data);
    io.to('admin_channel').emit('emergency:new', {
      ...data,
      socketId: socket.id
    });
  });

  // Handle location updates
  socket.on('location_update', async (data) => {
    if (socket.data?.user) {
      io.to(`user_${socket.data.user.id}`).emit('location:updated', data);
    }
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/medical', medicalProfileRoutes);
import evacuationCenterRoutes from './routes/evacuationCenterRoutes';
app.use('/api/evacuation-centers', evacuationCenterRoutes);
import notificationRoutes from './routes/notificationRoutes';
app.use('/api/notifications', notificationRoutes);

import weatherAlertRoutes from './routes/weatherAlertRoutes';
app.use('/api/weather-alerts', weatherAlertRoutes);

import articleRoutes from './routes/articleRoutes';
app.use('/api/articles', articleRoutes);

import configRoutes from './routes/configRoutes';
app.use('/api/config', configRoutes);
import reportRoutes from './routes/reportRoutes';
app.use('/api/reports', reportRoutes);

import vehicleRoutes from './routes/vehicleRoutes';
app.use('/api/vehicles', vehicleRoutes);

// Serve local uploads directory (development fallback)
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Basic health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'healthy' });
});

// Error handling middleware
import { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
};

app.use(errorHandler);

// Start server on a single port
const PORT = Number(process.env.PORT) || 8080;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (LAN accessible)`);
  console.log(`🗄️  Database URL port: ${process.env.DATABASE_URL?.match(/:(\d+)\//)?.[1] || 'unknown'}`);
});
