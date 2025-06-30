/**
 * Super Admin Verification Script
 * 
 * This script verifies the super admin setup and shows current status.
 * 
 * Usage:
 * node verify-super-admin.js
 */

// You'll need to set these environment variables or replace with your actual values
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qjvrzdcucqwxvajsjefe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

async function makeSupabaseRequest(endpoint, method = 'GET', data = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const options = {
    method,
    headers
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseData}`);
    }

    return responseData ? JSON.parse(responseData) : null;
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function main() {
  console.log('🛡️  Super Admin Verification');
  console.log('============================');
  console.log('');

  try {
    // Check super admin status
    console.log('📋 Checking super admin status...');
    const superAdmins = await makeSupabaseRequest('users?role=eq.super_admin&select=id,email,full_name,created_at');
    
    if (!superAdmins || superAdmins.length === 0) {
      console.log('❌ No super admin found!');
      console.log('');
      console.log('To set up a super admin, run:');
      console.log('node setup-super-admin.js');
      return;
    }

    if (superAdmins.length > 1) {
      console.log('⚠️  Warning: Multiple super admins found!');
      console.log('The system is designed to have only one super admin.');
      console.log('');
    }

    console.log(`✅ Super Admin Status: ${superAdmins.length} super admin(s) found`);
    console.log('');

    superAdmins.forEach((admin, index) => {
      console.log(`Super Admin ${index + 1}:`);
      console.log(`  Name: ${admin.full_name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  ID: ${admin.id}`);
      console.log(`  Created: ${new Date(admin.created_at).toLocaleString()}`);
      console.log('');
    });

    // Check all user roles
    console.log('📊 User Role Summary:');
    const allUsers = await makeSupabaseRequest('users?select=role&order=role');
    
    const roleCounts = {};
    allUsers.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });

    Object.entries(roleCounts).forEach(([role, count]) => {
      const emoji = role === 'super_admin' ? '👑' : role === 'admin' ? '🔧' : '👤';
      console.log(`  ${emoji} ${role}: ${count} user(s)`);
    });

    console.log('');
    console.log('🎉 Verification complete!');
    
    if (superAdmins.length === 1) {
      console.log('✅ System is properly configured with one super admin.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test login with the super admin credentials');
      console.log('2. Access the admin dashboard');
      console.log('3. Verify all features are accessible');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('service_role')) {
      console.log('');
      console.log('Make sure to set your SUPABASE_SERVICE_ROLE_KEY:');
      console.log('export SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"');
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}
