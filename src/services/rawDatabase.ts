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