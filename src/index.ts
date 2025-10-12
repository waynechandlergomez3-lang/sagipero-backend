import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
// Import PrismaClient from generated client because generator output is configured to ../src/generated/prisma
import { PrismaClient } from './generated/prisma';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import locationRoutes from './routes/locationRoutes';
import medicalProfileRoutes from './routes/medicalProfileRoutes';
import { setIO } from './realtime';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.APP_BASE_URL || '',
        'https://your-admin-web-domain.vercel.app', // Update with your admin web domain
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
    // Minimal logging in production
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
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
});
