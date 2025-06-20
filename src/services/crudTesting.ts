/**
 * CRUD Testing Service for Users and Contacts
 * Comprehensive testing of Create, Read, Update, Delete operations
 */

import { authService } from './auth';
import { databaseService } from './database';

interface TestResult {
  operation: string;
  model: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

class CRUDTestingService {
  private testResults: TestSuite[] = [];

  /**
   * Run comprehensive CRUD tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting CRUD Testing Suite...');
    
    this.testResults = [];
    
    // Test Users CRUD
    await this.testUsersCRUD();
    
    // Test Contacts CRUD
    await this.testContactsCRUD();
    
    // Print summary
    this.printTestSummary();
    
    return this.testResults;
  }

  /**
   * Test Users CRUD operations
   */
  private async testUsersCRUD(): Promise<void> {
    const suite: TestSuite = {
      name: 'Users CRUD Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    console.log('\n👤 Testing Users CRUD...');

    // Test 1: Read existing users
    await this.runTest(suite, 'READ', 'res.users', async () => {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');
      
      const users = await client.searchRead('res.users', [], ['name', 'login', 'email'], { limit: 5 });
      console.log(`📖 Found ${users.length} users`);
      return users;
    });

    // Test 2: Create a test user
    let testUserId: number | null = null;
    await this.runTest(suite, 'CREATE', 'res.users', async () => {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');
      
      const userData = {
        name: `Test User ${Date.now()}`,
        login: `testuser_${Date.now()}@example.com`,
        email: `testuser_${Date.now()}@example.com`,
        password: 'testpassword123',
      };
      
      testUserId = await client.create('res.users', userData);
      console.log(`✨ Created user with ID: ${testUserId}`);
      return { id: testUserId, ...userData };
    });

    // Test 3: Update the test user
    if (testUserId) {
      await this.runTest(suite, 'UPDATE', 'res.users', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');
        
        const updateData = {
          name: `Updated Test User ${Date.now()}`,
        };
        
        const result = await client.update('res.users', testUserId!, updateData);
        console.log(`📝 Updated user ${testUserId}`);
        return result;
      });

      // Test 4: Read the updated user
      await this.runTest(suite, 'READ_UPDATED', 'res.users', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');
        
        const user = await client.read('res.users', testUserId!, ['name', 'login', 'email']);
        console.log(`📖 Read updated user:`, user[0]);
        return user[0];
      });

      // Test 5: Delete the test user
      await this.runTest(suite, 'DELETE', 'res.users', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');
        
        const result = await client.delete('res.users', testUserId!);
        console.log(`🗑️ Deleted user ${testUserId}`);
        return result;
      });
    }

    this.testResults.push(suite);
  }

  /**
   * Test Contacts CRUD operations
   */
  private async testContactsCRUD(): Promise<void> {
    const suite: TestSuite = {
      name: 'Contacts CRUD Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    console.log('\n👥 Testing Contacts CRUD...');

    // Test 1: Read existing contacts
    await this.runTest(suite, 'READ', 'res.partner', async () => {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');
      
      const contacts = await client.searchRead('res.partner', [], ['name', 'email', 'phone', 'is_company'], { limit: 5 });
      console.log(`📖 Found ${contacts.length} contacts`);
      return contacts;
    });

    // Test 2: Create a test contact
    let testContactId: number | null = null;
    await this.runTest(suite, 'CREATE', 'res.partner', async () => {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');
      
      const contactData = {
        name: `Test Contact ${Date.now()}`,
        email: `testcontact_${Date.now()}@example.com`,
        phone: '+1234567890',
        is_company: false,
      };
      
      testContactId = await client.create('res.partner', contactData);
      console.log(`✨ Created contact with ID: ${testContactId}`);
      return { id: testContactId, ...contactData };
    });

    // Test 3: Update the test contact
    if (testContactId) {
      await this.runTest(suite, 'UPDATE', 'res.partner', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');
        
        const updateData = {
          name: `Updated Test Contact ${Date.now()}`,
          phone: '+0987654321',
        };
        
        const result = await client.update('res.partner', testContactId!, updateData);
        console.log(`📝 Updated contact ${testContactId}`);
        return result;
      });

      // Test 4: Read the updated contact
      await this.runTest(suite, 'READ_UPDATED', 'res.partner', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');
        
        const contact = await client.read('res.partner', testContactId!, ['name', 'email', 'phone', 'is_company']);
        console.log(`📖 Read updated contact:`, contact[0]);
        return contact[0];
      });

      // Test 5: Delete the test contact
      await this.runTest(suite, 'DELETE', 'res.partner', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');
        
        const result = await client.delete('res.partner', testContactId!);
        console.log(`🗑️ Deleted contact ${testContactId}`);
        return result;
      });
    }

    this.testResults.push(suite);
  }

  /**
   * Run a single test
   */
  private async runTest(
    suite: TestSuite,
    operation: string,
    model: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`  🧪 Testing ${operation} on ${model}...`);
      const data = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        operation,
        model,
        success: true,
        data,
        duration,
      };
      
      suite.results.push(result);
      suite.passedTests++;
      suite.totalDuration += duration;
      
      console.log(`  ✅ ${operation} ${model} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        operation,
        model,
        success: false,
        error: error.message,
        duration,
      };
      
      suite.results.push(result);
      suite.failedTests++;
      suite.totalDuration += duration;
      
      console.log(`  ❌ ${operation} ${model} - FAILED (${duration}ms): ${error.message}`);
    }
    
    suite.totalTests++;
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    console.log('\n📊 CRUD Testing Summary');
    console.log('========================');
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    
    this.testResults.forEach(suite => {
      console.log(`\n${suite.name}:`);
      console.log(`  Total: ${suite.totalTests}`);
      console.log(`  Passed: ${suite.passedTests} ✅`);
      console.log(`  Failed: ${suite.failedTests} ❌`);
      console.log(`  Duration: ${suite.totalDuration}ms`);
      
      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
      totalDuration += suite.totalDuration;
    });
    
    console.log('\n🎯 Overall Results:');
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed} ✅`);
    console.log(`  Failed: ${totalFailed} ❌`);
    console.log(`  Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! Your CRUD operations are working perfectly!');
    } else {
      console.log('\n⚠️ Some tests failed. Check the error messages above.');
    }
  }

  /**
   * Get test results
   */
  getTestResults(): TestSuite[] {
    return this.testResults;
  }
}

export const crudTestingService = new CRUDTestingService();
