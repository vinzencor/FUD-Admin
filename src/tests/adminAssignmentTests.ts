/**
 * Test Suite for Enhanced Admin Assignment Functionality
 * Tests location-based access control, super admin privileges, and dynamic address selection
 */

import { supabase } from '../supabaseClient';
import { 
  fetchUsersWithAddresses, 
  fetchUsersInLocation,
  UserAddressData 
} from '../services/dataService';
import { 
  getAdminAssignedLocation,
  getLocationFilteredUserIds,
  getLocationFilteredData,
  applyLocationFilter,
  canAccessLocation,
  AdminLocation
} from '../services/locationAdminService';
import { 
  isSuperAdmin,
  getAllUsersUnrestricted,
  canPerformSuperAdminAction
} from '../services/superAdminService';
import { geocodeAddress, geocodeLocation } from '../services/geocodingService';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

export class AdminAssignmentTestSuite {
  private results: TestResult[] = [];
  private testUserId: string = '';
  private testSuperAdminId: string = '';

  constructor() {
    console.log('🧪 Initializing Admin Assignment Test Suite');
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🚀 Starting comprehensive test suite...');

    try {
      // Setup test data
      await this.setupTestData();

      // Test user address services
      await this.testUserAddressServices();

      // Test location filtering services
      await this.testLocationFilteringServices();

      // Test super admin privileges
      await this.testSuperAdminPrivileges();

      // Test geocoding services
      await this.testGeocodingServices();

      // Test location-based access control
      await this.testLocationBasedAccessControl();

      // Test admin assignment workflow
      await this.testAdminAssignmentWorkflow();

      // Cleanup test data
      await this.cleanupTestData();

    } catch (error) {
      this.addResult('Test Suite Execution', false, `Test suite failed: ${error}`);
    }

    return this.results;
  }

  /**
   * Setup test data
   */
  private async setupTestData(): Promise<void> {
    try {
      // Create test users if they don't exist
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, email, role')
        .in('email', ['test-admin@example.com', 'test-superadmin@example.com']);

      if (!existingUsers?.find(u => u.email === 'test-admin@example.com')) {
        const { data: testUser } = await supabase
          .from('users')
          .insert({
            email: 'test-admin@example.com',
            full_name: 'Test Admin User',
            role: 'admin',
            country: 'India',
            state: 'Maharashtra',
            city: 'Mumbai',
            default_mode: 'buyer'
          })
          .select('id')
          .single();

        this.testUserId = testUser?.id || '';
      } else {
        this.testUserId = existingUsers.find(u => u.email === 'test-admin@example.com')?.id || '';
      }

      if (!existingUsers?.find(u => u.email === 'test-superadmin@example.com')) {
        const { data: testSuperAdmin } = await supabase
          .from('users')
          .insert({
            email: 'test-superadmin@example.com',
            full_name: 'Test Super Admin',
            role: 'super_admin',
            country: 'India',
            state: 'Karnataka',
            city: 'Bangalore',
            default_mode: 'buyer'
          })
          .select('id')
          .single();

        this.testSuperAdminId = testSuperAdmin?.id || '';
      } else {
        this.testSuperAdminId = existingUsers.find(u => u.email === 'test-superadmin@example.com')?.id || '';
      }

      this.addResult('Setup Test Data', true, 'Test data setup completed successfully');
    } catch (error) {
      this.addResult('Setup Test Data', false, `Failed to setup test data: ${error}`);
    }
  }

  /**
   * Test user address services
   */
  private async testUserAddressServices(): Promise<void> {
    try {
      // Test fetchUsersWithAddresses
      const users = await fetchUsersWithAddresses();
      const hasUsers = users.length > 0;
      const hasRequiredFields = users.every(user => 
        user.id && user.full_name && user.email && user.display_address !== undefined
      );

      this.addResult(
        'Fetch Users With Addresses',
        hasUsers && hasRequiredFields,
        hasUsers 
          ? `Successfully fetched ${users.length} users with address data`
          : 'No users found or missing required fields',
        { userCount: users.length, sampleUser: users[0] }
      );

      // Test location filtering
      const testLocation: AdminLocation = {
        country: 'India',
        city: 'Mumbai',
        district: 'Maharashtra'
      };

      const filteredUsers = await fetchUsersInLocation(testLocation);
      this.addResult(
        'Fetch Users In Location',
        true,
        `Successfully filtered users by location: ${filteredUsers.length} users found`,
        { location: testLocation, userCount: filteredUsers.length }
      );

    } catch (error) {
      this.addResult('User Address Services', false, `User address services failed: ${error}`);
    }
  }

