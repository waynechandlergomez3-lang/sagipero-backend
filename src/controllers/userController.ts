import { Response } from 'express';
import { PrismaClient, UserRole, ResponderStatus } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../types/custom';
import { randomUUID } from 'crypto';

// CRITICAL FIX: Force correct DATABASE_URL to use transaction pooler (port 6543)
const CORRECT_DATABASE_URL = "postgresql://postgres.vsrvdgzvyhlpnnvktuwn:Sagipero081@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes(':5432')) {
  process.env.DATABASE_URL = CORRECT_DATABASE_URL;
}

// Enhanced Prisma client with connection pooling optimized for Supabase
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error'],
  errorFormat: 'minimal'
});

// Connection health check and auto-reconnect utility
const ensureConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return prisma;
  } catch (error) {
    console.warn('🔄 Prisma connection issue detected, reconnecting...');
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Prisma reconnection successful');
      return prisma;
    } catch (reconnectError) {
      console.error('❌ Prisma reconnection failed:', reconnectError);
      throw reconnectError;
    }
  }
};

export const signup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
  const { email, password, name, phone, role = UserRole.RESIDENT, address, barangay } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        address,
        barangay,
        specialCircumstances: ['NONE'],
        medicalConditions: [],
        allergies: [],
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        barangay: true,
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true
      }
    });

    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (error) {
    // Improve error visibility for debugging. Prisma may throw known errors (e.g. P2002 unique constraint)
    console.error('Signup error:', error, 'code=', (error as any)?.code, 'meta=', (error as any)?.meta);

    // Handle Prisma unique constraint violation
    const errCode = (error as any)?.code;
    if (errCode === 'P2002') {
      const target = (error as any)?.meta?.target || 'field';
      res.status(409).json({ error: `Unique constraint failed on ${target}` });
      return;
    }

    // Return the error message for debugging (can be sanitized in production)
    const message = (error as any)?.message || 'Error creating user';
    res.status(500).json({ error: message });
    return;
  }
};

export const createUserByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }

    const {
      name,
      email,
      phone,
      address,
      barangay,
      role,
      responderStatus,
      bloodType,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      medicalConditions,
      allergies,
      specialCircumstances
    } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: 'email and name are required' });
      return;
    }

    // Create user with a random temporary password so Prisma validation passes if password is required.
    const tempPassword = Math.random().toString(36).slice(2, 10);

      const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name,
        email,
        phone,
        address,
        barangay,
        role: role || 'RESIDENT',
        responderStatus: responderStatus || 'OFFLINE',
           password: await bcrypt.hash(tempPassword, 10),
        bloodType: bloodType || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
  medicalConditions: medicalConditions || [],
  allergies: allergies || [],
  specialCircumstances: (specialCircumstances && specialCircumstances.length>0) ? specialCircumstances : ['NONE'],
        updatedAt: new Date()
      }
    });

    res.json({ user, tempPassword });
  } catch (err) {
    console.error('createUserByAdmin error:', err);
    const message = (err && (err as any).message) ? (err as any).message : 'Internal error';
    res.status(500).json({ error: message, debug: err });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Ensure healthy database connection before critical operations
    const healthyPrisma = await ensureConnection();

    const user = await healthyPrisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        barangay: true,
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    // Enhanced error logging with database connection details
    const databaseUrl = process.env.DATABASE_URL || 'Not set';
    const port = databaseUrl.includes(':5432') ? '5432 (SESSION POOLER - PROBLEMATIC)' : 
                 databaseUrl.includes(':6543') ? '6543 (TRANSACTION POOLER - CORRECT)' : 'UNKNOWN';
    
    console.error('Login error:', error);
    console.error('Database URL port:', port);
    console.error('Full DATABASE_URL:', databaseUrl.replace(/:[^:@]*@/, ':***@')); // Hide password
    
    // Check if it's the prepared statement error - even with correct port 6543
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('prepared statement')) {
      console.error('🚨 PREPARED STATEMENT ERROR: Even with transaction pooler (port 6543)');
      console.error('� This indicates a Prisma connection pooling issue');
      console.error('�💡 SOLUTION: Connection health check and reconnection implemented');
      
      // Try one more time with a fresh connection
      try {
        console.log('🔄 Attempting automatic retry with fresh connection...');
        const freshPrisma = await ensureConnection();
        const { email, password } = req.body;
        
        const user = await freshPrisma.user.findUnique({
          where: { email },
          select: {
            id: true, email: true, password: true, name: true, role: true,
            phone: true, address: true, barangay: true, specialCircumstances: true,
            medicalConditions: true, allergies: true, bloodType: true,
            emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true
          }
        });
        
        if (!user) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
        
        const token = generateToken(user.id);
        const { password: _, ...userWithoutPassword } = user;
        console.log('✅ Login successful after retry');
        res.json({ user: userWithoutPassword, token });
        return;
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
      }
      
      res.status(500).json({ 
        error: 'Database connection issue - prepared statement error with transaction pooler',
        debug: `Database port: ${port}`,
        hint: 'Automatic retry attempted but failed - temporary connection issue'
      });
    } else {
      res.status(500).json({ 
        error: 'Error logging in',
        debug: `Database port: ${port}`
      });
    }
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
  address: true,
  barangay: true,
        Location: {
          select: {
            latitude: true,
            longitude: true,
            updatedAt: true
          }
        },
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      phone, 
      address, 
      barangay,
      bloodType, 
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      medicalConditions,
      allergies,
      specialCircumstances 
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user?.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
  ...(address && { address }),
  ...(barangay && { barangay }),
        ...(bloodType && { bloodType }),
        ...(emergencyContactName && { emergencyContactName }),
        ...(emergencyContactPhone && { emergencyContactPhone }),
        ...(emergencyContactRelation && { emergencyContactRelation }),
        ...(medicalConditions && { medicalConditions }),
        ...(allergies && { allergies }),
        ...(specialCircumstances && { specialCircumstances })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        barangay: true,
        Location: {
          select: {
            latitude: true,
            longitude: true,
            updatedAt: true
          }
        },
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

