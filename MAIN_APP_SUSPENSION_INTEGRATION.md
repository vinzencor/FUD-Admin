# Main FUD App - Suspension Integration Guide

## 🎯 Problem
Suspended users can still login to the main FUD application because suspension checking is only implemented in the admin panel.

## 🔧 Solution
Add suspension checking to your main FUD app using the universal suspension service.

---

## 📁 Step 1: Copy Suspension Service

Copy these files from your admin project to your main FUD app:

### **File 1: `src/services/suspensionService.ts`**
```typescript
// Copy the entire suspensionService.ts file to your main app
// Location: src/services/suspensionService.ts
```

### **File 2: Update your Supabase client**
Make sure your main app has the same Supabase configuration:
```typescript
// src/supabaseClient.ts (or wherever your Supabase client is)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjvrzdcucqwxvajsjefe.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdnJ6ZGN1Y3F3eHZhanNqZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2Mzg1NjYsImV4cCI6MjA2NTIxNDU2Nn0.SJYnlfB-mo0DaWeVoBzWvhvJzFixXVxYh2XDbOMRb1s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 🔐 Step 2: Add to Login Process

### **Option A: If you have a login component**
```typescript
// In your login component (e.g., Login.tsx, SignIn.tsx)
import { checkLoginAllowed } from '../services/suspensionService';
import { supabase } from '../supabaseClient';

const handleLogin = async (email: string, password: string) => {
  try {
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.user) {
      setError('Login failed');
      return;
    }

    // 2. Check if user is suspended
    const loginCheck = await checkLoginAllowed(data.user.id, data.user.email);
    
    if (!loginCheck.allowed) {
      setError(loginCheck.error || 'Account access denied');
      await supabase.auth.signOut(); // Sign them out immediately
      return;
    }

    // 3. Continue with normal login process
    console.log('Login successful');
    // Your existing login success logic here...
    
  } catch (error) {
    console.error('Login error:', error);
    setError('Login failed');
  }
};
```

### **Option B: If you use Auth Context/Provider**
```typescript
// In your AuthContext.tsx or AuthProvider.tsx
import { validateUserSession } from '../services/suspensionService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Check if user is suspended
          const validation = await validateUserSession(session.user);
          
          if (!validation.valid) {
            console.log('User session invalid:', validation.error);
            setUser(null);
            // Optionally show error message to user
            alert(validation.error);
            return;
          }
          
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Rest of your auth provider...
};
```

### **Option C: If you use a different auth system**
```typescript
// Add this check wherever you handle user authentication
import { checkLoginAllowed } from '../services/suspensionService';

// After successful authentication:
const userId = authenticatedUser.id;
const loginCheck = await checkLoginAllowed(userId, authenticatedUser.email);

if (!loginCheck.allowed) {
  // Sign out the user and show error
  await signOutUser();
  showError(loginCheck.error);
  return;
}

// Continue with normal flow...
```

---

## 🛡️ Step 3: Add Session Validation (Recommended)

Add this to check existing sessions when the app loads:

```typescript
// In your main App.tsx or root component
import { validateUserSession } from '../services/suspensionService';
import { supabase } from '../supabaseClient';

useEffect(() => {
  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const validation = await validateUserSession(session.user);
      
      if (!validation.valid) {
        console.log('Existing session invalid - user suspended');
        // User will be automatically signed out by validateUserSession
        alert(validation.error);
      }
    }
  };

  checkExistingSession();
}, []);
```

---

## 🎨 Step 4: Add User-Friendly Error Display

### **Error Component for Suspended Users:**
```typescript
// SuspendedAccountError.tsx
import React from 'react';
import { UserX, Mail } from 'lucide-react';

interface Props {
  error: string;
  onClose: () => void;
}

export const SuspendedAccountError: React.FC<Props> = ({ error, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <div className="flex items-center mb-4">
          <UserX className="h-8 w-8 text-red-500 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">Account Suspended</h2>
        </div>
        
        <p className="text-gray-700 mb-6">{error}</p>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Different Account
          </button>
          
          <a
            href="mailto:support@yourapp.com"
            className="flex items-center justify-center text-gray-600 hover:text-gray-800"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};
```

---

## 🧪 Step 5: Test the Integration

### **Test Script for Browser Console:**
```javascript
// Test suspension in your main app
async function testMainAppSuspension() {
  // Replace with actual suspended user ID
  const suspendedUserId = 'e77a00ce-0fd5-40c2-836b-e2618a8f7b87';
  
  const { checkLoginAllowed } = await import('./src/services/suspensionService');
  
  const result = await checkLoginAllowed(suspendedUserId);
  console.log('Suspension check result:', result);
  
  return result;
}

testMainAppSuspension();
```

---

## ✅ Expected Results

After integration:

**✅ Suspended users cannot login to main app**  
**✅ Existing suspended sessions are terminated**  
**✅ Clear error messages shown to users**  
**✅ Users directed to contact support**  
**✅ No access to any app features while suspended**  

---

## 🚀 Quick Integration Checklist

- [ ] Copy `suspensionService.ts` to main app
- [ ] Update Supabase client configuration
- [ ] Add suspension check to login process
- [ ] Add session validation on app load
- [ ] Test with suspended user account
- [ ] Add user-friendly error messages
- [ ] Test that unsuspended users can login normally

---

## 🆘 Troubleshooting

**If suspended users can still login:**
1. Check browser console for suspension check logs
2. Verify `suspended_users` table exists in database
3. Confirm RLS is disabled or properly configured
4. Test the `checkLoginAllowed` function directly

**If normal users cannot login:**
1. Check for JavaScript errors in console
2. Verify Supabase configuration is correct
3. Test with a known non-suspended user
4. Check network requests in browser dev tools

The suspension system will now work across **both your admin panel AND your main FUD application**! 🎉
