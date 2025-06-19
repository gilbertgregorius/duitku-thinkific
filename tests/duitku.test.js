require('dotenv').config();

const duitku = require('../src/services/duitku');
const thinkific = require('../src/services/thinkific');
const tokenManager = require('../src/utils/tokenManager');
const { CreateInvoiceRequest } = require('../src/dto/paymentDto');

// Global variable to store callback data
let receivedCallbacks = [];

// Simple webhook interceptor
function setupWebhookInterceptor() {
  const webhookController = require('../src/controllers/webhook');
  const originalHandler = webhookController.handleDuitkuCallback;
  
  // Override the webhook handler to capture callbacks
  webhookController.handleDuitkuCallback = async function(req, res) {
    const callbackData = req.body;
    console.log(`[WEBHOOK] 🎯 CALLBACK INTERCEPTED: Order ${callbackData.merchantOrderId}, Result ${callbackData.resultCode}`);
    
    // Store the callback
    receivedCallbacks.push({
      timestamp: new Date().toISOString(),
      data: callbackData
    });
    
    // Call original handler
    return await originalHandler.call(this, req, res);
  };
  
  return () => {
    // Restore original handler
    webhookController.handleDuitkuCallback = originalHandler;
  };
}

// Function to wait for a specific callback
function waitForCallback(expectedOrderId, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      // Check if we have the callback
      const callback = receivedCallbacks.find(cb => 
        cb.data.merchantOrderId === expectedOrderId
      );
      
      if (callback) {
        clearInterval(checkInterval);
        console.log(`[WEBHOOK] ✅ Found callback for order ${expectedOrderId}`);
        resolve(callback.data);
        return;
      }
      
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        console.log(`[WEBHOOK] ⏰ Timeout waiting for callback for order ${expectedOrderId}`);
        resolve(null);
      }
    }, 1000); // Check every second
  });
}

// Helper function to wait for user input
function waitForUserInput() {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (key) => {
      // Check if Enter key was pressed (keycode 13 or 10)
      if (key[0] === 13 || key[0] === 10) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      } else {
        // If not Enter, wait again
        waitForUserInput().then(resolve);
      }
    });
  });
}

