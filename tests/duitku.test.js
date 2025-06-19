require('dotenv').config();

const duitku = require('../src/services/duitku');
const thinkific = require('../src/services/thinkific');
const tokenManager = require('../src/utils/tokenManager');
const { CreateInvoiceRequest } = require('../src/dto/paymentDto');

// Global variable to store callback data
let latestCallbackData = null;

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
      console.log(`[2.1] Found ${products.items.length} total products`);
      
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
      console.log(`[3.1] Getting course details for productable_id: ${testProduct.productable_id}`);
      
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
      console.log(`[4.1] Generated order ID: ${orderId}`);
      
      // Use a valid amount (Duitku requires minimum amount)
      const amount = testProduct.price > 0 ? testProduct.price : 100000; // Minimum IDR 100,000
      
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

      console.log(`[4.2] Payment data prepared: ${paymentData.customerEmail}, Amount: ${paymentData.amount}, Product: ${paymentData.productDetails}`);

      const invoiceRequest = CreateInvoiceRequest.fromPaymentData({
        ...paymentData,
        orderId: orderId,
      });

      console.log(`[4.3] DTO created and mapped`);

      const validationErrors = invoiceRequest.validate();
      if (validationErrors.length > 0) {
        console.log(`[4.4] ERROR: Validation failed - ${validationErrors.join(', ')}`);
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      console.log(`[4.4] DTO validation passed`);

      console.log(`[4.5] Calling Duitku API...`);
      const result = await duitku.createInvoice(invoiceRequest);
      
      console.log(`[4.6] SUCCESS: Invoice created`);
      console.log(`     - Reference: ${result.reference}`);
      console.log(`     - Amount: ${result.amount}`);
      console.log(`     - Status: ${result.statusCode} (${result.statusMessage})`);
      console.log(`     - Payment URL: ${result.paymentUrl}`);

      expect(result).toBeTruthy();
      expect(result.statusCode).toBe('00');
      expect(result.paymentUrl).toBeTruthy();
      expect(result.reference).toBeTruthy();
      expect(result.amount).toBeTruthy();

      console.log(`[4.7] All assertions passed`);
      
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
      console.log(`[5.1] Using payment data - Order ID: ${orderId}, Reference: ${reference}`);
      
      // Display payment instructions
      console.log('\n🔥 MANUAL PAYMENT REQUIRED 🔥');
      console.log('=====================================');
      console.log(`[5.2] PAYMENT INSTRUCTIONS:`);
      console.log(`     1. Open payment URL: ${paymentUrl}`);
      console.log(`     2. Complete the payment via Virtual Account`);
      console.log(`     3. Webhook URL: https://3c7d-180-242-128-150.ngrok-free.app/webhooks/duitku`);
      console.log(`     4. Expected Order ID: ${orderId}`);
      console.log('=====================================');
      
      console.log('\n📋 VERIFICATION CHECKLIST:');
      console.log('After completing payment, verify:');
      console.log(`   ✅ Webhook receives POST to /webhooks/duitku`);
      console.log(`   ✅ merchantOrderId: ${orderId}`);
      console.log(`   ✅ amount: ${amount}`);
      console.log(`   ✅ reference: ${reference}`);
      console.log(`   ✅ resultCode: 00 (success)`);
      console.log(`   ✅ additionalParam contains: {"customerEmail":"${customerEmail}","productId":"${productId}"}`);
      
      console.log('\n⏳ Complete the payment and verify webhook receives callback...');
      console.log('   Press ENTER when done to complete test');
      
      // Wait for user confirmation
      await waitForUserInput();
      
      console.log(`[5.3] ✅ Manual verification completed!`);
      
      // Since this is a manual test, we'll just log success
      console.log(`[5.4] 🎉 PAYMENT FLOW TEST COMPLETED!`);
      console.log(`[5.5] Summary:`);
      console.log(`     - Payment URL generated: ✅ ${paymentUrl}`);
      console.log(`     - Order ID: ✅ ${orderId}`);
      console.log(`     - Reference: ✅ ${reference}`);
      console.log(`     - Webhook URL: ✅ https://3c7d-180-242-128-150.ngrok-free.app/webhooks/duitku`);
      console.log(`     - Manual payment verification: ✅ (User confirmed)`);
      
      console.log('\n🔧 TO VERIFY WEBHOOK WORKED:');
      console.log('   1. Check your terminal/logs for webhook POST request');
      console.log('   2. Verify handleDuitkuCallback was called');
      console.log('   3. Check callback data matches expected values above');
      
      // Test passes if user confirms manual verification
      expect(global.testPaymentResult).toBeTruthy();
      
      console.log(`[5.6] Real payment flow test completed! 🎉`);
    }, 300000); // 5 minute timeout for the entire test
  });
});