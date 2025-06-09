require('dotenv').config();

const logger = require('./src/utils/logger');
const DataStore = require('./src/services/dataStore');
const WebhookController = require('./src/controllers/webhookController');

const dataStore = new DataStore();

async function testEnrollmentFlow() {
  try {
    console.log('🧪 Testing Enrollment Flow...\n');
    
    // Step 1: Create a test payment with customer data
    const testOrderId = `TEST_${Date.now()}`;
    const testPaymentData = {
      order_id: testOrderId,
      course_name: 'How to get rich', // Using actual course name from Thinkific
      course_description: 'A test course to verify enrollment flow',
      amount: 150000,
      payment_method: 'VA',
      payment_url: 'https://sandbox.duitku.com/test',
      va_number: '1234567890',
      qr_string: 'test-qr-string',
      duitku_reference: 'REF123456',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'pending',
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      customer_phone: '+6281234567890'
    };
    
    console.log('📝 Creating test payment record...');
    const savedPayment = await dataStore.savePayment(testPaymentData);
    console.log('✅ Payment created:', savedPayment.id);
    
    // Step 2: Store customer data in cache (simulating payment initiation)
    const customerData = {
      customerName: testPaymentData.customer_name,
      customerEmail: testPaymentData.customer_email,
      customerPhone: testPaymentData.customer_phone,
      courseName: testPaymentData.course_name,
      courseDescription: testPaymentData.course_description,
      coursePrice: testPaymentData.amount,
      orderId: testOrderId,
      paymentMethod: testPaymentData.payment_method
    };
    
    console.log('💾 Storing customer data in cache...');
    await dataStore.set(`customer_${testOrderId}`, customerData, 3600);
    console.log('✅ Customer data cached');
    
    // Step 3: Simulate successful payment webhook processing
    const mockPaymentRecord = {
      orderId: testOrderId,
      amount: testPaymentData.amount,
      status: 'SUCCESS',
      resultCode: '00',
      reference: testPaymentData.duitku_reference,
      paymentMethod: 'VA',
      processedAt: new Date().toISOString(),
      verified: true,
      source: 'duitku'
    };
    
    console.log('🎯 Testing enrollment processing...');
    try {
      const enrollmentResult = await WebhookController.processSuccessfulPayment(testOrderId, mockPaymentRecord);
      console.log('✅ Enrollment successful!', enrollmentResult);
    } catch (enrollmentError) {
      console.log('❌ Enrollment failed:', enrollmentError.message);
      
      // Check if customer data can be reconstructed from database
      console.log('\n🔧 Testing customer data reconstruction...');
      const payment = await dataStore.getPaymentByOrderId(testOrderId);
      if (payment && payment.customer_name) {
        console.log('✅ Customer data available in database:');
        console.log('   - Name:', payment.customer_name);
        console.log('   - Email:', payment.customer_email);
        console.log('   - Course:', payment.course_name);
      } else {
        console.log('❌ No customer data in database');
      }
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await dataStore.redis.del(`customer_${testOrderId}`);
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testEnrollmentFlow().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
