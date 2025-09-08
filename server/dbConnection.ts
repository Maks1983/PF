import mariadb from 'mariadb';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

class DatabaseConnection {
  private pool: mariadb.Pool | null = null;
  private isInitialized = false;

  private getConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || '10.150.50.7',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'dev',
      password: process.env.DB_PASSWORD || 'devpassword',
      database: process.env.DB_NAME || 'personal_finance',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      timeout: parseInt(process.env.DB_TIMEOUT || '60000')
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const config = this.getConfig();
      
      console.log(`Connecting to MariaDB at ${config.host}:${config.port}/${config.database}`);
      
      this.pool = mariadb.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionLimit: config.connectionLimit,
        acquireTimeout: config.acquireTimeout,
        connectTimeout: config.timeout, // <-- changed here
        bigIntAsNumber: true,
        insertIdAsNumber: true,
        decimalAsNumber: true,
        supportBigNumbers: true
      });

      // Test the connection
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();

      console.log('MariaDB connection pool initialized successfully');
      
      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MariaDB connection:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConnection(): Promise<mariadb.PoolConnection> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      return await this.pool.getConnection();
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw new Error(`Failed to get database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const conn = await this.getConnection();
    try {
      const result = await conn.query(sql, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    } finally {
      conn.release();
    }
  }

  private async createTables(): Promise<void> {
    try {
      // Loans table
      await this.query(`
        CREATE TABLE IF NOT EXISTS loans (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type ENUM('mortgage', 'personal', 'auto', 'student', 'credit_card', 'other') NOT NULL,
          principal DECIMAL(15,2) NOT NULL,
          current_balance DECIMAL(15,2) NOT NULL,
          interest_rate DECIMAL(5,2) NOT NULL,
          monthly_payment DECIMAL(10,2) NOT NULL,
          fees DECIMAL(10,2) DEFAULT 0,
          start_date DATE NOT NULL,
          term_months INT NOT NULL,
          extra_payment DECIMAL(10,2) DEFAULT 0,
          color VARCHAR(7) DEFAULT '#1e40af',
          currency VARCHAR(3) DEFAULT 'USD',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_type (type),
          INDEX idx_current_balance (current_balance),
          INDEX idx_interest_rate (interest_rate)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Scenarios table (for future use)
      await this.query(`
        CREATE TABLE IF NOT EXISTS scenarios (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          extra_payment DECIMAL(10,2) DEFAULT 0,
          lump_sum DECIMAL(15,2) DEFAULT 0,
          strategy_type ENUM('avalanche', 'snowball', 'hybrid', 'avalanche_scrapes', 'snowball_scrapes', 'hybrid_scrapes') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Scheduled payments table (for future use)
      await this.query(`
        CREATE TABLE IF NOT EXISTS scheduled_payments (
          id VARCHAR(255) PRIMARY KEY,
          loan_id VARCHAR(255) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          day_of_month INT NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
          is_active BOOLEAN DEFAULT TRUE,
          start_date DATE NOT NULL,
          end_date DATE NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
          INDEX idx_loan_id (loan_id),
          INDEX idx_is_active (is_active),
          INDEX idx_day_of_month (day_of_month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Applied strategies table (for future use)
      await this.query(`
        CREATE TABLE IF NOT EXISTS applied_strategies (
          id VARCHAR(255) PRIMARY KEY,
          strategy_id VARCHAR(255) NOT NULL,
          strategy_name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          extra_payment DECIMAL(10,2) DEFAULT 0,
          lump_sum DECIMAL(15,2) DEFAULT 0,
          hybrid_weight INT DEFAULT 50,
          enable_scrapes BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_is_active (is_active),
          INDEX idx_applied_at (applied_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('Database tables created/verified successfully');
    } catch (error) {
      console.error('Failed to create database tables:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const conn = await this.getConnection();
      await conn.ping();
      conn.release();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      console.log('Database connection pool closed');
    }
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection;

// Helper function to ensure database is initialized
export const ensureDbInitialized = async (): Promise<void> => {
  await dbConnection.initialize();
};

// Export commonly used methods
export const query = (sql: string, params?: any[]) => dbConnection.query(sql, params);
export const healthCheck = () => dbConnection.healthCheck();
export const closeConnection = () => dbConnection.close();