describe('Duitku Payment Integration', () => {
  let accessToken;
  let testUser;
  let testProduct;
  let testCourse;

  beforeAll(async () => {
    console.log('\n=== PHASE 0: INITIALIZATION ===');
    
    // Clear any previous test data
    global.testPaymentResult = null;
    receivedCallbacks = [];
    
    accessToken = await tokenManager.getToken();
    console.log(`[0.1] Access token: ${accessToken ? 'Available' : 'Not available'}`);
    
    if (!accessToken) {
      throw new Error('No access token available. Please complete OAuth flow first.');
    }
  });

  describe('Setup Test Data', () => {
    it('should get user by email test@example.com', async () => {
      console.log('\n=== PHASE 1: GET TEST USER ===');
      console.log('[1.1] Searching for user: test@example.com');
      
      testUser = await thinkific.getUserByEmail(accessToken, 'test@example.com');
      
      if (!testUser) {
        console.log('[1.2] ERROR: User not found');
        console.log('[1.3] ACTION: Create user with email test@example.com in Thinkific admin');
      } else {
        console.log(`[1.2] SUCCESS: User found - ID: ${testUser.id}, Name: ${testUser.first_name} ${testUser.last_name}`);
      }
      
      expect(testUser).toBeTruthy();
    });

    it('should get a product with productable_type="Course"', async () => {
      console.log('\n=== PHASE 2: GET COURSE PRODUCT ===');
      
      const products = await thinkific.getProducts(accessToken);
      
      testProduct = products.items.find(product => 
        product.productable_type === 'Course' && product.productable_id
      );
      
      if (!testProduct) {
        console.log('[2.2] ERROR: No course products found');
        console.log('[2.3] Available products:');
        products.items.forEach((product, index) => {
          console.log(`     ${index + 1}. ${product.name} (Type: ${product.productable_type})`);
        });
        throw new Error('No course products available for testing');
      }
      
      console.log(`[2.2] SUCCESS: Course product selected - "${testProduct.name}" (ID: ${testProduct.id}, Price: ${testProduct.price})`);
      
      expect(testProduct).toBeTruthy();
      expect(testProduct.productable_type).toBe('Course');
    });

    it('should get course details from productable_id', async () => {
      console.log('\n=== PHASE 3: GET COURSE DETAILS ===');
      
      testCourse = await thinkific.getCourse(accessToken, testProduct.productable_id);
      
      console.log(`[3.2] SUCCESS: Course loaded - "${testCourse.name}" (ID: ${testCourse.id})`);
      
      expect(testCourse).toBeTruthy();
      expect(testCourse.id).toBe(testProduct.productable_id);
    });
  });

  describe('Payment Creation', () => {
    it('should create payment invoice with course data', async () => {
      console.log('\n=== PHASE 4: CREATE PAYMENT INVOICE ===');
      
      const orderId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amount = testProduct.price > 0 ? testProduct.price : 100000; // Minimum IDR 100,000
      
      console.log(`[4.1] Generated order ID: ${orderId}`);
      console.log(`[4.2] Payment amount: ${amount}`);
      console.log(`[4.3] Customer: ${testUser.email}`);
      console.log(`[4.4] Product: ${testProduct.name} (ID: ${testProduct.id})`);
      
      const paymentData = {
        customerEmail: testUser.email,
        customerName: `${testUser.first_name} ${testUser.last_name}`,
        productDetails: testProduct.name,
        productDescription: testCourse.description || testCourse.name,
        amount: amount,
        paymentMethod: 'VA',
        callbackUrl: 'https://3c7d-180-242-128-150.ngrok-free.app/webhooks/duitku',
        returnUrl: 'https://3c7d-180-242-128-150.ngrok-free.app/payment/success',
        customerPhone: '08123456789',
        itemDetails: [{
          name: testCourse.name,
          price: amount, // Use the same valid amount
          quantity: 1
        }],
        additionalParam: JSON.stringify({
          customerEmail: testUser.email,
          productId: testProduct.id.toString(),
        })
      };

      const invoiceRequest = CreateInvoiceRequest.fromPaymentData({
        ...paymentData,
        orderId: orderId,
      });


      const validationErrors = invoiceRequest.validate();
      if (validationErrors.length > 0) {
        console.log(`[4.4] ERROR: Validation failed - ${validationErrors.join(', ')}`);
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }


      const result = await duitku.createInvoice(invoiceRequest);
      
      console.log(`[4.6] SUCCESS: Invoice created`);

      expect(result).toBeTruthy();
      expect(result.statusCode).toBe('00');
      expect(result.paymentUrl).toBeTruthy();
      expect(result.reference).toBeTruthy();
      expect(result.amount).toBeTruthy();

      
      // Store the result for callback testing
      global.testPaymentResult = {
        orderId: orderId,
        reference: result.reference,
        amount: amount,
        customerEmail: testUser.email,
        productId: testProduct.id.toString(),
        paymentUrl: result.paymentUrl
      };
    });
  });

  describe('Real Payment Flow', () => {
    it('should handle real payment and callback flow', async () => {
      console.log('\n=== PHASE 5: REAL PAYMENT FLOW ===');
      
      if (!global.testPaymentResult) {
        throw new Error('Payment result not available for callback testing');
      }
      
      const { orderId, reference, amount, customerEmail, productId, paymentUrl } = global.testPaymentResult;
      
      console.log(`[5.1] 🎯 CURRENT TEST DATA:`);
      console.log(`     - Order ID: ${orderId}`);
      console.log(`     - Reference: ${reference}`);
      console.log(`     - Amount: ${amount}`);
      console.log(`     - Payment URL: ${paymentUrl}`);
      
      // Clear previous callbacks
      receivedCallbacks = [];
      
      // Set up webhook interceptor
      console.log(`[5.2] 🔧 Setting up webhook interceptor...`);
      const restoreWebhook = setupWebhookInterceptor();
      
      console.log(`[5.3] 🔥 MANUAL PAYMENT REQUIRED:`);
      console.log(`     1. Open: ${paymentUrl}`);
      console.log(`     2. Complete payment via Virtual Account`);
      console.log(`     3. Wait for webhook callback`);
      console.log(`     4. Press ENTER when you see callback intercepted message above`);
      
      // Wait for user to complete payment
      await waitForUserInput();
      
      console.log(`[5.4] 🕒 Checking for received callbacks...`);
      
      // Wait for the callback (with 30 second timeout after user presses ENTER)
      const callbackData = await waitForCallback(orderId, 30000);
      
      // Restore original webhook
      restoreWebhook();
      
      if (callbackData) {
        console.log(`[5.5] 🎉 REAL CALLBACK RECEIVED AND VERIFIED!`);
        console.log(`[5.6] CALLBACK DETAILS:`);
        console.log(`     - merchantOrderId: ${callbackData.merchantOrderId}`);
        console.log(`     - amount: ${callbackData.amount}`);
        console.log(`     - resultCode: ${callbackData.resultCode}`);
        console.log(`     - reference: ${callbackData.reference}`);
        
        // Parse additionalParam
        let additionalData = {};
        try {
          additionalData = JSON.parse(callbackData.additionalParam || '{}');
        } catch (error) {
          console.log(`     - additionalParam parse error: ${error.message}`);
        }
        
        console.log(`[5.7] � VERIFICATION:`);
        const orderMatch = callbackData.merchantOrderId === orderId;
        const amountMatch = callbackData.amount === amount.toString();
        const referenceMatch = callbackData.reference === reference;
        const successMatch = callbackData.resultCode === '00';
        
        console.log(`     - Order ID: ${orderMatch ? '✅' : '❌'} (${callbackData.merchantOrderId} vs ${orderId})`);
        console.log(`     - Amount: ${amountMatch ? '✅' : '❌'} (${callbackData.amount} vs ${amount})`);
        console.log(`     - Reference: ${referenceMatch ? '✅' : '❌'} (${callbackData.reference} vs ${reference})`);
        console.log(`     - Payment Success: ${successMatch ? '✅' : '❌'} (${callbackData.resultCode})`);
        console.log(`     - Customer Email: ${additionalData.customerEmail === customerEmail ? '✅' : '❌'}`);
        console.log(`     - Product ID: ${additionalData.productId === productId ? '✅' : '❌'}`);
        
        // Assertions
        expect(callbackData.merchantOrderId).toBe(orderId);
        expect(callbackData.amount).toBe(amount.toString());
        expect(callbackData.reference).toBe(reference);
        expect(callbackData.resultCode).toBe('00');
        
        console.log(`[5.8] ✅ ALL VERIFICATIONS PASSED!`);
        
      } else {
        console.log(`[5.5] ❌ NO CALLBACK RECEIVED!`);
        console.log(`[5.6] Possible reasons:`);
        console.log(`     - Payment was not completed`);
        console.log(`     - Webhook URL not accessible (check ngrok)`);
        console.log(`     - Duitku couldn't send callback`);
        console.log(`     - Wrong webhook endpoint`);
        
        console.log(`[5.7] Received callbacks count: ${receivedCallbacks.length}`);
        if (receivedCallbacks.length > 0) {
          console.log(`[5.8] Recent callbacks:`);
          receivedCallbacks.forEach((cb, i) => {
            console.log(`     ${i+1}. Order: ${cb.data.merchantOrderId}, Result: ${cb.data.resultCode}, Time: ${cb.timestamp}`);
          });
        }
        
        throw new Error(`No callback received for order ${orderId}`);
      }
      
      console.log(`[5.9] 🎉 REAL PAYMENT TEST COMPLETED SUCCESSFULLY!`);
    }, 300000); // 5 minute timeout
  });
});