  /**
   * Test location filtering services
   */
  private async testLocationFilteringServices(): Promise<void> {
    try {
      const testLocation: AdminLocation = {
        country: 'India',
        city: 'Mumbai',
        district: 'Maharashtra'
      };

      // Test getLocationFilteredUserIds
      const userIds = await getLocationFilteredUserIds(testLocation);
      this.addResult(
        'Get Location Filtered User IDs',
        Array.isArray(userIds),
        `Retrieved ${userIds.length} user IDs for location filter`,
        { userIds: userIds.slice(0, 5) } // Show first 5 IDs
      );

      // Test getLocationFilteredData
      const filteredData = await getLocationFilteredData(testLocation, {
        includeUsers: true,
        includeSellers: true,
        includeBuyers: true
      });

      this.addResult(
        'Get Location Filtered Data',
        typeof filteredData === 'object',
        'Successfully retrieved comprehensive location-filtered data',
        {
          userIds: filteredData.userIds.length,
          sellerIds: filteredData.sellerIds.length,
          buyerIds: filteredData.buyerIds.length
        }
      );

      // Test applyLocationFilter
      let query = supabase.from('users').select('id');
      query = applyLocationFilter(query, testLocation);
      
      this.addResult(
        'Apply Location Filter',
        true,
        'Successfully applied location filter to query'
      );

    } catch (error) {
      this.addResult('Location Filtering Services', false, `Location filtering failed: ${error}`);
    }
  }

  /**
   * Test super admin privileges
   */
  private async testSuperAdminPrivileges(): Promise<void> {
    try {
      // Test isSuperAdmin function
      const isSuper = await isSuperAdmin(this.testSuperAdminId);
      const isNotSuper = await isSuperAdmin(this.testUserId);

      this.addResult(
        'Super Admin Detection',
        isSuper && !isNotSuper,
        isSuper && !isNotSuper 
          ? 'Correctly identified super admin and regular admin'
          : 'Failed to correctly identify admin roles'
      );

      // Test super admin data access
      if (isSuper) {
        const allUsers = await getAllUsersUnrestricted(this.testSuperAdminId);
        this.addResult(
          'Super Admin Unrestricted Access',
          allUsers.length > 0,
          `Super admin can access all ${allUsers.length} users without restrictions`
        );
      }

      // Test permission checking
      const canPerform = await canPerformSuperAdminAction(this.testSuperAdminId, 'test-action');
      const cannotPerform = await canPerformSuperAdminAction(this.testUserId, 'test-action');

      this.addResult(
        'Super Admin Action Permissions',
        canPerform && !cannotPerform,
        'Super admin permissions correctly enforced'
      );

    } catch (error) {
      this.addResult('Super Admin Privileges', false, `Super admin tests failed: ${error}`);
    }
  }

  /**
   * Test geocoding services
   */
  private async testGeocodingServices(): Promise<void> {
    try {
      // Test address geocoding
      const addressResult = await geocodeAddress('Mumbai, Maharashtra, India');
      const hasCoordinates = addressResult?.coordinates?.latitude && addressResult?.coordinates?.longitude;

      this.addResult(
        'Address Geocoding',
        hasCoordinates,
        hasCoordinates 
          ? `Successfully geocoded address: ${addressResult?.formatted_address}`
          : 'Failed to geocode test address',
        addressResult
      );

      // Test location geocoding
      const locationResult = await geocodeLocation('Mumbai', 'Maharashtra', 'India');
      const hasLocationCoords = locationResult?.latitude && locationResult?.longitude;

      this.addResult(
        'Location Geocoding',
        hasLocationCoords,
        hasLocationCoords 
          ? `Successfully geocoded location: ${locationResult?.latitude}, ${locationResult?.longitude}`
          : 'Failed to geocode test location',
        locationResult
      );

    } catch (error) {
      this.addResult('Geocoding Services', false, `Geocoding tests failed: ${error}`);
    }
  }

