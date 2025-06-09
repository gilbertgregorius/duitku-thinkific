require('dotenv').config();

const ThinkificService = require('./src/services/thinkificServices');
const config = require('./src/config');

async function testThinkificAPI() {
  try {
    console.log('🧪 Testing Thinkific API Connection...\n');
    
    console.log('Configuration:');
    console.log('- API Key:', config.thinkific.apiKey ? '✅ Present' : '❌ Missing');
    console.log('- Subdomain:', config.thinkific.subdomain || '❌ Missing');
    console.log('- Base URL: https://api.thinkific.com/api/public/v1\n');
    
    const thinkificService = new ThinkificService(config.thinkific);
    
    // Test 1: Get courses
    console.log('📚 Testing: Get Courses...');
    try {
      const courses = await thinkificService.getCourses();
      console.log('✅ Courses retrieved successfully!');
      console.log('   Number of courses:', courses.items?.length || 0);
      if (courses.items && courses.items.length > 0) {
        console.log('   Sample course:', {
          id: courses.items[0].id,
          name: courses.items[0].name
        });
      }
    } catch (error) {
      console.log('❌ Failed to get courses:', error.response?.status, error.response?.statusText);
      console.log('   Error details:', error.response?.data || error.message);
    }
    
    // Test 2: Create a test user
    console.log('\n👤 Testing: Create User...');
    try {
      const testUser = await thinkificService.createUser({
        firstName: 'Test',
        lastName: 'User',
        email: `test-${Date.now()}@example.com`
      });
      console.log('✅ User created successfully!');
      console.log('   User ID:', testUser.id);
      console.log('   Email:', testUser.email);
    } catch (error) {
      console.log('❌ Failed to create user:', error.response?.status, error.response?.statusText);
      console.log('   Error details:', error.response?.data || error.message);
    }
    
    // Test 3: Search for existing user
    console.log('\n🔍 Testing: Search User by Email...');
    try {
      const existingUser = await thinkificService.getUserByEmail('test@example.com');
      if (existingUser) {
        console.log('✅ User search successful!');
        console.log('   Found user:', existingUser.email);
      } else {
        console.log('✅ User search successful (no user found with that email)');
      }
    } catch (error) {
      console.log('❌ Failed to search user:', error.response?.status, error.response?.statusText);
      console.log('   Error details:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testThinkificAPI().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
