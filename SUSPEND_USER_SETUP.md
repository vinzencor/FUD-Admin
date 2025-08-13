# User Suspension Feature Setup

## 🎯 Overview

The user suspension feature has been implemented to work without modifying the existing `users` table. Instead, it uses separate tables to track suspended users.

## 🗄️ Database Setup Required

### **Step 1: Create Required Tables**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the SQL script**: Copy and paste the contents of `database/suspend_user_tables.sql`
4. **Execute the script** to create:
   - `suspended_users` table - tracks which users are suspended
   - `admin_actions` table - logs all admin actions (fallback)
   - Indexes for performance
   - Row Level Security policies
   - Helper views

### **Step 2: Verify Tables Created**

Check that these tables exist in your database:
- ✅ `suspended_users`
- ✅ `admin_actions`
- ✅ `currently_suspended_users` (view)

## 🔧 How It Works

### **Suspension Process:**
1. **User clicks "Suspend User"**
2. **System adds record to `suspended_users` table**:
   ```sql
   INSERT INTO suspended_users (user_id, suspended_by, reason, is_active)
   VALUES (user_id, admin_id, 'Suspended by admin', true)
   ```
3. **System deactivates all user content**:
   - Listings: `is_active = false`
   - Products: `is_active = false` 
   - Services: `is_active = false`

### **Unsuspension Process:**
1. **User clicks "Unsuspend User"**
2. **System deactivates suspension record**:
   ```sql
   UPDATE suspended_users SET is_active = false WHERE user_id = user_id
   ```
3. **System reactivates all user content**:
   - Listings: `is_active = true`
   - Products: `is_active = true`
   - Services: `is_active = true`

### **Status Detection:**
- **Suspended**: User ID exists in `suspended_users` with `is_active = true`
- **Active**: User ID not in suspended users or `is_active = false`

## 🎨 Visual Indicators

### **Suspended Users Show:**
- ✅ **Red "Suspended" badge** next to name
- ✅ **Orange "Suspend User" button** changes to **Green "Unsuspend User"**
- ✅ **UserX icon** for suspended, **UserCheck icon** for unsuspend

## 🔒 Security Features

### **Access Control:**
- ✅ **Super Admin Only**: Only super admins can suspend/unsuspend users
- ✅ **Row Level Security**: Database policies prevent unauthorized access
- ✅ **Audit Trail**: All actions logged in `admin_actions` table

### **Database Policies:**
- ✅ **Read Access**: Super admins can view suspended users
- ✅ **Write Access**: Super admins can suspend/unsuspend users
- ✅ **Data Protection**: Regular users cannot access suspension data

## 🚀 Usage Instructions

### **To Suspend a User:**
1. Go to **Database** section (Members page)
2. Find the user to suspend
3. Click **MoreVertical (⋮)** button in their row
4. Click **"Suspend User"** (orange button)
5. User will be suspended immediately

### **To Unsuspend a User:**
1. Find the suspended user (red "Suspended" badge)
2. Click **MoreVertical (⋮)** button in their row  
3. Click **"Unsuspend User"** (green button)
4. User will be unsuspended immediately

## 🔍 Troubleshooting

### **If Suspension Fails:**
1. **Check Database Tables**: Ensure `suspended_users` table exists
2. **Check Permissions**: Verify RLS policies are set correctly
3. **Check Console**: Look for specific error messages
4. **Fallback Mode**: System will try `admin_actions` table if main table fails

### **Common Issues:**
- **"Table doesn't exist"**: Run the SQL setup script
- **"Permission denied"**: Check RLS policies and user roles
- **"400 Bad Request"**: Usually means table/column doesn't exist

## 📊 Database Schema

### **suspended_users Table:**
```sql
id              UUID PRIMARY KEY
user_id         UUID (references users.id)
suspended_by    UUID (references users.id)  
suspended_at    TIMESTAMP
reason          TEXT
is_active       BOOLEAN
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### **admin_actions Table:**
```sql
id              UUID PRIMARY KEY
action_type     TEXT
target_user_id  UUID (references users.id)
performed_by    UUID (references users.id)
performed_at    TIMESTAMP
details         JSONB
created_at      TIMESTAMP
```

## ✅ Benefits

✅ **No Schema Changes**: Doesn't modify existing `users` table  
✅ **Backward Compatible**: Works with existing database structure  
✅ **Comprehensive**: Suspends all user content automatically  
✅ **Reversible**: Full unsuspension capability  
✅ **Auditable**: Complete log of all suspension actions  
✅ **Secure**: Proper access controls and permissions  

## 🎉 Ready to Use!

Once you've run the SQL setup script, the suspension feature will work immediately. Users can be suspended and unsuspended through the admin interface with full tracking and security.
