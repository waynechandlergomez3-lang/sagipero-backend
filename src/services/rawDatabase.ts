import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Raw PostgreSQL service to bypass Prisma's prepared statement issues
class RawDatabaseService {
  private static instance: RawDatabaseService;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Small pool size to avoid too many connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  public static getInstance(): RawDatabaseService {
    if (!RawDatabaseService.instance) {
      RawDatabaseService.instance = new RawDatabaseService();
    }
    return RawDatabaseService.instance;
  }

  // Login method using raw SQL without prepared statements
  public async login(email: string, password: string) {
    const client = await this.pool.connect();
    try {
      // Use dynamic SQL to avoid prepared statements
      const query = `
        SELECT id, email, password, name, role, phone, address, barangay, 
               "specialCircumstances", "medicalConditions", allergies, "bloodType",
               "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation"
        FROM "User" 
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
      
    } finally {
      client.release();
    }
  }

  // Find user by email - raw SQL
  public async findUserByEmail(email: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, email, password, name, role, phone, address, barangay,
               "specialCircumstances", "medicalConditions", allergies, "bloodType",
               "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
               "createdAt", "updatedAt"
        FROM "User" 
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Find user by ID - raw SQL (for auth middleware)
  public async getUserById(id: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, email, name, role, phone, address, barangay,
               "specialCircumstances", "medicalConditions", allergies, "bloodType",
               "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
               "createdAt", "updatedAt"
        FROM "User" 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Create user - raw SQL
  public async createUser(userData: {
    id: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: string;
    address?: string;
    barangay?: string;
    specialCircumstances?: string[];
    medicalConditions?: string[];
    allergies?: string[];
  }) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO "User" (
          id, email, password, name, phone, role, address, barangay,
          "specialCircumstances", "medicalConditions", allergies, "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
        )
        RETURNING id, email, name, role, phone, address, barangay,
                  "specialCircumstances", "medicalConditions", allergies, "bloodType",
                  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation"
      `;
      
      const result = await client.query(query, [
        userData.id,
        userData.email,
        userData.password,
        userData.name,
        userData.phone || null,
        userData.role || 'RESIDENT',
        userData.address || null,
        userData.barangay || null,
        JSON.stringify(userData.specialCircumstances || ['NONE']),
        JSON.stringify(userData.medicalConditions || []),
        JSON.stringify(userData.allergies || [])
      ]);
      
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }

  // Health check without prepared statements
  public async healthCheck(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Raw database health check failed:', error);
      return false;
    } finally {
      client.release();
    }
  }