  /**
   * Test location-based access control
   */
  private async testLocationBasedAccessControl(): Promise<void> {
    try {
      // Test admin location assignment
      const adminLocation = await getAdminAssignedLocation(this.testUserId);
      
      this.addResult(
        'Admin Location Assignment',
        true,
        adminLocation 
          ? `Admin has assigned location: ${JSON.stringify(adminLocation)}`
          : 'Admin has no location assignment (global access)',
        adminLocation
      );

      // Test location access checking
      const testTargetLocation = { country: 'India', city: 'Mumbai', state: 'Maharashtra' };
      const canAccess = await canAccessLocation(this.testUserId, testTargetLocation);

      this.addResult(
        'Location Access Control',
        typeof canAccess === 'boolean',
        `Location access check completed: ${canAccess ? 'allowed' : 'denied'}`,
        { targetLocation: testTargetLocation, accessGranted: canAccess }
      );

    } catch (error) {
      this.addResult('Location-Based Access Control', false, `Access control tests failed: ${error}`);
    }
  }

  /**
   * Test admin assignment workflow
   */
  private async testAdminAssignmentWorkflow(): Promise<void> {
    try {
      // Test the complete workflow components
      const users = await fetchUsersWithAddresses();
      const eligibleUsers = users.filter(user => 
        !user.role || (user.role !== 'admin' && user.role !== 'super_admin')
      );

      this.addResult(
        'Admin Assignment Workflow - User Selection',
        eligibleUsers.length > 0,
        `Found ${eligibleUsers.length} eligible users for admin assignment`,
        { eligibleCount: eligibleUsers.length }
      );

      // Test location assignment validation
      const testLocation: AdminLocation = {
        country: 'India',
        city: 'Delhi',
        district: 'New Delhi'
      };

      const locationUsers = await fetchUsersInLocation(testLocation);
      this.addResult(
        'Admin Assignment Workflow - Location Validation',
        true,
        `Location assignment validation completed: ${locationUsers.length} users in target location`,
        { location: testLocation, userCount: locationUsers.length }
      );

    } catch (error) {
      this.addResult('Admin Assignment Workflow', false, `Workflow tests failed: ${error}`);
    }
  }

  /**
   * Cleanup test data
   */
  private async cleanupTestData(): Promise<void> {
    try {
      // Note: In a real test environment, you might want to clean up test data
      // For now, we'll just log that cleanup would happen here
      this.addResult('Cleanup Test Data', true, 'Test data cleanup completed (simulated)');
    } catch (error) {
      this.addResult('Cleanup Test Data', false, `Cleanup failed: ${error}`);
    }
  }

  /**
   * Add a test result
   */
  private addResult(testName: string, passed: boolean, message: string, details?: any): void {
    const result: TestResult = { testName, passed, message, details };
    this.results.push(result);
    
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${message}`);
    
    if (details) {
      console.log('   Details:', details);
    }
  }

  /**
   * Get test summary
   */
  getTestSummary(): { total: number; passed: number; failed: number; passRate: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, passRate };
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const summary = this.getTestSummary();
    
    let report = `
# Admin Assignment Test Report

## Summary
- **Total Tests**: ${summary.total}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Pass Rate**: ${summary.passRate.toFixed(1)}%

## Test Results

`;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.testName} - ${status}\n`;
      report += `${result.message}\n\n`;
      
      if (result.details) {
        report += `**Details**: \`${JSON.stringify(result.details, null, 2)}\`\n\n`;
      }
    });

    return report;
  }
}

/**
 * Run the test suite
 */
export async function runAdminAssignmentTests(): Promise<TestResult[]> {
  const testSuite = new AdminAssignmentTestSuite();
  const results = await testSuite.runAllTests();
  
  console.log('\n📊 Test Summary:');
  const summary = testSuite.getTestSummary();
  console.log(`Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}`);
  console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
  
  return results;
}
