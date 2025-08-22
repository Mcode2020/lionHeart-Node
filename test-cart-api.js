const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test functions
async function testCartAPI() {
  console.log('🚀 Testing Cart API...\n');

  try {
    // 1. First, let's see what classes are available
    console.log('1. Getting available classes...');
    const classesResponse = await axios.get(`${BASE_URL}/class/search`);
    console.log('Available classes:', classesResponse.data);
    
    if (classesResponse.data && classesResponse.data.length > 0) {
      const firstClass = classesResponse.data[0];
      console.log(`\nFound class: ${firstClass.title} (ID: ${firstClass.splms_event_id})`);
      
      // 2. Add a class to cart (you'll need a JWT token for this)
      console.log('\n2. To add this class to cart, use:');
      console.log(`POST ${BASE_URL}/cart/add`);
      console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN", "Content-Type": "application/json" }');
      console.log(`Body: { "class_id": "${firstClass.splms_event_id}" }`);
      
      // 3. View cart (you'll need a JWT token for this)
      console.log('\n3. To view your cart, use:');
      console.log(`GET ${BASE_URL}/cart11`);
      console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }');
      
    } else {
      console.log('No classes found. You may need to add some test data to your database.');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Test without authentication
async function testCartWithoutAuth() {
  console.log('\n🔓 Testing cart without authentication...');
  try {
    const response = await axios.get(`${BASE_URL}/cart11`);
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Expected error (no auth):', error.response?.status, error.response?.data);
  }
}

// Test cart test endpoint
async function testCartTestEndpoint() {
  console.log('\n🧪 Testing cart test endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/cart/test`);
    console.log('Cart test response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testCartTestEndpoint();
  await testCartWithoutAuth();
  await testCartAPI();
}

runTests(); 