export const updateSituationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status } = req.body;
    
    if (!['SAFE', 'NEED_ASSISTANCE', 'EMERGENCY'].includes(status)) {
      res.status(400).json({ error: 'Invalid situation status' });
      return;
    }

  // persist current situation on the user
  await prisma.user.update({ where: { id: req.user.id }, data: { situationStatus: status } });

  await prisma.notification.create({
      data: {
        type: status,
        title: `${status} Status Update`,
        message: `User status updated to ${status}`,
        data: { userId: req.user.id, status },
        userId: req.user.id 
      }
    });

    // Emit notification to user in real-time
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to(`user_${req.user.id}`).emit('notification:new', {
        type: status,
        title: `${status} Status Update`,
        message: `Your status was updated to ${status}`,
        data: { status },
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to emit status notification via socket:', err);
    }

    res.json({ status: 'updated', currentStatus: status });
  } catch (error) {
    console.error('Update situation status error:', error);
    res.status(500).json({ error: 'Error updating situation status' });
  }
};

export const listUsers = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    // Only admins can list all users
  if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }

    // Optional role filter (e.g. ?role=RESPONDER) to only return responders
    const roleFilter = typeof req.query.role === 'string' ? req.query.role : undefined
    const where = roleFilter ? { role: roleFilter as UserRole } : undefined

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        responderStatus: true,
        situationStatus: true,
        barangay: true,
        createdAt: true
      }
    });

  console.log('listUsers: found', (users || []).length, 'users');
  res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Unable to list users' });
  }
};

export const updateUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
  if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { id } = req.params as any;
    const {
      name,
      phone,
      address,
      barangay,
      role,
      responderStatus,
      bloodType,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      medicalConditions,
      allergies,
      specialCircumstances
    } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (address) data.address = address;
    if (barangay) data.barangay = barangay;
    if (role) data.role = role;
    if (responderStatus) data.responderStatus = responderStatus;
    if (bloodType) data.bloodType = bloodType;
    if (emergencyContactName) data.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone) data.emergencyContactPhone = emergencyContactPhone;
    if (emergencyContactRelation) data.emergencyContactRelation = emergencyContactRelation;
    if (medicalConditions) data.medicalConditions = medicalConditions;
    if (allergies) data.allergies = allergies;
    if (specialCircumstances) data.specialCircumstances = specialCircumstances;

    const user = await prisma.user.update({ where: { id }, data, select: {
      id: true, email: true, name: true, role: true, phone: true, barangay: true, responderStatus: true
    }});
    res.json(user);
  } catch (error) {
    console.error('updateUserById error', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { id } = req.params as any;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        barangay: true,
        responderStatus: true,
        situationStatus: true,
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    console.error('getUserById error', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export const deleteUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { id } = req.params as any;
    await prisma.user.delete({ where: { id } });
    res.json({ status: 'deleted' });
  } catch (error) {
    console.error('deleteUserById error', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

export const toggleResponderByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
  if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { userId } = req.body as any;
  if (!userId) { res.status(400).json({ error: 'Missing userId' }); return; }
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, responderStatus: true, role: true } });
  if (!u) { res.status(404).json({ error: 'User not found' }); return; }
  // only apply to responders (or set role to RESPONDER)
  const newStatus: ResponderStatus = u.responderStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
  await prisma.user.update({ where: { id: userId }, data: { responderStatus: newStatus } });
    try { const { getIO } = require('../realtime'); getIO().to('admin_channel').emit('responder:status', { responderId: userId, status: newStatus }); } catch (e) {}
    res.json({ status: 'ok', responderStatus: newStatus });
  } catch (error) {
    console.error('toggleResponderByAdmin error', error);
    res.status(500).json({ error: 'Failed' });
  }
}
