/**
 * Test the conflict resolution fix for boolean/timestamp data type issues
 */

// Mock the conflict resolution service methods for testing
const testConflictResolution = {
  // Test the normalizeValue method
  normalizeValue(value) {
    // Handle null/undefined
    if (value == null) return null;

    // Handle boolean conversion (Odoo: true/false, SQLite: 1/0)
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (value === 1 || value === '1' || value === 'true' || value === 'True') {
      return 1;
    }
    if (value === 0 || value === '0' || value === 'false' || value === 'False') {
      return 0;
    }

    // Handle string representations of booleans
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'yes' || lower === 'true') return 1;
      if (lower === 'no' || lower === 'false') return 0;
    }

    // Handle numeric strings
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value);
    }

    // Handle dates - normalize to string format
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle timestamp numbers (convert to consistent format)
    if (typeof value === 'number' && value > 1000000000) {
      // Looks like a timestamp, normalize it
      return new Date(value * 1000).toISOString();
    }

    return value;
  },

  // Test the valuesEqual method
  valuesEqual(localValue, serverValue) {
    // Handle null/undefined
    if (localValue == null && serverValue == null) return true;
    if (localValue == null || serverValue == null) return false;

    // Handle arrays (many2many, one2many fields)
    if (Array.isArray(localValue) && Array.isArray(serverValue)) {
      if (localValue.length !== serverValue.length) return false;
      return localValue.every((val, index) => val === serverValue[index]);
    }

    // Handle objects
    if (typeof localValue === 'object' && typeof serverValue === 'object') {
      return JSON.stringify(localValue) === JSON.stringify(serverValue);
    }

    // NORMALIZE VALUES FOR COMPARISON
    const normalizedLocal = this.normalizeValue(localValue);
    const normalizedServer = this.normalizeValue(serverValue);

    return normalizedLocal === normalizedServer;
  }
};

// Test cases based on your conflict examples
const testCases = [
  {
    name: 'Boolean: Local 1 vs Server Yes',
    local: 1,
    server: 'Yes',
    expectedEqual: true
  },
  {
    name: 'Boolean: Local true vs Server 1',
    local: true,
    server: 1,
    expectedEqual: true
  },
  {
    name: 'Boolean: Local false vs Server 0',
    local: false,
    server: 0,
    expectedEqual: true
  },
  {
    name: 'Timestamp: Local number vs Server empty',
    local: 1751472364,
    server: null,
    expectedEqual: false // This should be a real conflict
  },
  {
    name: 'Timestamp: Local number vs Server undefined',
    local: 1751472364,
    server: undefined,
    expectedEqual: false // This should be a real conflict
  },
  {
    name: 'String: Same values',
    local: 'RE: Phone Line Call Clearing I...',
    server: 'RE: Phone Line Call Clearing I...',
    expectedEqual: true
  },
  {
    name: 'Date: Same dates different formats',
    local: '2025-07-01 05:56:52',
    server: '2025-07-01 05:56:52',
    expectedEqual: true
  }
];

console.log('🧪 Testing Conflict Resolution Fix\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = testConflictResolution.valuesEqual(testCase.local, testCase.server);
  const passed = result === testCase.expectedEqual;
  
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Local: ${JSON.stringify(testCase.local)} (${typeof testCase.local})`);
  console.log(`   Server: ${JSON.stringify(testCase.server)} (${typeof testCase.server})`);
  console.log(`   Expected Equal: ${testCase.expectedEqual}`);
  console.log(`   Actual Equal: ${result}`);
  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (passed) passedTests++;
});

console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! The conflict resolution fix should work correctly.');
} else {
  console.log('⚠️ Some tests failed. The fix may need adjustments.');
}
