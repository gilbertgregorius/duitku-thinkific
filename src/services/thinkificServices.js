const axios = require('axios');
const logger = require('../utils/logger');

class ThinkificService {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.subdomain = config.subdomain;
    this.baseUrl = `https://${this.subdomain}.thinkific.com/api/v1`;
  }

  async createUser(userData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/users`,
        {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email
        },
        {
          headers: {
            'X-Auth-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 422) {
        // User already exists, fetch existing user
        return await this.getUserByEmail(userData.email);
      }
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users?query[email]=${encodeURIComponent(email)}`,
        {
          headers: {
            'X-Auth-API-Key': this.apiKey
          }
        }
      );

      return response.data.items?.[0] || null;
    } catch (error) {
      logger.error('Error fetching user by email:', error);
      throw error;
    }
  }

  async enrollUser(courseId, userId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/enrollments`,
        {
          user_id: userId,
          course_id: courseId,
          activated_at: new Date().toISOString()
        },
        {
          headers: {
            'X-Auth-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error enrolling user:', error);
      throw error;
    }
  }

  async getCourses() {
    try {
      const response = await axios.get(`${this.baseUrl}/courses`, {
        headers: {
          'X-Auth-API-Key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching courses:', error);
      throw error;
    }
  }
}

module.exports = ThinkificService;