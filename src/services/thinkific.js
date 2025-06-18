const axios = require('axios');
const logger = require('../utils/logger');

class Thinkific {
  constructor(config = null) {
    if (!config) {
      try {
        const appConfig = require('../config');
        config = appConfig.thinkificConfig;
      } catch (error) {
        throw new Error('ThinkificService requires a configuration object or valid config file');
      }
    }
    
    this.apiKey = config.apiKey;
    this.subdomain = config.subdomain;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.webhookPath = config.webhookPath;
    this.webhookUrl = config.getWebhookUrl();

    if (config.getNodeEnv() !== 'test') {
      config.validate();
    }
    
    if (config.getNodeEnv() === 'test') {
      logger.info('[service/thinkific] Config:', {
        apiKey: this.apiKey ? 'SET' : 'NOT_SET',
        subdomain: this.subdomain || 'NOT_SET',
      });
      if (!this.apiKey) {
        logger.warn('[service/thinkific] API key not configured');
      }
    }
    
  }

  ///////////////////////
  /// HELPER FUNCTION ///
  ///////////////////////
  createHeaders(accessToken) {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'DuitkuThinkific/1.0.0',
      'Authorization': `Bearer ${accessToken}`
    };
  }

  ////////////////////
  /// USERS ENTITY ///
  ////////////////////
  
  async createUser(accessToken, userData) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.post(
        `${this.baseUrl}/users`,
        {
          first_name: userData.first_name || userData.firstName || 'Test',
          last_name: userData.last_name || userData.lastName || 'User',
          email: userData.email
        },
        {
          headers: headers
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 422) {
        // User already exists, try to get by email using OAuth
        return await this.getUserByEmail(accessToken, userData.email);
      }
      logger.error('[service/thinkific] Error creating user with OAuth:', error);
      throw error;
    }
  }

  async getUserByEmail(accessToken, email) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users?query[email]=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'DuitkuThinkific/1.0.0'
          }
        }
      );

      return response.data.items?.[0] || null;
    } catch (error) {
      logger.error('[service/thinkific] Error fetching user by email with OAuth:', error);
      throw error;
    }
  }

  async getUser(userId, accessToken) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${userId}`,
        {headers: this.createHeaders(accessToken)}
      );
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting user by ID:', error);
      throw error;
    }
  }

  async getUsers(accessToken, params = {}) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(
        `${this.baseUrl}/users`,
        {
          params: params,
          headers: headers
        }
      );
      logger.info('[service/thinkific] Fetched users:', {
        count: response.data.items?.length
      });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting users:', error);
      throw error;
    }
  }

  async getUsersWithoutAuth(params = {}) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users`,
        {
          params: params,
          headers: {
            'X-Auth-Api-Key': this.apiKey,
            'X-Auth-Subdomain': this.subdomain,
            'Content-Type': 'application/json',
          }
        }
      );
      logger.info('[service/thinkific] Fetched users:', {
        count: response.data.items?.length
      });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting users:', error);
      throw error;
    }
  }


  //////////////////////////
  /// ENROLLMENTS ENTITY ///
  //////////////////////////
  //
  //
  // Note: Only called upon user purchasing with
  // {productable_type: "course"}


  async getEnrollments(accessToken, params = {}) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(
        `${this.baseUrl}/enrollments`,
        {
          params: params,
          headers: headers
        }
      );
      logger.info('[service/thinkific] Fetched enrollments:', { 
        count: response.data.items?.length 
      });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting enrollments:', error);
      throw error;
    }
  }

  async getEnrollment(accessToken, enrollmentId) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(
        `${this.baseUrl}/enrollments/${enrollmentId}`,
        {headers: headers}
      );
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting enrollment:', error);
      throw error;
    }
  }

  async createEnrollment(accessToken, enrollmentData) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.post(
        `${this.baseUrl}/enrollments`,
        {
          course_id: enrollmentData.course_id,
          user_id: enrollmentData.user_id,
          activated_at: enrollmentData.activated_at || new Date().toISOString(),
          expiry_date: enrollmentData.expiry_date
        },
        {headers: headers}
      );
      logger.info('[service/thinkific] Enrollment created successfully:', {
        enrollmentId: response.data.id,
        userId: response.data.user_id,
        courseId: response.data.course_id
      });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error creating enrollment:', error);
      throw error;
    }
  }

  async updateEnrollment(accessToken, enrollmentId, updateData) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.put(
        `${this.baseUrl}/enrollments/${enrollmentId}`,
        {
          activated_at: updateData.activated_at,
          expiry_date: updateData.expiry_date
        },
        {headers: headers}
      );
      logger.info('[service/thinkific] Enrollment updated successfully:', {
        enrollmentId: enrollmentId,
        updateData: updateData
      });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error updating enrollment:', error);
      throw error;
    }
  }

  async deleteEnrollment(accessToken, enrollmentId) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.delete(
        `${this.baseUrl}/enrollments/${enrollmentId}`,
        {headers: headers}
      );
      logger.info('[service/thinkific] Enrollment deleted successfully:', {
        enrollmentId: enrollmentId
      });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error deleting enrollment:', error);
      throw error;
    }
  }


  //////////////////////
  /// COURSES ENTITY ///
  //////////////////////

  async getCourses(accessToken) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(`${this.baseUrl}/courses`, { headers: headers });
      logger.info('[service/thinkific] Fetched courses:', { count: response.data.items?.length });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error fetching courses:', error);
      throw error;
    }
  }

  async getCourse(accessToken, courseId) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(`${this.baseUrl}/courses/${courseId}`, { headers: headers });
      logger.info('[service/thinkific] Fetched course by ID:', { courseId, courseName: response.data.name });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error fetching course:', error);
      throw error;
    }
  }

  /////////////////////////////
  /// EXTERNAL ORDER ENTITY ///
  /////////////////////////////

  async createExternalOrder({ accessToken, productId, amount, orderId, userId }) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.post(
        `${this.baseUrl}/external_orders`,
        {
          payment_provider: "Duitku",
          user_id: userId,
          product_id: productId,
          order_type: "one-time",
          transaction: {
            amount: amount,
            currency: "IDR",
            reference: orderId,
            action: "purchase"
          }
        },
        {
          headers: headers
        }
      );

      logger.info('External order created successfully:', {
        orderId: response.data.id,
        userId: response.data.user_id,
        productId: response.data.product_id
      });
      
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error creating external order:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  ///////////////////////
  /// PRODUCTS ENTITY ///
  ///////////////////////

  async getProducts(accessToken) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(`${this.baseUrl}/products`, { headers: headers });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting products:', {
        message: error.message,
        statusText: error.response?.statusText,
      });
      throw error;
    }
  }

  async getProduct(accessToken, productId) {
    try {
      const headers = this.createHeaders(accessToken);
      const response = await axios.get(`${this.baseUrl}/products/${productId}`, { headers: headers });
      return response.data;
    } catch (error) {
      logger.error('[service/thinkific] Error getting product:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw error;
    }
  }


  ///////////////////////
  /// LAYER 2 METHODS ///
  ///////////////////////
  async findCoursefromProducts(accessToken, courseId) {
    try {
      const products = await this.getProducts(accessToken);
      
      // Look for product where productable_id matches courseId and productable_type is "Course"
      const matchingProduct = products.items.find(product => 
        product.productable_type === 'Course' && 
        product.productable_id === parseInt(courseId)
      );
      
      if (matchingProduct) {
        logger.info('Found product for course via productable_id:', { 
          courseId, 
          productId: matchingProduct.id, 
          productName: matchingProduct.name 
        });
        return matchingProduct;
      }
      
      // Fallback: Look for product where course_ids contains the courseId (if this field exists)
      const fallbackProduct = products.items.find(product => 
        product.course_ids && product.course_ids.includes(parseInt(courseId))
      );
      
      if (fallbackProduct) {
        logger.info('Found product for course via course_ids:', { 
          courseId, 
          productId: fallbackProduct.id, 
          productName: fallbackProduct.name 
        });
        return fallbackProduct;
      }
      
      logger.warn('[service/thinkific] No product found for course:', { courseId, totalProducts: products.items.length });
      return null;
      
    } catch (error) {
      logger.error('[service/thinkific] Error finding product for course:', error.message);
      return null;
    }
  }

  async isProductACrouse(accessToken, productId) {
    try {
      const product = await this.getProduct(accessToken, productId);
      
      if (!product) {
        logger.warn('Product not found:', { productId });
        return [];
      }

      // If productable_type is "Course", get the course ID from productable_id
      if (product.productable_type === 'Course' && product.productable_id) {
        logger.info('[service/thinkific] Found courses for product:', { 
          productId, 
          courseIds,
          productName: product.name 
        });
        return product.productable_id;
      }

    } catch (error) {
      logger.error('[service/thinkific] Failed to find courses for product:', { 
        productId, 
        error: error.message 
      });
      return [];
    }
  }

  async enrollUserInProduct(userId, productId, accessToken) {
    try {
      const courseId = await this.isProductACrouse(accessToken, productId);

      if (!courseId) {
        throw new Error(`No courses found for product ID: ${productId}`);
      }

      logger.info('[service/thinkific] Enrolling user in product via course:', { 
        userId, 
        productId, 
        courseId 
      });
      // TODO: access token not handled
      return await this.createEnrollment(userId, courseId);
    } catch (error) {
      logger.error('[service/thinkific] Failed to enroll user in product:', { 
        userId, 
        productId, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new Thinkific();