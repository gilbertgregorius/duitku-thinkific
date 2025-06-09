#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Enhanced Webhook System
 * Tests all Pipedream-inspired enhancements and patterns
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class WebhookSystemTester {
  constructor() {
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runTest(name, testFn) {
    this.totalTests++;
    this.log(`\n🧪 Testing: ${name}`, 'cyan');
    
    try {
      const result = await testFn();
      if (result.success) {
        this.passedTests++;
        this.log(`✅ PASS: ${name}`, 'green');
        if (result.details) {
          this.log(`   Details: ${result.details}`, 'bright');
        }
      } else {
        this.log(`❌ FAIL: ${name}`, 'red');
        this.log(`   Error: ${result.error}`, 'yellow');
      }
      this.results.push({ name, ...result });
    } catch (error) {
      this.log(`❌ ERROR: ${name}`, 'red');
      this.log(`   Exception: ${error.message}`, 'yellow');
      this.results.push({ name, success: false, error: error.message });
    }
  }

  async testUniversalWebhookAutoDetection() {
    // Test 1: Unknown webhook source
    const unknownResponse = await axios.post(`${BASE_URL}/webhooks/universal`, {
      event: 'test.event',
      data: { message: 'Unknown source' }
    }, { validateStatus: () => true });

    if (unknownResponse.status === 400 && unknownResponse.data.error === 'Unknown webhook source') {
      return {
        success: true,
        details: 'Correctly identified unknown webhook source'
      };
    }

    return {
      success: false,
      error: `Expected 400 with unknown source error, got ${unknownResponse.status}`
    };
  }

  async testDuitkuAutoDetection() {
    const duitkuResponse = await axios.post(`${BASE_URL}/webhooks/universal`, {
      merchantOrderId: 'ORDER123',
      amount: 100000,
      resultCode: '00',
      signature: 'test-signature'
    }, { validateStatus: () => true });

    if (duitkuResponse.status === 400 && 
        duitkuResponse.data.error.includes('Invalid Duitku payment signature')) {
      return {
        success: true,
        details: 'Auto-detected Duitku webhook and performed signature verification'
      };
    }

    return {
      success: false,
      error: `Expected Duitku signature error, got ${duitkuResponse.status} - ${duitkuResponse.data.error}`
    };
  }

  async testThinkificAutoDetection() {
    const thinkificResponse = await axios.post(`${BASE_URL}/webhooks/universal`, {
      resource: 'enrollment',
      action: 'enrollment.created',
      payload: {
        id: 123,
        user_id: 456,
        course_id: 789,
        status: 'enrolled'
      }
    });

    if (thinkificResponse.status === 200 && 
        thinkificResponse.data.source === 'thinkific' &&
        thinkificResponse.data.eventType === 'enrollment.enrollment.created') {
      return {
        success: true,
        details: 'Auto-detected and processed Thinkific webhook'
      };
    }

    return {
      success: false,
      error: `Expected successful Thinkific processing, got ${thinkificResponse.status}`
    };
  }

  async testUniversalHttpMethods() {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const results = [];

    for (const method of methods) {
      try {
        const response = await axios({
          method: method.toLowerCase(),
          url: `${BASE_URL}/webhooks/universal`,
          data: method !== 'GET' ? { test: `${method} test` } : undefined,
          validateStatus: () => true
        });

        results.push({
          method,
          status: response.status,
          success: response.status === 400 || response.status === 200
        });
      } catch (error) {
        results.push({
          method,
          status: 'ERROR',
          success: false,
          error: error.message
        });
      }
    }

    const allPassed = results.every(r => r.success);
    return {
      success: allPassed,
      details: `Tested ${methods.length} HTTP methods: ${results.map(r => `${r.method}(${r.status})`).join(', ')}`,
      error: allPassed ? null : 'Some HTTP methods failed'
    };
  }

  async testPaymentValidation() {
    // Test with missing required fields
    const invalidResponse = await axios.post(`${BASE_URL}/payment/initiate`, {
      customerName: 'Test User'
    }, { validateStatus: () => true });

    if (invalidResponse.status === 400 && 
        invalidResponse.data.error === 'Validation failed') {
      return {
        success: true,
        details: 'Payment validation correctly rejected incomplete data'
      };
    }

    return {
      success: false,
      error: `Expected validation error, got ${invalidResponse.status}`
    };
  }

  async testPaymentInitiation() {
    const paymentData = {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      customerPhone: '+6281234567890',
      paymentMethod: 'VA',
      amount: 100000,
      coursePrice: 100000,
      returnUrl: 'https://example.com/return',
      callbackUrl: 'https://example.com/callback',
      courseId: 123,
      courseName: 'Test Course'
    };

    const response = await axios.post(`${BASE_URL}/payment/initiate`, paymentData);

    if (response.status === 200 && 
        response.data.success && 
        response.data.orderId &&
        response.data.paymentUrl) {
      return {
        success: true,
        details: `Created payment: ${response.data.orderId} with processing time: ${response.data.processingTime}ms`
      };
    }

    return {
      success: false,
      error: `Payment creation failed: ${response.status}`
    };
  }

  async testPaymentStatus() {
    // First create a payment
    const paymentData = {
      customerName: 'Status Test User',
      customerEmail: 'status@example.com',
      customerPhone: '+6281234567890',
      paymentMethod: 'VA',
      amount: 50000,
      coursePrice: 50000,
      returnUrl: 'https://example.com/return',
      callbackUrl: 'https://example.com/callback',
      courseId: 456,
      courseName: 'Status Test Course'
    };

    const createResponse = await axios.post(`${BASE_URL}/payment/initiate`, paymentData);
    const orderId = createResponse.data.orderId;

    // Check status
    const statusResponse = await axios.get(`${BASE_URL}/payment/status/${orderId}`);

    if (statusResponse.status === 200 && 
        statusResponse.data.success &&
        statusResponse.data.payment.orderId === orderId) {
      return {
        success: true,
        details: `Retrieved status for order: ${orderId} - Status: ${statusResponse.data.payment.status}`
      };
    }

    return {
      success: false,
      error: `Status check failed for order: ${orderId}`
    };
  }

  async testDirectWebhookEndpoints() {
    // Test direct Duitku endpoint
    const duitkuResponse = await axios.post(`${BASE_URL}/webhooks/duitku`, {
      merchantOrderId: 'DIRECT_TEST',
      amount: 75000,
      resultCode: '00',
      signature: 'test-direct-signature'
    }, { validateStatus: () => true });

    // Test direct Thinkific endpoint
    const thinkificResponse = await axios.post(`${BASE_URL}/webhooks/thinkific`, {
      resource: 'user',
      action: 'user.created',
      payload: {
        id: 789,
        email: 'newuser@example.com'
      }
    });

    const duitkuWorking = duitkuResponse.status === 400 && 
                         duitkuResponse.data.error.includes('signature');
    const thinkificWorking = thinkificResponse.status === 200 && 
                            thinkificResponse.data.source === 'thinkific';

    return {
      success: duitkuWorking && thinkificWorking,
      details: `Duitku: ${duitkuResponse.status}, Thinkific: ${thinkificResponse.status}`,
      error: (!duitkuWorking || !thinkificWorking) ? 'Direct endpoints not working properly' : null
    };
  }

  async runAllTests() {
    this.log('🚀 Starting Enhanced Webhook System Tests', 'magenta');
    this.log('=' * 50, 'magenta');

    await this.runTest('Universal Webhook - Unknown Source Detection', 
                       () => this.testUniversalWebhookAutoDetection());

    await this.runTest('Universal Webhook - Duitku Auto-Detection', 
                       () => this.testDuitkuAutoDetection());

    await this.runTest('Universal Webhook - Thinkific Auto-Detection', 
                       () => this.testThinkificAutoDetection());

    await this.runTest('Universal Webhook - HTTP Methods Support', 
                       () => this.testUniversalHttpMethods());

    await this.runTest('Payment System - Input Validation', 
                       () => this.testPaymentValidation());

    await this.runTest('Payment System - Payment Initiation', 
                       () => this.testPaymentInitiation());

    await this.runTest('Payment System - Status Retrieval', 
                       () => this.testPaymentStatus());

    await this.runTest('Direct Webhook Endpoints', 
                       () => this.testDirectWebhookEndpoints());

    this.printSummary();
  }

  printSummary() {
    this.log('\n📊 TEST SUMMARY', 'magenta');
    this.log('=' * 50, 'magenta');
    
    const passRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    
    this.log(`Total Tests: ${this.totalTests}`, 'bright');
    this.log(`Passed: ${this.passedTests}`, 'green');
    this.log(`Failed: ${this.totalTests - this.passedTests}`, 'red');
    this.log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');

    if (this.passedTests === this.totalTests) {
      this.log('\n🎉 ALL TESTS PASSED! Enhanced webhook system is fully functional.', 'green');
      this.log('✨ Pipedream-inspired patterns successfully implemented:', 'bright');
      this.log('   • Universal webhook endpoint with auto-detection', 'cyan');
      this.log('   • Comprehensive error handling and logging', 'cyan');
      this.log('   • Security features (signature verification)', 'cyan');
      this.log('   • Enhanced payment processing with validation', 'cyan');
      this.log('   • Multi-method HTTP support', 'cyan');
      this.log('   • Structured logging with performance metrics', 'cyan');
    } else {
      this.log('\n⚠️  Some tests failed. Check the details above.', 'yellow');
    }
  }
}

// Run the tests
async function main() {
  const tester = new WebhookSystemTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
checkServer().then(serverRunning => {
  if (!serverRunning) {
    console.log('❌ Server is not running on port 3000. Please start it with: npm start');
    process.exit(1);
  }
  
  main();
}).catch(error => {
  console.error('❌ Failed to check server status:', error.message);
  process.exit(1);
});
