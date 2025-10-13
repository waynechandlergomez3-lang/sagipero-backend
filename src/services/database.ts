import { PrismaClient } from '../generated/prisma';

// Centralized database service with connection health management
class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: ['error'],
      errorFormat: 'minimal'
    });

    // Initialize connection
    this.initialize();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initialize() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connection initialized');
    } catch (error) {
      console.error('❌ Database connection failed during initialization:', error);
    }
  }

  // Connection health check with automatic reconnection
  private async ensureHealthyConnection(): Promise<PrismaClient> {
    const now = Date.now();
    
    // Skip health check if recently performed
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return this.prisma;
    }
    
    try {
      // Quick health check
      await this.prisma.$queryRaw`SELECT 1`;
      this.lastHealthCheck = now;
      return this.prisma;
    } catch (error) {
      console.warn('🔄 Database connection issue detected, attempting reconnection...');
      
      try {
        // Disconnect and reconnect
        await this.prisma.$disconnect();
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;
        
        this.lastHealthCheck = now;
        console.log('✅ Database reconnection successful');
        return this.prisma;
      } catch (reconnectError) {
        console.error('❌ Database reconnection failed:', reconnectError);
        throw reconnectError;
      }
    }
  }

  // Main method for getting a healthy Prisma client
  public async getClient(): Promise<PrismaClient> {
    return await this.ensureHealthyConnection();
  }

  // Method for critical operations with retry logic
  public async withRetry<T>(operation: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.getClient();
        return await operation(client);
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('prepared statement') && attempt < maxRetries) {
          console.warn(`🔄 Prepared statement error (attempt ${attempt}/${maxRetries}), retrying...`);
          
          // Force reconnection on prepared statement errors
          try {
            await this.prisma.$disconnect();
            await this.prisma.$connect();
          } catch (reconnectError) {
            console.warn('Reconnection failed during retry:', reconnectError);
          }
          
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        
        // Non-retryable error or max retries reached
        throw error;
      }
    }
    
    throw lastError;
  }

  // Graceful shutdown
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database connection closed gracefully');
    } catch (error) {
      console.error('❌ Error during database disconnect:', error);
    }
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance();

// For backward compatibility, export a direct client getter
export const getPrismaClient = () => db.getClient();