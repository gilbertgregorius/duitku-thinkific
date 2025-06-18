const request = require('supertest');
const app = require('../src/app');
const thinkific = require('../src/services/thinkific');

describe('Users API', () => {
  describe('Thinkific Service - getUsersWithoutAuth', () => {
    it('should return 200 status when fetching all users', async () => {
      try {
        console.log('Instantiating thinkific service...');
        console.log('Thinkific config:', {
          hasApiKey: !!thinkific.apiKey,
          hasSubdomain: !!thinkific.subdomain,
          baseUrl: thinkific.baseUrl
        });

        console.log('Calling getUsersWithoutAuth...');
        const result = await thinkific.getUsersWithoutAuth();
        
        console.log('Result:', JSON.stringify(result, null, 2));
        
        // Basic assertions
        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);
        
        console.log('✅ Test passed! Users count:', result.items.length);
      } catch (error) {
        console.error('❌ Test failed with error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        
        throw error; // Re-throw to fail the test
      }
    });
  });
});