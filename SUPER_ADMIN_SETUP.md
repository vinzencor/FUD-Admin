# Super Admin Setup Guide

This guide will help you set up a single super administrator for your admin panel system.

## Overview

The system is designed to have **only one super admin** at a time. The super admin has full access to:
- Dashboard with all statistics
- User management (Members, Farmers)
- Order management
- Feedback management
- Reports generation
- Activity logs
- System settings
- Role assignment for other users

## Prerequisites

1. Make sure you have run the database migration to add the role column:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `database-migrations/add-role-column.sql`

2. Ensure you have at least one user registered in the system (the user you want to make super admin)

## Method 1: Using the Setup Script (Recommended)

### Step 1: Set up environment variables

You need your Supabase service role key. Find it in your Supabase project:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the "anon" key)

Set the environment variable:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key-here"
```

### Step 2: Run the setup script

```bash
# Interactive mode - will show you all users and ask for confirmation
node setup-super-admin.js

# Direct mode - specify email directly
node setup-super-admin.js admin@example.com
```

The script will:
1. Check if there's already a super admin
2. Show you all available users
3. Let you select which user to make super admin
4. Update the user's role in the database
5. Confirm the setup

## Method 2: Using the Web Interface

### Step 1: Access the setup page

Navigate to: `http://localhost:5173/setup-super-admin`

### Step 2: Select and set up super admin

1. The page will show you the current super admin status
2. Select a user from the dropdown
3. Click "Set as Super Admin"
4. The system will update the user's role

## Method 3: Direct Database Query

If you prefer to do it manually via SQL:

```sql
-- Replace 'admin@example.com' with the actual email
UPDATE public.users 
SET role = 'super_admin' 
WHERE email = 'admin@example.com';

-- Verify it worked
SELECT id, email, full_name, role FROM public.users WHERE role = 'super_admin';
```

## Verification

After setting up the super admin:

1. **Login Test**: The super admin user should be able to log in at `/login`
2. **Dashboard Access**: They should see the full dashboard with all 6 cards:
   - Total Members
   - Farmers (Sellers)
   - Orders
   - Feedback
   - Reports
   - Activity Log
3. **Navigation**: The sidebar should show all menu items including Farmers, Reports, and Activity Logs
4. **Role Management**: They should be able to access user management features

## Important Notes

### Single Super Admin Policy
- The system enforces having only **one super admin** at a time
- If you try to set up a second super admin, you'll get a warning
- To change the super admin, you must either:
  - Use the "Change Super Admin" option in the web interface
  - Use the setup script which will ask for confirmation
  - Manually reset the current super admin first

### Security Considerations
- The super admin has full system access
- Choose a trusted user with a secure email account
- Consider using a dedicated admin email address
- The super admin can create additional admin users with limited permissions

### Troubleshooting

**"Role column doesn't exist" error:**
- Run the database migration first: `database-migrations/add-role-column.sql`

**"User not found" error:**
- Make sure the user has registered in the system first
- Check the email spelling

**"Permission denied" error:**
- Make sure you're using the service role key, not the anon key
- Check that RLS policies are set up correctly

**Can't access admin panel:**
- Clear browser cache and cookies
- Check that the user's role was actually updated in the database
- Verify the login credentials

## Next Steps

After setting up the super admin:

1. **Test the login** - Make sure the super admin can log in
2. **Explore the dashboard** - Check that all cards and navigation work
3. **Create additional admins** - Use the Members page to assign admin roles to other users
4. **Set up regions** - If using regional admins, configure the regions
5. **Remove setup access** - Consider removing the `/setup-super-admin` route in production

## File Structure

```
project/
├── setup-super-admin.js              # Setup script
├── SUPER_ADMIN_SETUP.md              # This guide
├── src/
│   ├── pages/SuperAdminSetup.tsx     # Web setup interface
│   ├── utils/setupSuperAdmin.ts      # Setup utilities
│   └── utils/roleManagement.ts       # Role management functions
└── database-migrations/
    └── add-role-column.sql           # Database migration
```

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the Supabase logs in your project dashboard
3. Verify the database schema and RLS policies
4. Ensure environment variables are set correctly
