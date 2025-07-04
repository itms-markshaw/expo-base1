/**
 * CRUDTestingService - CRUD Testing Service for Users and Contacts
 * Model-specific service for app.testing
 *
 * MIGRATED: From src/services/crudTesting.ts
 * Comprehensive testing of Create, Read, Update, Delete operations
 */

import { authService } from '../../base/services/BaseAuthService';
import { databaseService } from '../../base/services/BaseDatabaseService';
import { crmActionsService } from '../../crm_lead/services/CRMLeadService';

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

    // Test CRM Leads CRUD + Actions
    await this.testCRMLeadsCRUD();

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
   * Test CRM Leads CRUD + Actions
   */
  private async testCRMLeadsCRUD(): Promise<void> {
    const suite: TestSuite = {
      name: 'CRM Leads CRUD + Actions Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
    };

    console.log('\n🎯 Testing CRM Leads CRUD + Actions...');

    // Test 1: Read existing leads
    await this.runTest(suite, 'READ', 'crm.lead', async () => {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const leads = await client.searchRead('crm.lead', [],
        ['name', 'partner_name', 'email_from', 'phone', 'stage_id', 'probability'],
        { limit: 5 }
      );
      console.log(`📖 Found ${leads.length} leads`);
      return leads;
    });

    // Test 2: Create a test lead
    let testLeadId: number | null = null;
    await this.runTest(suite, 'CREATE', 'crm.lead', async () => {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const leadData = {
        name: `Test Lead ${Date.now()}`,
        partner_name: `Test Company ${Date.now()}`,
        email_from: `testlead_${Date.now()}@example.com`,
        phone: '+1234567890',
        description: 'This is a test lead created by CRUD testing',
        type: 'lead',
        probability: 10,
        expected_revenue: 5000,
      };

      testLeadId = await client.create('crm.lead', leadData);
      console.log(`✨ Created lead with ID: ${testLeadId}`);
      return { id: testLeadId, ...leadData };
    });

    if (testLeadId) {
      // Test 3: Update the test lead
      await this.runTest(suite, 'UPDATE', 'crm.lead', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');

        const updateData = {
          name: `Updated Test Lead ${Date.now()}`,
          probability: 25,
          expected_revenue: 7500,
        };

        const result = await client.update('crm.lead', testLeadId!, updateData);
        console.log(`📝 Updated lead ${testLeadId}`);
        return result;
      });

      // Test 4: Read the updated lead
      await this.runTest(suite, 'READ_UPDATED', 'crm.lead', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');

        const lead = await client.read('crm.lead', testLeadId!,
          ['name', 'partner_name', 'email_from', 'probability', 'expected_revenue', 'stage_id']
        );
        console.log(`📖 Read updated lead:`, lead[0]);
        return lead[0];
      });

      // Test 5: CRM Action - Convert to Opportunity
      await this.runTest(suite, 'CONVERT_TO_OPPORTUNITY', 'crm.lead', async () => {
        const result = await crmActionsService.convertToOpportunity(testLeadId!);
        if (!result.success) throw new Error(result.error);
        console.log(`🔄 Converted lead ${testLeadId} to opportunity`);
        return result;
      });

      // Test 6: CRM Action - Schedule Activity
      await this.runTest(suite, 'SCHEDULE_ACTIVITY', 'crm.lead', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const result = await crmActionsService.scheduleActivity(
          testLeadId!,
          'Call',
          'Test follow-up call',
          tomorrow.toISOString().split('T')[0]
        );
        if (!result.success) throw new Error(result.error);
        console.log(`📅 Scheduled activity for lead ${testLeadId}`);
        return result;
      });

      // Test 7: CRM Action - Mark as Won
      await this.runTest(suite, 'MARK_AS_WON', 'crm.lead', async () => {
        const result = await crmActionsService.markAsWon(testLeadId!, 7500);
        if (!result.success) throw new Error(result.error);
        console.log(`🏆 Marked lead ${testLeadId} as won`);
        return result;
      });

      // Test 8: Delete the test lead
      await this.runTest(suite, 'DELETE', 'crm.lead', async () => {
        const client = authService.getClient();
        if (!client) throw new Error('Not authenticated');

        const result = await client.delete('crm.lead', testLeadId!);
        console.log(`🗑️ Deleted lead ${testLeadId}`);
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
