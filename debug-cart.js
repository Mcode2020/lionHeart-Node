const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test the cart add API
async function debugCartAdd() {
  console.log('🔍 Debugging Cart Add API...\n');

  try {
    // 1. Test without authentication
    console.log('1. Testing without authentication...');
    try {
      const response = await axios.post(`${BASE_URL}/cart/add`, {
        class_id: "123"
      });
      console.log('❌ Should have failed with 401:', response.data);
    } catch (error) {
      console.log('✅ Expected 401 error:', error.response?.status, error.response?.data);
    }

    // 2. Test with invalid JWT token
    console.log('\n2. Testing with invalid JWT token...');
    try {
      const response = await axios.post(`${BASE_URL}/cart/add`, {
        class_id: "123"
      }, {
        headers: {
          'Authorization': 'Bearer invalid_token',
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with 401:', response.data);
    } catch (error) {
      console.log('✅ Expected 401 error:', error.response?.status, error.response?.data);
    }

    // 3. Test with valid JWT token (you need to replace with actual token)
    console.log('\n3. Testing with valid JWT token...');
    console.log('Replace YOUR_JWT_TOKEN with an actual token from login');
    console.log(`curl -X POST ${BASE_URL}/cart/add \\`);
    console.log(`  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"class_id": "123"}'`);

    // 4. Test the test data endpoint
    console.log('\n4. Testing add-test-data endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/cart/add-test-data`);
      console.log('✅ Test data response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Test data error:', error.response?.status, error.response?.data);
    }

    // 5. Test cart11 endpoint
    console.log('\n5. Testing cart11 endpoint without auth...');
    try {
      const response = await axios.get(`${BASE_URL}/cart11`);
      console.log('❌ Should have failed with 401:', response.data);
    } catch (error) {
      console.log('✅ Expected 401 error:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Test with a sample JWT token (you need to replace this with a real one)
async function testWithSampleToken() {
  console.log('\n🔑 Testing with sample JWT token...');
  
  // This is a sample token - you need to replace it with a real one from login
  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDMxMjM0NTYsImV4cCI6MTcwMzEyNzA1Nn0.example';
  
  try {
    const response = await axios.post(`${BASE_URL}/cart/add`, {
      class_id: "123",
      childs: [1, 2]
    }, {
      headers: {
        'Authorization': `Bearer ${sampleToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
  }
}

// Run debug tests
async function runDebug() {
  await debugCartAdd();
  await testWithSampleToken();
}

runDebug(); 