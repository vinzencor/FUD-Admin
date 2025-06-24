# Role Management Setup Guide

This guide will help you set up role-based access control for your admin panel.

## Overview

The role management system supports three user roles:
- **User**: Basic platform access for buying and selling
- **Admin**: View-only access to admin features (can see members, orders, interests but cannot edit/delete)
- **Super Admin**: Full system access including user management, role assignment, and direct password changes

## Database Setup

### Step 1: Run the Database Migration

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database-migrations/add-role-column.sql`
4. Execute the SQL script

This will:
- Add a `role` column to the `users` table
- Set up Row Level Security (RLS) policies
- Create helper functions for role checking
- Add appropriate indexes and constraints

### Step 2: Create Your First Super Admin

After running the migration, you need to manually set up your first super admin user:

1. In the Supabase SQL Editor, run this query (replace with your actual admin email):

```sql
-- Replace 'your-admin-email@example.com' with your actual admin email
UPDATE public.users 
SET role = 'super_admin' 
WHERE email = 'your-admin-email@example.com';
```

2. Verify the update worked:

```sql
SELECT id, email, role FROM public.users WHERE role = 'super_admin';
```

## Application Features

### For Super Admin Users

- **Full Members Access**: View, edit, delete, and manage all members
- **Role Assignment**: Assign and change user roles (user, admin, super_admin)
- **Direct Password Change**: Change password without entering current password
- **All Admin Features**: Complete access to all system functionality

### For Admin Users

- **View-Only Members**: Can view all members but cannot edit, delete, or modify
- **No Role Assignment**: Cannot assign or change user roles
- **Standard Password Change**: Must enter current password to change it
- **Limited Admin Features**: View-only access to admin dashboard features

### For Regular Users

- **Basic Access**: Standard platform access for buying/selling
- **No Admin Features**: Cannot access admin pages or features

## Security Features

1. **Row Level Security (RLS)**: Database-level security ensures users can only access authorized data
2. **Function-Level Security**: All handler functions check user role before executing
3. **UI-Level Restrictions**: Admin users see "View Only" instead of action buttons
4. **Confirmation Dialogs**: Role changes require explicit confirmation with detailed warnings

## Troubleshooting

### "Role column doesn't exist" Error

If you see this error, it means the database migration hasn't been run yet:

1. Run the SQL migration script from `database-migrations/add-role-column.sql`
2. Refresh your application
3. Try the role assignment again

### "User not allowed" Error

This error occurs when trying to use Supabase Auth Admin API without proper service key setup. The new implementation uses database-based role management instead, which should resolve this issue.

### No Super Admin Access

If you can't access super admin features:

1. Check your user's role in the database:
```sql
SELECT email, role FROM public.users WHERE email = 'your-email@example.com';
```

2. If the role is not 'super_admin', update it:
```sql
UPDATE public.users SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

## Testing the Setup

1. **Login as Super Admin**: You should see full access to all features
2. **Create an Admin User**: Assign 'admin' role to another user
3. **Test Admin Access**: Login as admin - should see view-only access
4. **Test Role Assignment**: Only super admin should be able to change roles

## File Structure

```
project/
├── database-migrations/
│   └── add-role-column.sql          # Database migration script
├── src/
│   ├── utils/
│   │   └── roleManagement.ts        # Role management utilities
│   └── pages/
│       ├── Members.tsx              # Members page with role-based access
│       └── Settings.tsx             # Settings with role-based password change
└── ROLE_MANAGEMENT_SETUP.md         # This setup guide
```

## Next Steps

After completing the setup:

1. Test all role functionalities
2. Create additional admin users as needed
3. Train your team on the different access levels
4. Monitor the system for any security issues

## Support

If you encounter any issues during setup, check:

1. Supabase project permissions
2. Database migration execution
3. User role assignments
4. Browser console for error messages

The role management system is now ready for production use with proper security controls and user experience considerations.
