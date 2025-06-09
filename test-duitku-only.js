const DuitkuService = require('./src/services/duitkuService');
const config = require('./src/config');

async function testDuitkuOnly() {
  try {
    const duitkuService = new DuitkuService(config.duitku);
    
    const paymentData = {
      courseName: "Test Course",
      merchantCode: config.duitku.merchantCode,
      courseDescription: "A test course for payment integration",
      coursePrice: 100000,
      customerName: "John Doe",
      customerEmail: "john.doe@example.com",
      customerPhone: "+6281234567890",
      paymentMethod: "I1",
      returnUrl: "https://example.com/payment/success",
      callbackUrl: "https://example.com/api/webhooks/duitku"
    };

    console.log('Testing Duitku API call...');
    const result = await duitkuService.initiatePayment(paymentData);
    console.log('✅ SUCCESS! Duitku API call worked:', result);
    
  } catch (error) {
    console.error('❌ FAILED! Duitku API error:', error.message);
  }
}

testDuitkuOnly();