  // List all users - raw SQL
  public async listUsers(roleFilter?: string) {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT id, email, name, role, phone, address, barangay,
               "specialCircumstances", "medicalConditions", allergies, "bloodType",
               "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
               "responderStatus", "situationStatus", "createdAt", "updatedAt"
        FROM "User" 
      `;
      
      const params: any[] = [];
      if (roleFilter) {
        query += ` WHERE role = $1`;
        params.push(roleFilter);
      }
      
      query += ` ORDER BY "createdAt" DESC`;
      
      const result = await client.query(query, params);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // List emergencies - raw SQL
  public async listEmergencies() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT e.id, e.type, e.description, e.location, e.address, e.priority, e.status,
               e."isFraud", e."createdAt", e."updatedAt", e."userId", e."responderId", e."resolvedAt",
               e."responseNotes", e."responderLocation", e."evacuationId",
               u.name as "user_name", u.phone as "user_phone", u.role as "user_role",
               r.name as "responder_name", r.phone as "responder_phone", r.role as "responder_role"
        FROM "Emergency" e
        LEFT JOIN "User" u ON e."userId" = u.id
        LEFT JOIN "User" r ON e."responderId" = r.id
        WHERE e.status != 'RESOLVED' AND (e."isFraud" IS NOT TRUE)
        ORDER BY e."createdAt" DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // List evacuation centers - raw SQL
  public async listEvacuationCenters() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, name, address, capacity, "currentCount", facilities, location,
               "contactNumber", "isActive", "createdAt", "updatedAt"
        FROM "EvacuationCenter"
        ORDER BY name ASC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // List weather alerts - raw SQL
  public async listWeatherAlerts() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, title, message, area, "hourlyIndexes", daily,
               "isActive", "createdAt", "updatedAt"
        FROM "WeatherAlert" 
        ORDER BY "createdAt" DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Get all emergencies history - raw SQL
  public async getAllEmergenciesHistory() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT eh.id, eh."emergencyId", eh.status, eh."changedAt", eh."changedBy", eh.notes,
               e.type as "emergencyType", e.description as "emergencyDescription",
               u.name as "changedByName"
        FROM "EmergencyHistory" eh
        LEFT JOIN "Emergency" e ON eh."emergencyId" = e.id
        LEFT JOIN "User" u ON eh."changedBy" = u.id
        ORDER BY eh."changedAt" DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Get single emergency by ID - raw SQL
  public async getEmergencyById(id: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT e.id, e.type, e.description, e.location, e.address, e.priority, e.status, e."isFraud",
               e."createdAt", e."updatedAt", e."userId", e."responderId",
               u.name as "userName", u.phone as "userPhone", u.role as "userRole",
               r.name as "responderName", r.phone as "responderPhone", r.role as "responderRole"
        FROM "Emergency" e
        LEFT JOIN "User" u ON e."userId" = u.id
        LEFT JOIN "User" r ON e."responderId" = r.id
        WHERE e.id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Get latest emergency for user - raw SQL
  public async getLatestEmergencyForUser(userId: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT e.id, e.type, e.description, e.location, e.address, e.priority, e.status, e."isFraud",
               e."createdAt", e."updatedAt", e."userId", e."responderId",
               u.name as "userName", u.phone as "userPhone", u.role as "userRole",
               r.name as "responderName", r.phone as "responderPhone", r.role as "responderRole"
        FROM "Emergency" e
        LEFT JOIN "User" u ON e."userId" = u.id
        LEFT JOIN "User" r ON e."responderId" = r.id
        WHERE e."userId" = $1 AND e.status != 'RESOLVED' AND (e."isFraud" IS NOT TRUE)
        ORDER BY e."createdAt" DESC
        LIMIT 1
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // List pending emergencies for responder - raw SQL
  public async listPendingEmergencies() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT e.id, e.type, e.address, e.location, e."createdAt", e.priority,
               u.name as "userName", u.phone as "userPhone"
        FROM "Emergency" e
        LEFT JOIN "User" u ON e."userId" = u.id
        WHERE e.status = 'PENDING' AND (e."isFraud" IS NOT TRUE)
        ORDER BY e."createdAt" ASC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Get user by ID (detailed for admin) - raw SQL
  public async getUserByIdAdmin(id: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, email, name, role, phone, address, barangay,
               "responderStatus", "situationStatus", "specialCircumstances", 
               "medicalConditions", allergies, "bloodType",
               "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
               "createdAt", "updatedAt"
        FROM "User" 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Get user profile with location - raw SQL
  public async getUserProfile(id: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT u.id, u.email, u.name, u.role, u.phone, u.address, u.barangay,
               u."specialCircumstances", u."medicalConditions", u.allergies, u."bloodType",
               u."emergencyContactName", u."emergencyContactPhone", u."emergencyContactRelation",
               u."createdAt", u."updatedAt",
               l.latitude, l.longitude, l."updatedAt" as "locationUpdatedAt"
        FROM "User" u
        LEFT JOIN "Location" l ON u.id = l."userId"
        WHERE u.id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Check responder status - raw SQL
  public async getResponderStatus(userId: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, "responderStatus", role
        FROM "User" 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Check for existing active emergency for user - raw SQL
  public async getActiveEmergencyForUser(userId: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, type, status
        FROM "Emergency" 
        WHERE "userId" = $1 AND status != 'RESOLVED' AND ("isFraud" IS NOT TRUE)
        LIMIT 1
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // List emergencies marked as fraud (admin view)
  public async listFraudEmergencies() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT e.id, e.type, e.description, e.location, e.address, e.priority, e.status, e."isFraud",
               e."createdAt", e."updatedAt", e."userId", e."responderId",
               u.name as "userName", u.phone as "userPhone"
        FROM "Emergency" e
        LEFT JOIN "User" u ON e."userId" = u.id
        WHERE e."isFraud" = TRUE
        ORDER BY e."createdAt" DESC
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Mark or unmark an emergency as fraud
  public async markEmergencyFraud(id: string, isFraud: boolean) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE "Emergency" SET "isFraud" = $1, "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, type, description, location, address, priority, status, "isFraud",
               "createdAt", "updatedAt", "userId", "responderId"
      `;
      const result = await client.query(query, [isFraud, id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  // Get user details for emergency creation - raw SQL
  public async getUserForEmergency(userId: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, name, phone, "specialCircumstances", "medicalConditions"
        FROM "User" 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // List notifications for user - raw SQL
  public async listNotifications(userId: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, type, title, message, data, "isRead", "createdAt"
        FROM "Notification" 
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Get notification by ID - raw SQL
  public async getNotificationById(id: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, type, title, message, data, "isRead", "userId", "createdAt", "updatedAt"
        FROM "Notification" 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // List articles - raw SQL
  public async listArticles() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, title, content, category, "isPublished", "createdAt", "updatedAt"
        FROM "Article" 
        WHERE "isPublished" = true
        ORDER BY "createdAt" DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Get article by ID - raw SQL
  public async getArticleById(id: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, title, content, category, "isPublished", "createdAt", "updatedAt"
        FROM "Article" 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // List all users (for staff operations) - raw SQL
  public async listAllUsers() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id
        FROM "User" 
        ORDER BY "createdAt" DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Check if user exists by email - raw SQL
  public async getUserByEmail(email: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, email, name, role
        FROM "User" 
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } finally {
      client.release();
    }
  }

  // Get staff users (admin/responder) - raw SQL
  public async getStaffUsers() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id
        FROM "User" 
        WHERE role IN ('ADMIN', 'RESPONDER')
      `;
      
      const result = await client.query(query);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  // Graceful shutdown
  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      console.log('✅ Raw database pool closed gracefully');
    } catch (error) {
      console.error('❌ Error during raw database disconnect:', error);
    }
  }
}

// Export singleton instance
export const rawDb = RawDatabaseService.getInstance();