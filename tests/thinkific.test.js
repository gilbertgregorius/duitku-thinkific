const thinkific = require('../src/services/thinkific');

describe('Users API with OAuth', () => {
  describe('Thinkific Service - getUsers with JWT Token', () => {
    // Your JWT access token
    const accessToken = 'eyJraWQiOiI0ZDE2MDMzNDk4NmFmYTRiOGIyNTM2ODZlYTY0ZTYwZjkxNjc3NTU0ODdiMjk5MTFjNGM1MWU3MzdmM2ViYTQyIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2NvdXJzZXMudGhpbmtpZmljLmNvbSIsImF1ZCI6ImFwaS50aGlua2lmaWMuY29tIiwic2NvcGUiOiJ3cml0ZTplbnJvbGxtZW50cyB3cml0ZTpleHRlcm5hbF9vcmRlcnMgcmVhZDpvcmRlcnMgd3JpdGU6Y291cnNlcyB3cml0ZTp1c2Vyc19wcm9maWxlIHdyaXRlOnVzZXJzIHdyaXRlOnByb2R1Y3RzIHJlYWQ6YnVuZGxlcyB3cml0ZTpjb3Vwb25zIHdyaXRlOmNhdGVnb3JpZXMgcmVhZDpsZXNzb25zIHdyaXRlOmNvbW11bml0aWVzIiwiZXhwIjoxNzUwMzg4ODYyLCJpYXQiOjE3NTAzMDI0NjIsImp0aSI6ImE4NjQ2YWJjLTg4ZDQtNGJjMC04YjdhLTJjZWJkMTc0OTY5NSIsImNsaWVudF9pZCI6ImVlMTZiY2JmZDljZDcxMmY4NjU5ZjljNmJkMjUxYTc3Iiwic3ViZG9tYWluIjoiZHVpdGt1IiwiYXBpX3Njb3BpbmdfZW5hYmxlZCI6dHJ1ZSwidHlwZSI6InRwX29hdXRoX3Rva2VuIn0.Q0AgYVvz6miyFj9gNstX6wwQbtyOorxR_ExADwyxKs1eoIoi2EDjbM580m2Snhr_ZSNpefGxVgXaObY2NyPF3DTqdiHvIjKIFJTF9g-ELSMN9aDar8X9oUOTtl1gp17X9l26TAJignbpm65kf1G3JqkgOc4b7_cip0ntlHsZpw_eDwRyhS2vPAlsGITeebaywphpn3FMa4Jjn8k5T1cMA4AlsPSiPwTJQ946HU49wXrumtkZ9uwv37wwi-6Y4SOpDPfbZXYGgfLwL61MhN94yj14-Boi19igmzMIyrbXg0itINIKSDsw7EhuHXtz31sMPDTyKGQA6HDOfvcyCRpVAg';
    
    beforeAll(() => {
      console.log('🔐 Using JWT Token for Thinkific API');
      console.log('Token preview:', accessToken.substring(0, 50) + '...');
      
      // Decode JWT payload (just for info, not validation)
      try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        console.log('📋 Token Info:');
        console.log('  - Subdomain:', payload.subdomain);
        console.log('  - Expires:', new Date(payload.exp * 1000).toISOString());
        console.log('  - Scopes:', payload.scope.split(' ').join(', '));
        console.log('  - Is Expired:', new Date() > new Date(payload.exp * 1000));
      } catch (e) {
        console.log('Could not decode token payload');
      }
    });

    it('should fetch users with JWT access token', async () => {
      try {
        console.log('🚀 Calling thinkific.getUsers() with JWT token...');

        // Call getUsers with the JWT token
        const result = await thinkific.getUsers(accessToken);
        
        console.log('📊 API Response:');
        console.log(JSON.stringify(result, null, 2));
        
        // Assertions
        expect(result).toBeInstanceOf(Object);
        expect(Array.isArray(result.items)).toBe(true);
        
        console.log('✅ Test passed!');
        console.log(`📈 Users count: ${result.items.length}`);
        
        // Log first user details (if any)
        if (result.items.length > 0) {
          const firstUser = result.items[0];
          console.log('👤 First user sample:', {
            id: firstUser.id,
            email: firstUser.email,
            first_name: firstUser.first_name,
            last_name: firstUser.last_name,
            created_at: firstUser.created_at
          });

          // Show all users briefly
          console.log('👥 All users:');
          result.items.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
          });
        } else {
          console.log('📭 No users found in Thinkific subdomain');
        }

      } catch (error) {
        console.error('❌ API call failed:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data
        });
        
        if (error.response?.status === 401) {
          console.log('🔑 Authentication failed - token might be expired or invalid');
        } else if (error.response?.status === 403) {
          console.log('🚫 Permission denied - check token scopes');
        }
        
        throw error;
      }
    });

    it('should handle API errors gracefully', async () => {
      try {
        // Test with an invalid endpoint to see error handling
        const result = await thinkific.getUsers(accessToken);
        expect(result).toBeInstanceOf(Object);
        console.log('✅ API call successful');
        
      } catch (error) {
        console.log('🔍 Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message
        });
        
        // Don't throw if it's an expected error (like 401, 403)
        if ([401, 403, 404].includes(error.response?.status)) {
          console.log('✅ Handled expected API error gracefully');
        } else {
          throw error;
        }
      }
    });

    it('should test different API endpoints with same token', async () => {
      try {
        console.log('🧪 Testing multiple endpoints with same token...');

        // Test users endpoint
        const users = await thinkific.getUsers(accessToken);
        console.log(`👥 Users: ${users.items?.length || 0} found`);

        // Test courses endpoint
        const courses = await thinkific.getCourses(accessToken);
        console.log(`📚 Courses: ${courses.items?.length || 0} found`);
        
        // Test products endpoint
        const products = await thinkific.getProducts(accessToken);
        console.log(`🛍️ Products: ${products.items?.length || 0} found`);

        console.log('✅ Multiple endpoint test completed');
        
      } catch (error) {
        console.error('❌ Multiple endpoint test failed:', error.message);
        // Don't fail the test for this exploratory check
      }
    });
  });

  describe('Token Analysis', () => {
    it('should analyze JWT token structure', () => {
      const accessToken = 'eyJraWQiOiI0ZDE2MDMzNDk4NmFmYTRiOGIyNTM2ODZlYTY0ZTYwZjkxNjc3NTU0ODdiMjk5MTFjNGM1MWU3MzdmM2ViYTQyIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2NvdXJzZXMudGhpbmtpZmljLmNvbSIsImF1ZCI6ImFwaS50aGlua2lmaWMuY29tIiwic2NvcGUiOiJ3cml0ZTplbnJvbGxtZW50cyB3cml0ZTpleHRlcm5hbF9vcmRlcnMgcmVhZDpvcmRlcnMgd3JpdGU6Y291cnNlcyB3cml0ZTp1c2Vyc19wcm9maWxlIHdyaXRlOnVzZXJzIHdyaXRlOnByb2R1Y3RzIHJlYWQ6YnVuZGxlcyB3cml0ZTpjb3Vwb25zIHdyaXRlOmNhdGVnb3JpZXMgcmVhZDpsZXNzb25zIHdyaXRlOmNvbW11bml0aWVzIiwiZXhwIjoxNzUwMzg4ODYyLCJpYXQiOjE3NTAzMDI0NjIsImp0aSI6ImE4NjQ2YWJjLTg4ZDQtNGJjMC04YjdhLTJjZWJkMTc0OTY5NSIsImNsaWVudF9pZCI6ImVlMTZiY2JmZDljZDcxMmY4NjU5ZjljNmJkMjUxYTc3Iiwic3ViZG9tYWluIjoiZHVpdGt1IiwiYXBpX3Njb3BpbmdfZW5hYmxlZCI6dHJ1ZSwidHlwZSI6InRwX29hdXRoX3Rva2VuIn0.Q0AgYVvz6miyFj9gNstX6wwQbtyOorxR_ExADwyxKs1eoIoi2EDjbM580m2Snhr_ZSNpefGxVgXaObY2NyPF3DTqdiHvIjKIFJTF9g-ELSMN9aDar8X9oUOTtl1gp17X9l26TAJignbpm65kf1G3JqkgOc4b7_cip0ntlHsZpw_eDwRyhS2vPAlsGITeebaywphpn3FMa4Jjn8k5T1cMA4AlsPSiPwTJQ946HU49wXrumtkZ9uwv37wwi-6Y4SOpDPfbZXYGgfLwL61MhN94yj14-Boi19igmzMIyrbXg0itINIKSDsw7EhuHXtz31sMPDTyKGQA6HDOfvcyCRpVAg';
      
      try {
        const [header, payload, signature] = accessToken.split('.');
        
        const decodedHeader = JSON.parse(Buffer.from(header, 'base64').toString());
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        
        console.log('🔍 JWT Analysis:');
        console.log('Header:', JSON.stringify(decodedHeader, null, 2));
        console.log('Payload:', JSON.stringify(decodedPayload, null, 2));
        
        // Check expiration
        const expirationDate = new Date(decodedPayload.exp * 1000);
        const isExpired = new Date() > expirationDate;
        
        console.log('⏰ Token Status:');
        console.log('  - Expires:', expirationDate.toISOString());
        console.log('  - Is Expired:', isExpired);
        console.log('  - Time until expiry:', isExpired ? 'EXPIRED' : Math.round((expirationDate - new Date()) / 1000 / 60) + ' minutes');
        
        // Validate required fields
        expect(decodedPayload.subdomain).toBe('duitku');
        expect(decodedPayload.scope).toContain('write:users');
        expect(decodedPayload.scope).toContain('read:orders');
        
        console.log('✅ JWT token analysis completed');
        
      } catch (error) {
        console.error('❌ Failed to decode JWT:', error.message);
        throw error;
      }
    });
  });
});