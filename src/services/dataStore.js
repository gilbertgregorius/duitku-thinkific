const { Pool } = require('pg');
const Redis = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

class DataStore {
  constructor() {
    // PostgreSQL connection
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.username,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Redis connection
    this.redis = Redis.createClient({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password
    });

    this.redis.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    this.redis.connect();
  }

  // Redis operations for caching and temporary storage
  async set(key, value, expireSeconds = 3600) {
    try {
      await this.redis.setEx(key, expireSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async has(key) {
    try {
      const exists = await this.redis.exists(key);
      return exists > 0;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  // Database operations
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
        paymentData.course_name,
        paymentData.course_description,
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

  // Queue operations (using Redis for simplicity)
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

module.exports = DataStore;