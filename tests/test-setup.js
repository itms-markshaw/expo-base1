/**
 * Simple test to verify our setup works
 */

console.log('🧪 Testing Odoo Sync App Setup...');

// Test 1: Check if we can import our config
try {
  const config = require('../src/config/odoo.ts');
  console.log('✅ Config loaded successfully');
  console.log('   Server:', config.ODOO_CONFIG?.baseURL || 'Not found');
} catch (error) {
  console.log('❌ Config failed:', error.message);
}

// Test 2: Check if we can import our services
try {
  const { OdooXMLRPCClient } = require('../src/services/OdooXMLRPCClient.ts');
  console.log('✅ OdooXMLRPCClient imported successfully');
} catch (error) {
  console.log('❌ OdooXMLRPCClient import failed:', error.message);
}

console.log('🎯 Setup test complete!');
console.log('');
console.log('Next steps:');
console.log('1. Run: npx expo start');
console.log('2. Open Expo Go on your phone');
console.log('3. Scan the QR code');
console.log('4. Test the login functionality');
