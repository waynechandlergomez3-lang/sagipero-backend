import { Response } from 'express';
import { UserRole, ResponderStatus } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../types/custom';
import { randomUUID } from 'crypto';
import { db } from '../services/database';
import { rawDb } from '../services/rawDatabase';

export const signup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
  const { email, password, name, phone, role = UserRole.RESIDENT, address, barangay } = req.body;

    console.log('signup: using raw database service for checking existing user');
    const existingUser = await rawDb.getUserByEmail(email);

    if (existingUser) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.withRetry(async (client) => {
      return await client.user.create({
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

      const user = await db.withRetry(async (client) => {
        return await client.user.create({
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

    // Use raw database service to bypass Prisma prepared statement issues
    console.log('🔧 Using raw database service for login to avoid prepared statement conflicts');
    const user = await rawDb.login(email, password);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);
    res.json({ user, token });
    console.log('✅ Login successful via raw database service');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('getProfile: using raw database service for fetching user profile');
    const user = await rawDb.getUserProfile(req.user?.id!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Transform the flat result to match expected nested structure
    const transformedUser = {
      ...user,
      Location: user.latitude && user.longitude ? {
        latitude: user.latitude,
        longitude: user.longitude,
        updatedAt: user.locationUpdatedAt
      } : null
    };

    // Remove the flat location fields
    delete transformedUser.latitude;
    delete transformedUser.longitude;
    delete transformedUser.locationUpdatedAt;

    res.json(transformedUser);
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

    const user = await db.withRetry(async (client) => {
      return await client.user.update({
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
  await db.withRetry(async (client) => {
    await client.user.update({ where: { id: req.user!.id }, data: { situationStatus: status } });
  });

  await db.withRetry(async (client) => {
    await client.notification.create({
        data: {
          type: status,
          title: `${status} Status Update`,
          message: `User status updated to ${status}`,
          data: { userId: req.user!.id, status },
          userId: req.user!.id 
        }
      });
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

    console.log('listUsers: using raw database service for listing users');
    const users = await rawDb.listUsers(roleFilter);

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

    const user = await db.withRetry(async (client) => {
      return await client.user.update({ where: { id }, data, select: {
        id: true, email: true, name: true, role: true, phone: true, barangay: true, responderStatus: true
      }});
    });
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
    
    console.log('getUserById: using raw database service for fetching user by ID');
    const user = await rawDb.getUserByIdAdmin(id);
    
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
    await db.withRetry(async (client) => {
      await client.user.delete({ where: { id } });
    });
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
  
  console.log('toggleResponderByAdmin: using raw database service for getting responder status');
  const u = await rawDb.getResponderStatus(userId);
  
  if (!u) { res.status(404).json({ error: 'User not found' }); return; }
  // only apply to responders (or set role to RESPONDER)
  const newStatus: ResponderStatus = u.responderStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
  await db.withRetry(async (client) => {
    await client.user.update({ where: { id: userId }, data: { responderStatus: newStatus } });
  });
    try { const { getIO } = require('../realtime'); getIO().to('admin_channel').emit('responder:status', { responderId: userId, status: newStatus }); } catch (e) {}
    res.json({ status: 'ok', responderStatus: newStatus });
  } catch (error) {
    console.error('toggleResponderByAdmin error', error);
    res.status(500).json({ error: 'Failed' });
  }
}
