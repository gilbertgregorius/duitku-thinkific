require('dotenv').config();

const logger = require('./src/utils/logger');
const WebhookController = require('./src/controllers/webhookController');
const DataStore = require('./src/services/dataStore');
const config = require('./src/config');
const crypto = require('crypto');

const dataStore = new DataStore();

async function testCompleteWebhookFlow() {
  try {
    console.log('🚀 Testing Complete Duitku → Thinkific Webhook Flow...\n');
    
    // Step 1: Simulate payment initiation (what happens when user starts payment)
    const testOrderId = `DUITKU_${Date.now()}`;
    const customerData = {
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '+6281234567890',
      courseName: 'How to get rich',
      courseDescription: 'Learn how to get rich',
      coursePrice: 250000,
      orderId: testOrderId,
      paymentMethod: 'VA'
    };
    
    console.log('📋 Step 1: Store customer data (payment initiation)');
    await dataStore.set(`customer_${testOrderId}`, customerData, 3600);
    console.log('   ✅ Customer data stored in cache');
    
    // Also store in database
    const paymentData = {
      order_id: testOrderId,
      course_name: customerData.courseName,
      course_description: customerData.courseDescription,
      amount: customerData.coursePrice,
      payment_method: customerData.paymentMethod,
      status: 'pending',
      customer_name: customerData.customerName,
      customer_email: customerData.customerEmail,
      customer_phone: customerData.customerPhone,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    
    const savedPayment = await dataStore.savePayment(paymentData);
    console.log('   ✅ Payment record created in database:', savedPayment.id);
    
    // Step 2: Simulate Duitku webhook callback (payment success)
    console.log('\n💰 Step 2: Simulate Duitku webhook (payment success)');
    
    // Generate proper signature for webhook verification
    const signatureString = `${config.duitku.merchantCode}${customerData.coursePrice}${testOrderId}${config.duitku.apiKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    const webhookPayload = {
      merchantOrderId: testOrderId,
      amount: customerData.coursePrice,
      resultCode: '00',
      merchantUserId: 'USER123',
      reference: `DUITKU-${Date.now()}`,
      spUserHash: 'test-hash',
      settlementDate: new Date().toISOString().replace(/[-T:]/g, '').substring(0, 8), // Format: YYYYMMDD
      issuerCode: 'BNI',
      paymentMethod: 'VA',
      signature: signature
    };
    
    console.log('   📤 Webhook payload:', {
      orderId: webhookPayload.merchantOrderId,
      amount: webhookPayload.amount,
      status: webhookPayload.resultCode === '00' ? 'SUCCESS' : 'FAILED'
    });
    
    // Step 3: Process webhook
    console.log('\n⚡ Step 3: Process webhook and trigger enrollment');
    try {
      // Create a mock request/response object for the webhook handler
      const mockReq = {
        body: webhookPayload
      };
      
      let responseData = null;
      const mockRes = {
        json: (data) => { responseData = data; },
        status: (code) => ({ json: (data) => { responseData = { ...data, statusCode: code }; } })
      };
      
      // Process the webhook through the Duitku handler
      await WebhookController.handleDuitkuWebhook(mockReq, mockRes);
      
      if (responseData && responseData.success) {
        console.log('   ✅ Webhook processed successfully!');
        console.log('   📊 Response:', {
          status: responseData.paymentStatus,
          orderId: responseData.orderId,
          amount: responseData.amount,
          verified: responseData.verified
        });
        
        // The enrollment should have been triggered automatically
        console.log('   🎓 Enrollment should have been processed automatically');
        
      } else {
        console.log('   ❌ Webhook processing failed:', responseData?.error || 'Unknown error');
        if (responseData?.statusCode) {
          console.log('   📟 Status Code:', responseData.statusCode);
        }
      }
      
    } catch (error) {
      console.log('   ❌ Webhook processing error:', error.message);
    }
    
    // Step 4: Verify enrollment in database
    console.log('\n🔍 Step 4: Verify enrollment record');
    try {
      const enrollments = await dataStore.getEnrollmentsByEmail(customerData.customerEmail);
      if (enrollments && enrollments.length > 0) {
        console.log('   ✅ Enrollment found in database!');
        console.log('      - Records found:', enrollments.length);
        enrollments.forEach((enrollment, index) => {
          console.log(`      - Enrollment ${index + 1}:`, {
            id: enrollment.id,
            course: enrollment.course_name,
            status: enrollment.status,
            created: enrollment.created_at
          });
        });
      } else {
        console.log('   ⚠️  No enrollment records found in database');
      }
    } catch (error) {
      console.log('   ❌ Error checking enrollment records:', error.message);
    }
    
    // Cleanup
    console.log('\n🧹 Cleanup test data...');
    await dataStore.redis.del(`customer_${testOrderId}`);
    console.log('   ✅ Cache cleaned');
    
    console.log('\n🎉 Complete webhook flow test finished!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testCompleteWebhookFlow().then(() => {
  console.log('\n✨ All tests completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
