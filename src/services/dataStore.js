const { Pool } = require('pg');
const Redis = require('redis');
const logger = require('../utils/logger');

class DataStore {
  constructor(dataStoreConfig = null) {
    // If no config provided, load it automatically
    if (!dataStoreConfig) {
      try {
        const appConfig = require('../config');
        dataStoreConfig = appConfig.dataStoreConfig;
      } catch (error) {
        throw new Error('DataStore configuration is required. Please provide a valid configuration object or ensure the config file is set up correctly.');
      }
    }
    
    this.config = dataStoreConfig;
    
    // PostgreSQL setup
    this.pool = new Pool({
      host: this.config.database.host,
      port: this.config.database.port,
      database: this.config.database.database,
      user: this.config.database.username,
      password: this.config.database.password,
      max: this.config.database.max,
      idleTimeoutMillis: this.config.database.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.database.connectionTimeoutMillis,
    });

    // Redis setup
    this.redis = Redis.createClient({
      url: this.config.getRedisUrl(),
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > this.config.retries) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.redis.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    this.redis.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis Client Reconnecting');
    });

    // Connect to Redis
    this.connectRedis();

    if (process.env.NODE_ENV === 'test') {
      logger.info('[service/dataStore] Config:', this.config.getDebugInfo());
    }
  }
  /////////////////////
  /// REDIS RELATED ///
  /////////////////////

  async connectRedis() {
    try {
      await this.redis.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
    }
  }

  async testConnections() {
    const results = {
      database: false,
      redis: false
    };

    // Test PostgreSQL connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      results.database = true;
      logger.info('Database connectivity test: PASSED');
    } catch (error) {
      logger.error('Database connectivity test: FAILED', error);
    }

    // Test Redis connection
    try {
      await this.redis.ping();
      results.redis = true;
      logger.info('Redis connectivity test: PASSED');
    } catch (error) {
      logger.error('Redis connectivity test: FAILED', error);
    }

    return results;
  }

  async close() {
    try {
      await this.redis.quit();
      await this.pool.end();
      logger.info('DataStore connections closed');
    } catch (error) {
      logger.error('Error closing DataStore connections:', error.message);
    }
  }

  async set(key, value, expireSeconds = 3600) {
    try {
      await this.redis.setEx(key, expireSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error:', error.message);
    }
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error.message);
      return null;
    }
  }

  async has(key) {
    try {
      const exists = await this.redis.exists(key);
      return exists > 0;
    } catch (error) {
      logger.error('Redis exists error:', error.message);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error.message);
    }
  }


  ////////////////////////
  /// DATABASE RELATED ///
  ////////////////////////


  ///// PAYMENT TABLE /////
  async savePayment(paymentData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO payments (
          order_id, course_name, course_description, amount, payment_method, payment_url, 
          va_number, qr_string, duitku_reference, expires_at, status,
          customer_name, customer_email, customer_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;
      
      const values = [
        paymentData.order_id,
        paymentData.product_name,
        paymentData.product_description,
        paymentData.amount,
        paymentData.payment_method,
        paymentData.payment_url,
        paymentData.va_number,
        paymentData.qr_string,
        paymentData.duitku_reference,
        paymentData.expires_at,
        paymentData.status || 'pending',
        paymentData.customer_name,
        paymentData.customer_email,
        paymentData.customer_phone
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getPayment(orderId) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM payments WHERE order_id = $1';
      const result = await client.query(query, [orderId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updatePayment(orderId, updateData) {
    const client = await this.pool.connect();
    try {
      const setClause = Object.keys(updateData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE payments 
        SET ${setClause}, updated_at = NOW()
        WHERE order_id = $1
        RETURNING *
      `;
      
      const values = [orderId, ...Object.values(updateData)];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getPaymentByOrderId(orderId) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM payments WHERE order_id = $1';
      const result = await client.query(query, [orderId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getPaymentByUserEmail(email) {
    const client = await this.pool.connect();
    try {
      // Since payments table doesn't have user_email, we need to join with users
      // For now, return null and we'll use order_id based lookup
      return null;
    } finally {
      client.release();
    }
  }

  async storePayment(paymentData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO payments (
          order_id, product_name, product_description, amount, payment_method, 
          status, customer_name, customer_email, customer_phone, 
          duitku_reference, created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;
      
      const values = [
        paymentData.reference,
        paymentData.product_name || 'Multiple Products',
        paymentData.product_description || 'Product purchase from Thinkific',
        paymentData.amount,
        paymentData.payment_method,
        paymentData.status,
        paymentData.customer_name,
        paymentData.customer_email,
        paymentData.customer_phone,
        paymentData.reference,
        paymentData.created_at || new Date(),
        paymentData.metadata
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  ///// ENROLLMENT TABLE /////
  async saveEnrollment(enrollmentData) {
    const client = await this.pool.connect();
    try {
      // First, find the user
      let user = await this.findUserByEmail(enrollmentData.userEmail);
      
      if (!user) {
        // Create user if doesn't exist
        const userQuery = `
          INSERT INTO users (email, first_name, last_name, thinkific_user_id, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING id
        `;
        
        const nameParts = enrollmentData.userName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const userResult = await client.query(userQuery, [
          enrollmentData.userEmail,
          firstName,
          lastName,
          enrollmentData.userId
        ]);
        
        user = userResult.rows[0];
      }

      // Find payment record
      const payment = await this.getPaymentByUserEmail(enrollmentData.userEmail);

      // Create enrollment record
      const enrollmentQuery = `
        INSERT INTO enrollments (
          user_id, payment_id, thinkific_enrollment_id, course_id, course_name,
          status, enrolled_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

      const result = await client.query(enrollmentQuery, [
        user.id,
        payment?.id,
        enrollmentData.enrollmentId,
        enrollmentData.courseId,
        enrollmentData.courseName,
        'active',
        enrollmentData.activatedAt
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getEnrollmentsByEmail(email) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT e.*, u.email as user_email, u.first_name, u.last_name
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        WHERE u.email = $1
        ORDER BY e.created_at DESC
      `;
      const result = await client.query(query, [email]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async storeEnrollment(enrollmentData) {
    const client = await this.pool.connect();
    try {
      // First, find or create user
      let user = await this.findUserByEmail(enrollmentData.customer_email);
      
      if (!user) {
        const userQuery = `
          INSERT INTO users (email, first_name, last_name, thinkific_user_id, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING *
        `;
        
        const nameParts = (enrollmentData.customer_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const userResult = await client.query(userQuery, [
          enrollmentData.customer_email,
          firstName,
          lastName,
          enrollmentData.thinkific_user_id
        ]);
        
        user = userResult.rows[0];
      }

      // Find payment record by reference
      const paymentQuery = 'SELECT * FROM payments WHERE order_id = $1 OR duitku_reference = $1';
      const paymentResult = await client.query(paymentQuery, [enrollmentData.payment_reference]);
      const payment = paymentResult.rows[0];

      // Create enrollment record
      const enrollmentQuery = `
        INSERT INTO enrollments (
          user_id, payment_id, thinkific_enrollment_id, course_id, course_name,
          status, enrolled_at, created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
        RETURNING *
      `;

      const result = await client.query(enrollmentQuery, [
        user.id,
        payment?.id,
        enrollmentData.thinkific_enrollment_id,
        enrollmentData.thinkific_course_id,
        enrollmentData.course_name,
        'active',
        enrollmentData.enrollment_date || new Date(),
        enrollmentData.metadata
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  ///// USERS TABLE /////
  async findUserByEmail(email) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async storeUserSignup(userData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO user_signups (
          thinkific_user_id, email, first_name, last_name, phone, 
          signup_date, source, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (email) DO UPDATE SET
          thinkific_user_id = EXCLUDED.thinkific_user_id,
          signup_date = EXCLUDED.signup_date,
          updated_at = NOW()
        RETURNING *
      `;
      
      const values = [
        userData.thinkific_user_id,
        userData.email,
        userData.first_name,
        userData.last_name,
        userData.phone,
        userData.signup_date,
        userData.source
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      // Table might not exist yet, that's okay
      logger.warn('Could not store user signup (table may not exist):', error.message);
      return null;
    } finally {
      client.release();
    }
  }

  ///// WEBHOOK LOGGING /////
  async logWebhook(webhookData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO webhook_logs (source, event_type, payload, processed, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;
      
      const result = await client.query(query, [
        webhookData.source,
        webhookData.eventType,
        JSON.stringify(webhookData.payload),
        webhookData.processed
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }


  ////// QUEUE MANAGEMENT /////
  async addToQueue(queueName, data) {
    try {
      await this.redis.rPush(`queue:${queueName}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      }));
    } catch (error) {
      logger.error('Queue add error:', error);
    }
  }

  async getFromQueue(queueName) {
    try {
      const item = await this.redis.lPop(`queue:${queueName}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      logger.error('Queue get error:', error);
      return null;
    }
  }
}

module.exports = new DataStore();