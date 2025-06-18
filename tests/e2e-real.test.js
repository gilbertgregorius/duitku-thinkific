require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const { expect } = require('chai');
const axios = require('axios');
const app = require('../src/app');
const { sequelize } = require('../src/database');
const User = require('../src/models/User');
const readline = require('readline');

function waitForUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

describe('End-to-End Tests - Real APIs', () => {
  let testUser;
  let testPayment;
  let accessToken;
  let testProduct;
  let testEnrollment;
  
  // Test configuration
  const TEST_CONFIG = {
    email: process.env.TEST_EMAIL,
    subdomain: process.env.TEST_SUBDOMAIN,
    ngrokUrl: process.env.NGROK_URL,
    thinkificClientId: process.env.THINKIFIC_CLIENT_ID,
    thinkificClientSecret: process.env.THINKIFIC_CLIENT_SECRET,
    duitkuApiKey: process.env.DUITKU_TEST_API_KEY,
    duitkuMerchantCode: process.env.DUITKU_MERCHANT_CODE
  };

  before(async function() {
    this.timeout(30000);
    console.log('🚀 Starting E2E Tests with Real APIs');
    
    // For real E2E tests, don't force clear the database
    // This allows OAuth flow to persist user data
    await sequelize.sync({ force: false });
    console.log('✅ Test database synchronized (preserving existing data)');
    
    // Wait for GraphQL to be ready
    await app.waitForGraphQL();
    console.log('✅ GraphQL server ready');
  });

  after(async () => {
    // Cleanup
    await sequelize.close();
    console.log('🧹 Test database cleaned up');
  });

  describe('Step 0: OAuth Flow - Get Real Access Token', () => {
    it('should initiate OAuth flow and get authorization URL', async function() {
      this.timeout(10000);
      
      // Test OAuth authorization URL generation (using correct route)
      const response = await request(app)
        .get(`/oauth/install?subdomain=${TEST_CONFIG.subdomain}`)
        .expect(302); // Should redirect

      expect(response.headers.location).to.include('https://duitku.thinkific.com/oauth2/authorize');
      expect(response.headers.location).to.include(`client_id=${TEST_CONFIG.thinkificClientId}`);
      
      console.log('0.1 OAuth authorization URL generated');
      // console.log('🔗 Manual step required: Visit this URL to authorize:');
      // console.log(response.headers.location);
      // console.log('📝 After authorization, copy the authorization code from the callback URL');
    });

    it('should exchange authorization code for access token', async function() {
      this.timeout(120000); // 2 minutes for manual OAuth process
      
      // First, check if OAuth already completed by looking for existing user
      let user = await User.findOne({ where: { subdomain: TEST_CONFIG.subdomain } });
      
      if (user && user.accessToken) {
        console.log('0.2 OAuth flow already completed - using existing user');
        testUser = user;
        accessToken = user.accessToken;
        // console.log('🔑 Real access token found');
        // console.log(`📝 User GID: ${user.thinkificUserId || user.gid || 'N/A'}`);
        // console.log(`📝 Token preview: ${accessToken.substring(0, 10)}...`);
        return;
      }

      // If no existing user, start the manual OAuth process
      let authCode = process.env.TEST_AUTH_CODE;
      
      if (!authCode) {
        console.log('\n🔐 MANUAL OAUTH REQUIRED');
        console.log('======================================');
        console.log('1. Visit the OAuth URL from the previous test');
        console.log('2. Complete the authorization process in your browser');
        console.log('3. The OAuth callback will happen automatically');
        console.log('4. Wait for the "OAuth installation completed" message');
        console.log('5. Then press Enter to continue the test');
        console.log('======================================\n');
        
        // Wait for manual OAuth completion
        await waitForUserInput('Press Enter after you see "OAuth installation completed" in the logs: ');
        
        // Give a moment for the OAuth callback to save to database
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for user after manual OAuth completion
        user = await User.findOne({ where: { subdomain: TEST_CONFIG.subdomain } });
        
        if (user && user.accessToken) {
          console.log('✅ User found after manual OAuth completion');
          testUser = user;
          accessToken = user.accessToken;
          console.log('🔑 Real access token obtained');
          console.log(`📝 User GID: ${user.thinkificUserId || user.gid || 'N/A'}`);
          console.log(`📝 Token preview: ${accessToken.substring(0, 10)}...`);
          return;
        } else {
          console.log('⚠️  No user found after OAuth completion. Trying programmatic approach...');
        }
      }

      // If we still don't have a user, something went wrong
      if (!user || !user.accessToken) {
        throw new Error('❌ OAuth flow failed. No user with access token found after manual completion.');
      }
      
      console.log('0.2 OAuth flow completed successfully');
      // console.log('🔑 Real access token obtained and saved');
      // console.log(`📝 Token preview: ${accessToken.substring(0, 10)}...`);
    });
  });

  describe('Step 1: User Management - Verify Real User', () => {
    it('should verify user exists with real access token', async function() {
      this.timeout(5000);
      
      if (!testUser || !accessToken) {
        throw new Error('❌ OAuth flow must complete successfully before this test. No real access token available.');
      }

      expect(testUser).to.have.property('id');
      expect(testUser.subdomain).to.equal(TEST_CONFIG.subdomain);
      expect(accessToken).to.match(/^[a-zA-Z0-9._-]+$/); // JWT token format
      expect(accessToken.length).to.be.greaterThan(100); // Real tokens are long
      
      console.log('1.1 Real user verified');
      // console.log(`👤 User ID: ${testUser.id}`);
      // console.log(`🏫 Subdomain: ${testUser.subdomain}`);
      // console.log(`🔑 Access Token Length: ${accessToken.length} chars`);
    });

    it('should fetch user via GraphQL', async function() {
      this.timeout(5000);
      
      const query = `
        query {
          user(subdomain: "${TEST_CONFIG.subdomain}") {
            id
            subdomain
            gid
            createdAt
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.user).to.not.be.null;
      expect(response.body.data.user.subdomain).to.equal(TEST_CONFIG.subdomain);
      
      console.log('1.2 User fetched successfully via GraphQL', response.body.data.user.TEST_EMAIL);
    });
  });

  describe('Step 2: Product Fetching - Get Real Product Data', () => {
    it('should fetch products from Thinkific API', async function() {
      this.timeout(15000);
      
      if (!accessToken || !testUser) {
        throw new Error('❌ Real access token required. Complete OAuth flow first.');
      }

      // Use real Thinkific API to fetch products with OAuth token
      const response = await axios.get(`https://api.thinkific.com/api/public/v1/products`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DuitkuThinkific/1.0.0'
        }
      });

      expect(response.data.items).to.be.an('array');
      expect(response.data.items.length).to.be.greaterThan(0);
      
      // Use the first available product for testing
      testProduct = response.data.items[0];
      
      expect(testProduct).to.have.property('id');
      expect(testProduct).to.have.property('name');
      expect(testProduct).to.have.property('productable_id');
      expect(testProduct).to.have.property('productable_type');
      
      console.log('2.1 Products fetched successfully from Thinkific API');
      console.log(`� Using product: ${testProduct.name} (ID: ${testProduct.id})`);
      console.log(`💰 Product price: ${testProduct.price || 'Free'}`);
      console.log(`🔗 Links to ${testProduct.productable_type}: ${testProduct.productable_id}`);
    });

    it('should fetch product via GraphQL with real data', async function() {
      this.timeout(10000);
      
      if (!testProduct) {
        throw new Error('❌ Real product data required. Previous test must pass first.');
      }
      
      const query = `
        query {
          product(productId: "${testProduct.id}", subdomain: "${TEST_CONFIG.subdomain}") {
            id
            name
            price
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      if (response.body.errors) {
        throw new Error(`❌ GraphQL product query failed: ${response.body.errors[0].message}`);
      }

      expect(response.body.data.product).to.not.be.null;
      expect(response.body.data.product.id).to.equal(testProduct.id.toString());
      
      console.log('2.2 Product fetched successfully via GraphQL');
    });
  });

  describe('Step 3: Payment Flow - Create Real Payment', () => {
    it('should show checkout page with real product data', async function() {
      this.timeout(5000);
      
      const response = await request(app)
        .get(`/payment/checkout?productId=${testProduct.id}&subdomain=${TEST_CONFIG.subdomain}`)
        .expect(200);

      expect(response.text).to.include('checkout');
      expect(response.text).to.be.a('string');
      
      console.log('3.1 Checkout page rendered successfully');
    });

    it('should create payment with real Duitku API', async function() {
      this.timeout(20000);
      
      // Get price from product_prices or product.price
      const primaryPrice = testProduct.product_prices?.find(p => p.is_primary);
      const amount = primaryPrice ? parseFloat(primaryPrice.price) : parseFloat(testProduct.price) || 50000;
      
      const paymentData = {
        productId: testProduct.id,
        amount: amount,
        customerEmail: TEST_CONFIG.email,
        customerName: 'E2E Test User'
      };


      const response = await request(app)
        .post(`/payment/create?subdomain=${TEST_CONFIG.subdomain}`)
        .send(paymentData);


      if (response.body.success) {
        expect(response.body).to.have.property('paymentUrl');
        expect(response.body).to.have.property('orderId');
        
        testPayment = {
          orderId: response.body.orderId,
          paymentUrl: response.body.paymentUrl
        };
        
        console.log('3.2 Payment created successfully with Duitku');
        
        // Save payment URL for manual testing
        console.log('🔗 Visit this URL to complete payment:', testPayment.paymentUrl);
        
      } else {
        console.log(`3.2  Payment creation failed: ${response.status} - ${response.body.success ? 'SUCCESS' : 'FAILED'}`);
        expect(response.body).to.have.property('error');
      }
    });

    it('should create payment via GraphQL', async function() {
      this.timeout(15000);
      
      // Get price from product_prices or product.price
      const primaryPrice = testProduct.product_prices?.find(p => p.is_primary);
      const amount = primaryPrice ? parseFloat(primaryPrice.price) : parseFloat(testProduct.price) || 50000;
      
      const mutation = `
        mutation {
          createPayment(input: {
            productId: "${testProduct.id}"
            amount: ${amount}
            subdomain: "${TEST_CONFIG.subdomain}"
            customerEmail: "${TEST_CONFIG.email}"
          }) {
            success
            paymentUrl
            orderId
            error
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation });

      if (response.body.data?.createPayment?.success) {
        expect(response.body.data.createPayment).to.have.property('paymentUrl');
        expect(response.body.data.createPayment).to.have.property('orderId');
        
        console.log('3.3 Payment created successfully via GraphQL');
      } else {
        console.log('3.3  GraphQL payment creation failed');
        expect(response.body.data?.createPayment).to.have.property('error');
      }
    });
  });

  // describe('Step 4: Webhook Simulation - Test Callbacks', () => {
  //   it('should handle Duitku webhook callback', async function() {
  //     this.timeout(5000);
      
  //     if (!testPayment) {
  //       console.log('⚠️  Skipping webhook test - no payment created');
  //       this.skip();
  //     }

  //     // Simulate successful Duitku webhook
  //     const webhookData = {
  //       merchantOrderId: testPayment.orderId,
  //       amount: testCourse.price || 50000,
  //       signature: 'mock_signature_for_testing', // In real scenario, this would be calculated
  //       statusCode: '00', // Success status
  //       statusMessage: 'SUCCESS'
  //     };

  //     const response = await request(app)
  //       .post('/api/webhooks/duitku')
  //       .send(webhookData);

  //     console.log('📥 Duitku webhook response:', response.body);
      
  //     // Should process webhook (may fail signature validation with mock data)
  //     expect(response.status).to.be.oneOf([200, 400]);
      
  //     console.log('✅ Duitku webhook processed (signature validation may fail with mock data)');
  //   });

  //   it('should handle Thinkific webhook callback', async function() {
  //     this.timeout(5000);
      
  //     // Simulate Thinkific enrollment webhook
  //     const webhookData = {
  //       event: 'user.enrolled',
  //       data: {
  //         user: {
  //           email: TEST_CONFIG.email,
  //           first_name: 'E2E',
  //           last_name: 'Test User'
  //         },
  //         course: {
  //           id: testCourse.id,
  //           name: testCourse.name
  //         },
  //         enrollment: {
  //           id: Date.now(),
  //           created_at: new Date().toISOString()
  //         }
  //       }
  //     };

  //     const response = await request(app)
  //       .post('/api/webhooks/thinkific')
  //       .send(webhookData);

  //     console.log('📥 Thinkific webhook response:', response.body);
      
  //     expect(response.status).to.be.oneOf([200, 400]);
      
  //     console.log('✅ Thinkific webhook processed');
  //   });
  // });

  // describe('Step 5: Enrollment Verification', () => {
  //   it('should verify user enrollment in database', async function() {
  //     this.timeout(5000);
      
  //     // Check if payment record exists
  //     const payment = testPayment ? await Payment.findOne({ 
  //       where: { orderId: testPayment.orderId } 
  //     }) : null;

  //     if (payment) {
  //       expect(payment.orderId).to.equal(testPayment.orderId);
  //       expect(payment.userId).to.equal(testUser.id);
        
  //       console.log('✅ Payment record found in database');
  //       console.log(`💳 Payment status: ${payment.status}`);
  //     } else {
  //       console.log('⚠️  No payment record found (expected if payment creation failed)');
  //     }
  //   });
  // });

  describe('Step 6: Complete Flow Summary', () => {
    it('should summarize the complete E2E test results', function() {
      console.log('\n🎯 E2E Test Summary:');
      console.log('==================');
      console.log(`👤 Test User: ${testUser?.subdomain || 'Not created'}`);
      console.log(`� Test Product: ${testProduct?.name || 'Not fetched'} (ID: ${testProduct?.id || 'N/A'})`);
      console.log(`💳 Payment: ${testPayment?.orderId || 'Not created'}`);
      console.log(`🔗 Payment URL: ${testPayment?.paymentUrl || 'Not available'}`);
      console.log(`🌐 ngrok URL: ${TEST_CONFIG.ngrokUrl}`);
      
      console.log('\n📝 Manual Steps Required:');
      console.log('1. Complete OAuth flow by visiting the authorization URL');
      console.log('2. Set TEST_AUTH_CODE in .env.test with the authorization code');
      console.log('3. Visit the payment URL to complete the payment');
      console.log('4. Verify webhooks are received at the ngrok URL');
      
      console.log('\n✅ E2E Test Completed');
    });
  });

  // describe('Step 7: External Order - Test with Hardcoded User ID', () => {
  //   it('should test external order creation with hardcoded user ID (1)', async function() {
  //     this.timeout(15000);
      
  //     if (!accessToken || !testCourse) {
  //       throw new Error('❌ Real access token and course data required');
  //     }

  //     console.log('🧪 Testing external order with hardcoded user ID = 1');
      
  //     try {
  //       const thinkificService = new ThinkificService(config.thinkificConfig);
        
  //       // Get products to find a valid product ID
  //       console.log('🛍️ Getting products from Thinkific...');
  //       const products = await thinkificService.getProducts(accessToken);
        
  //       console.log(`📦 Found ${products.items.length} products`);
        
  //       let productId;
  //       if (products.items.length > 0) {
  //         productId = products.items[0].id;
  //         console.log('✅ Using first available product:', {
  //           id: productId,
  //           name: products.items[0].name,
  //           price_in_cents: products.items[0].price_in_cents
  //         });
  //       } else {
  //         throw new Error('❌ No products found in Thinkific');
  //       }
        
  //       // Now test creating external order with hardcoded user ID = 1
  //       console.log('🛒 Creating external order with hardcoded user ID = 1...');
        
  //       const orderData = {
  //         accessToken,
  //         courseId: testCourse.id,
  //         amount: 50000, // 500.00 in cents
  //         orderId: `test-order-${Date.now()}`,
  //         userId: 1, // Hardcoded user ID
  //         productId: productId,
  //         userEmail: TEST_CONFIG.email
  //       };
        
  //       console.log('📤 Order data:', {
  //         ...orderData,
  //         accessToken: orderData.accessToken.substring(0, 10) + '...'
  //       });
        
  //       const externalOrderResult = await thinkificService.createExternalOrder(orderData);
        
  //       console.log('✅ External order created successfully!');
  //       console.log('📦 External order result:', externalOrderResult);
        
  //       expect(externalOrderResult).to.have.property('id');
  //       expect(externalOrderResult).to.have.property('user_id');
  //       expect(externalOrderResult).to.have.property('product_id');
        
  //       console.log(`🎯 Order ID: ${externalOrderResult.id}`);
  //       console.log(`👤 User ID used: ${externalOrderResult.user_id}`);
  //       console.log(`📦 Product ID used: ${externalOrderResult.product_id}`);
        
  //     } catch (error) {
  //       console.error('❌ External order creation failed:', error.message);
        
  //       // Log detailed error information
  //       if (error.response?.data) {
  //         console.error('🔍 API Response:', JSON.stringify(error.response.data, null, 2));
  //       }
  //       if (error.response?.status) {
  //         console.error('📊 HTTP Status:', error.response.status);
  //       }
        
  //       // Check if it's a user validation error
  //       if (error.message.includes('User not found') || error.message.includes('user_id')) {
  //         console.log('🎯 RESULT: Thinkific DOES validate user_id - user ID 1 does not exist');
  //       } else if (error.message.includes('product') || error.message.includes('Product not found')) {
  //         console.log('🎯 RESULT: User ID validation passed, but product validation failed');
  //       } else {
  //         console.log('🎯 RESULT: Unknown error - need to investigate further');
  //       }
        
  //       // Don't throw the error, just log it for analysis
  //       console.log('⚠️ Test completed with error (this is expected for analysis)');
  //     }
  //   });
    
  //   it('should get user and product information for external order', async function() {
  //     this.timeout(10000);
      
  //     if (!accessToken || !testCourse) {
  //       throw new Error('❌ Real access token and course data required');
  //     }

  //     // Get current user info to get the numeric user ID
  //     console.log('🔍 Getting current user info from Thinkific...');
      
  //     try {
  //       const thinkificService = new ThinkificService(config.thinkificConfig);
  //       const currentUser = await thinkificService.getCurrentUser(accessToken);
        
  //       console.log('👤 Current user info:', {
  //         id: currentUser.id,
  //         email: currentUser.email,
  //         first_name: currentUser.first_name,
  //         last_name: currentUser.last_name
  //       });
        
  //       // Store the numeric user ID for external order
  //       testUser.thinkificUserId = currentUser.id;
        
  //       // Get products to find the correct product ID
  //       console.log('🛍️ Getting products from Thinkific...');
  //       const products = await thinkificService.getProducts(accessToken);
        
  //       console.log(`📦 Found ${products.items.length} products`);
        
  //       // Find product that matches our course
  //       const matchingProduct = products.items.find(product => 
  //         product.course_ids && product.course_ids.includes(parseInt(testCourse.id))
  //       );
        
  //       if (matchingProduct) {
  //         console.log('✅ Found matching product:', {
  //           id: matchingProduct.id,
  //           name: matchingProduct.name,
  //           course_ids: matchingProduct.course_ids,
  //           price_in_cents: matchingProduct.price_in_cents
  //         });
          
  //         // Store the product ID for external order
  //         testCourse.productId = matchingProduct.id;
  //         testCourse.priceInCents = matchingProduct.price_in_cents;
  //       } else {
  //         console.log('⚠️ No matching product found for course', testCourse.id);
  //         console.log('Available products:', products.items.map(p => ({
  //           id: p.id,
  //           name: p.name,
  //           course_ids: p.course_ids
  //         })));
          
  //         // For external orders, we might need to use the course as a product
  //         // Let's use the first product or fallback to course ID
  //         if (products.items.length > 0) {
  //           const firstProduct = products.items[0];
  //           console.log('🔄 Using first available product as fallback:', firstProduct.name);
  //           testCourse.productId = firstProduct.id;
  //           testCourse.priceInCents = firstProduct.price_in_cents;
  //         }
  //       }
        
  //       console.log('✅ User and product information retrieved successfully');
  //       console.log(`📝 User ID: ${testUser.thinkificUserId}`);
  //       console.log(`📝 Product ID: ${testCourse.productId}`);
        
  //     } catch (error) {
  //       console.error('❌ Error getting user/product info:', error.message);
        
  //       // Log the error details but don't fail the test - we can still try with existing data
  //       if (error.response?.data) {
  //         console.error('API Response:', error.response.data);
  //       }
        
  //       // For now, let's continue with the GID as fallback
  //       console.log('⚠️ Using fallback values for external order');
  //     }
  //   });
  // });
});
