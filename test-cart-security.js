const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test functions
async function testCartSecurity() {
  console.log('🔒 Testing Cart Security Features...\n');

  try {
    // 1. Test adding class without authentication
    console.log('1. Testing cart/add without authentication...');
    try {
      await axios.post(`${BASE_URL}/cart/add`, {
        class_id: "123",
        childs: [1, 2, 3]
      });
    } catch (error) {
      console.log('✅ Expected error (no auth):', error.response?.status, error.response?.data);
    }
    
    // 2. Test adding class with invalid child IDs (not belonging to user)
    console.log('\n2. Testing cart/add with invalid child IDs...');
    console.log('This would require a valid JWT token, but would fail if child IDs don\'t belong to user');
    console.log(`POST ${BASE_URL}/cart/add`);
    console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN", "Content-Type": "application/json" }');
    console.log(`Body: { 
  "class_id": "123",
  "childs": [999, 1000]  // Invalid child IDs
}`);
    console.log('Expected: 403 Forbidden - "You can only add your own children to the cart"');
    
    // 3. Test updating cart with invalid child IDs
    console.log('\n3. Testing cart/update with invalid child IDs...');
    console.log(`POST ${BASE_URL}/cart/update`);
    console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN", "Content-Type": "application/json" }');
    console.log(`Body: { 
  "cartitem": "123-1703123456789",
  "childs": [999, 1000]  // Invalid child IDs
}`);
    console.log('Expected: 403 Forbidden - "You can only assign your own children to the cart"');
    
    // 4. Test viewing cart without authentication
    console.log('\n4. Testing cart11 without authentication...');
    try {
      await axios.get(`${BASE_URL}/cart11`);
    } catch (error) {
      console.log('✅ Expected error (no auth):', error.response?.status, error.response?.data);
    }
    
    // 5. Test getting children without authentication
    console.log('\n5. Testing cart/children without authentication...');
    try {
      await axios.get(`${BASE_URL}/cart/children`);
    } catch (error) {
      console.log('✅ Expected error (no auth):', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Test valid flow (with authentication)
async function testValidFlow() {
  console.log('\n✅ Testing Valid Flow (with authentication)...\n');
  
  console.log('1. Get user\'s children:');
  console.log(`GET ${BASE_URL}/cart/children`);
  console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }');
  console.log('Expected: List of user\'s children only');
  
  console.log('\n2. Add class with user\'s children:');
  console.log(`POST ${BASE_URL}/cart/add`);
  console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN", "Content-Type": "application/json" }');
  console.log(`Body: { 
  "class_id": "123",
  "childs": [1, 2]  // Valid child IDs belonging to user
}`);
  console.log('Expected: Success - Class added with children');
  
  console.log('\n3. View cart:');
  console.log(`GET ${BASE_URL}/cart11`);
  console.log('Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }');
  console.log('Expected: Cart with sibling discounts calculated');
}

// Run tests
async function runTests() {
  await testCartSecurity();
  await testValidFlow();
}

runTests(); 