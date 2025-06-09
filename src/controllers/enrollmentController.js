const logger = require('../utils/logger');
const ThinkificService = require('../services/thinkificServices');
const DataStore = require('../services/dataStore');
const config = require('../config');

const thinkificService = new ThinkificService(config.thinkific);
const dataStore = new DataStore();

class EnrollmentController {
  constructor() {
    // Bind methods to maintain 'this' context
    this.processEnrollment = this.processEnrollment.bind(this);
    this.mapCourseNameToId = this.mapCourseNameToId.bind(this);
    this.enrollUser = this.enrollUser.bind(this);
  }

  // Process enrollment from payment success
  async processEnrollment(paymentData, customerData) {
    try {
      logger.info(`Processing enrollment for payment: ${paymentData.order_id}`);
      
      // Step 1: Create or get user in Thinkific
      const userData = {
        firstName: customerData.customerName.split(' ')[0],
        lastName: customerData.customerName.split(' ').slice(1).join(' ') || '',
        email: customerData.customerEmail
      };
      
      const thinkificUser = await thinkificService.createUser(userData);
      logger.info(`Thinkific user created/found: ${thinkificUser.id} for ${userData.email}`);
      
      // Step 2: Map course name to course ID (you'll need to implement course mapping)
      const courseId = await this.mapCourseNameToId(paymentData.course_name);
      if (!courseId) {
        throw new Error(`Course not found: ${paymentData.course_name}`);
      }
      
      // Step 3: Enroll user in course
      const enrollment = await thinkificService.enrollUser(courseId, thinkificUser.id);
      logger.info(`User enrolled: ${userData.email} -> Course ID ${courseId}`);
      
      // Step 4: Save enrollment to local database
      const enrollmentRecord = {
        userEmail: userData.email,
        userName: `${userData.firstName} ${userData.lastName}`,
        userId: thinkificUser.id,
        enrollmentId: enrollment.id,
        courseId: courseId,
        courseName: paymentData.course_name,
        activatedAt: enrollment.activated_at
      };
      
      await dataStore.saveEnrollment(enrollmentRecord);
      
      // Step 5: Update payment record with enrollment info
      await dataStore.updatePayment(paymentData.order_id, {
        status: 'completed'
      });
      
      logger.info(`Enrollment completed successfully for ${userData.email}`);
      return {
        success: true,
        enrollment: enrollmentRecord,
        thinkificUser,
        thinkificEnrollment: enrollment
      };
      
    } catch (error) {
      logger.error('Enrollment processing error:', error);
      throw error;
    }
  }
  
  // Map course names from payment to Thinkific course IDs
  async mapCourseNameToId(courseName) {
    // Course mapping - you should implement this based on your actual courses
    const courseMapping = {
      'Web Development Fundamentals': 123456, // Replace with actual Thinkific course IDs
      'Advanced JavaScript': 123457,
      'React Masterclass': 123458
    };
    
    // Try direct mapping first
    if (courseMapping[courseName]) {
      return courseMapping[courseName];
    }
    
    // If no direct match, try to fetch from Thinkific API
    try {
      const courses = await thinkificService.getCourses();
      const matchedCourse = courses.items?.find(course => 
        course.name.toLowerCase().includes(courseName.toLowerCase()) ||
        courseName.toLowerCase().includes(course.name.toLowerCase())
      );
      
      return matchedCourse?.id || null;
    } catch (error) {
      logger.error('Error fetching courses from Thinkific:', error);
      return null;
    }
  }
  
  // Manual enrollment endpoint (for testing)
  async enrollUser(req, res) {
    try {
      const { email, courseName, customerName } = req.body;
      
      if (!email || !courseName || !customerName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: email, courseName, customerName'
        });
      }
      
      // Create mock payment data for enrollment
      const mockPaymentData = {
        order_id: `MANUAL_${Date.now()}`,
        course_name: courseName,
        amount: 0,
        status: 'manual'
      };
      
      const customerData = {
        customerName,
        customerEmail: email
      };
      
      const result = await this.processEnrollment(mockPaymentData, customerData);
      
      res.json({
        success: true,
        message: 'User enrolled successfully',
        data: result
      });
      
    } catch (error) {
      logger.error('Manual enrollment error:', error);
      res.status(500).json({
        success: false,
        error: 'Enrollment failed',
        message: error.message
      });
    }
  }
}

module.exports = new EnrollmentController();
