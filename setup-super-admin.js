/**
 * Super Admin Setup Script
 * 
 * This script sets up a single super admin user for the admin panel.
 * Run this script once during initial setup.
 * 
 * Usage:
 * node setup-super-admin.js <email>
 * 
 * Example:
 * node setup-super-admin.js admin@example.com
 */

const readline = require('readline');

// You'll need to set these environment variables or replace with your actual values
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qjvrzdcucqwxvajsjefe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-here') {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  console.log('Please set your Supabase service role key:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"');
  console.log('');
  console.log('You can find your service role key in your Supabase project settings > API');
  process.exit(1);
}

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

async function getCurrentSuperAdmin() {
  try {
    const users = await makeSupabaseRequest('users?role=eq.super_admin&select=id,email,full_name,created_at');
    return users && users.length > 0 ? users[0] : null;
  } catch (error) {
    throw new Error(`Failed to get current super admin: ${error.message}`);
  }
}

async function findUserByEmail(email) {
  try {
    const users = await makeSupabaseRequest(`users?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,role`);
    return users && users.length > 0 ? users[0] : null;
  } catch (error) {
    throw new Error(`Failed to find user: ${error.message}`);
  }
}

async function updateUserRole(userId, role) {
  try {
    const result = await makeSupabaseRequest(`users?id=eq.${userId}`, 'PATCH', { role });
    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }
}

async function listAllUsers() {
  try {
    const users = await makeSupabaseRequest('users?select=id,email,full_name,role,created_at&order=created_at.desc');
    return users || [];
  } catch (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🛡️  Super Admin Setup Script');
  console.log('================================');
  console.log('');

  try {
    // Check if email was provided as argument
    let targetEmail = process.argv[2];

    // Check current super admin status
    console.log('📋 Checking current super admin status...');
    const currentSuperAdmin = await getCurrentSuperAdmin();
    
    if (currentSuperAdmin) {
      console.log(`✅ Current super admin: ${currentSuperAdmin.full_name} (${currentSuperAdmin.email})`);
      console.log('');
      
      if (!targetEmail) {
        const answer = await askQuestion('A super admin already exists. Do you want to change it? (y/N): ');
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('👋 Setup cancelled.');
          return;
        }
      }
    } else {
      console.log('⚠️  No super admin currently set.');
      console.log('');
    }

    // Get target email if not provided
    if (!targetEmail) {
      console.log('📋 Available users:');
      const users = await listAllUsers();
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name} (${user.email}) - ${user.role}`);
      });
      console.log('');
      
      targetEmail = await askQuestion('Enter the email address of the user to make super admin: ');
    }

    if (!targetEmail) {
      console.log('❌ No email provided. Exiting.');
      return;
    }

    // Find the target user
    console.log(`🔍 Looking for user: ${targetEmail}`);
    const targetUser = await findUserByEmail(targetEmail);
    
    if (!targetUser) {
      console.log(`❌ User not found: ${targetEmail}`);
      console.log('Make sure the user has registered in the system first.');
      return;
    }

    console.log(`✅ Found user: ${targetUser.full_name} (${targetUser.email})`);
    console.log(`   Current role: ${targetUser.role}`);
    console.log('');

    // Confirm the action
    if (!process.argv[2]) { // Only ask for confirmation if email wasn't provided as argument
      const confirm = await askQuestion(`Are you sure you want to make ${targetUser.full_name} the super admin? (y/N): `);
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('👋 Setup cancelled.');
        return;
      }
    }

    // Update the user role
    console.log('🔄 Updating user role...');
    await updateUserRole(targetUser.id, 'super_admin');
    
    console.log('');
    console.log('🎉 Success!');
    console.log(`✅ ${targetUser.full_name} (${targetUser.email}) is now the super admin.`);
    console.log('');
    console.log('Next steps:');
    console.log('1. The user can now log in to the admin panel');
    console.log('2. They will have full access to all admin features');
    console.log('3. They can create additional admin users if needed');
    console.log('');
    console.log('🔗 Admin panel URL: /login');

  } catch (error) {
    console.error('❌ Error:', error.message);
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
