const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test functions
async function testCartWithChildren() {
  console.log('🚀 Testing Cart with Children and Sibling Discounts...\n');

  try {
    // 1. Add test data with children
    console.log('1. Adding test data with children...');
    const testDataResponse = await axios.get(`${BASE_URL}/cart/add-test-data`);
    console.log('Test data response:', JSON.stringify(testDataResponse.data, null, 2));
    
    // 2. Show how to add class with children
    console.log('\n2. To add a class with children, use:');
    console.log(`POST ${BASE_URL}/cart/add`);
    console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN", "Content-Type": "application/json" }');
    console.log(`Body: { 
  "class_id": "123",
  "childs": [1, 2, 3]
}`);
    
    // 3. Show how to update children for existing cart item
    console.log('\n3. To update children for existing cart item, use:');
    console.log(`POST ${BASE_URL}/cart/update`);
    console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN", "Content-Type": "application/json" }');
    console.log(`Body: { 
  "cartitem": "123-1703123456789",
  "childs": [1, 2]
}`);
    
    // 4. Show how to get user's children
    console.log('\n4. To get user\'s children for dropdown, use:');
    console.log(`GET ${BASE_URL}/cart/children`);
    console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }');
    
    // 5. Show how to view cart with sibling discounts
    console.log('\n5. To view cart with sibling discounts, use:');
    console.log(`GET ${BASE_URL}/cart11`);
    console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Test without authentication
async function testCartWithoutAuth() {
  console.log('\n🔓 Testing cart without authentication...');
  try {
    const response = await axios.get(`${BASE_URL}/cart/add-test-data`);
    console.log('Test data response:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testCartWithoutAuth();
  await testCartWithChildren();
}

runTests(); 