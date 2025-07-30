# Buyers Page Documentation

## Overview
The Buyers page is a dedicated interface for managing and viewing buyer accounts in the admin panel. It provides comprehensive buyer information with location-based filtering for regional admins.

## Features

### 🎯 **Buyer-Specific Filtering**
- Shows only users who are buyers (not sellers) or have buyer/both as their default mode
- Filters out pure seller accounts to focus on buyer management
- Displays buyer-specific information and statistics

### 🌍 **Location-Based Access Control**
- **Super Admins**: Can view all buyers globally
- **Regional Admins**: Can only view buyers from their assigned geographic location
- Automatic filtering based on admin's assigned location (Country → State → City → Zipcode)
- Clear indication of the admin's viewing scope in the header

### 📱 **Responsive Design**
- **Mobile View**: Card-based layout optimized for smaller screens
- **Desktop View**: Full table layout with comprehensive information
- Seamless switching between views based on screen size

### 👤 **Comprehensive Buyer Profiles**
- **Basic Information**: Name, email, phone, user mode
- **Location Details**: Full address breakdown (address, city, state, country, zipcode)
- **Account Information**: Registration date, last active date, account status
- **Additional Data**: User ID, account status, and more

### 🔍 **Advanced Search & Filtering**
- Real-time search across name, email, phone, and location
- Instant filtering with no page reloads
- Search term highlighting and clear results

### 📊 **Export Functionality**
- CSV export of filtered buyer data
- Includes all relevant buyer information
- Proper date formatting and data structure
- Loading states and success messages

## Technical Implementation

### **Data Sources**
- Uses `fetchUsersWithAddresses()` from `dataService.ts`
- Integrates with location-based filtering from `locationAdminService.ts`
- Real-time data fetching from Supabase database

### **Location Filtering Logic**
```typescript
// Get admin's assigned location
let adminLocationFilter: AdminLocation | null = null;
if (user?.role === 'admin' && user?.id) {
  adminLocationFilter = await getAdminAssignedLocation(user.id);
}

// Apply location filter to data fetching
const fetchedUsersData = await fetchUsersWithAddresses(adminLocationFilter);
```

### **Buyer Filtering Logic**
```typescript
// Filter for buyers only
const buyersData = fetchedUsersData.filter(userData => {
  return !userData.is_seller || 
         userData.default_mode === 'buyer' || 
         userData.default_mode === 'both';
});
```

## User Interface

### **Header Section**
- Page title with buyer count
- Location indicator for regional admins
- Refresh and export buttons
- Export status messages

### **Search Section**
- Full-width search input
- Real-time filtering
- Placeholder text guidance

### **Buyers List**
- **Mobile**: Card layout with essential information
- **Desktop**: Full table with all details
- Profile view buttons for detailed information

### **Profile Modal**
- Comprehensive buyer information display
- Organized sections (Basic, Location, Account, Additional)
- Professional styling with proper spacing
- Close functionality

## Access Control

### **Super Admin Access**
- View all buyers globally
- No location restrictions
- Full export capabilities
- Complete buyer management

### **Regional Admin Access**
- View only buyers from assigned location
- Location-based filtering applied automatically
- Export limited to visible data
- Clear indication of viewing scope

## Navigation

### **Sidebar Integration**
- Dedicated "Buyers" menu item with User icon
- Separate from "Farmers" section
- Consistent with existing navigation patterns

### **Routing**
- `/admin/buyers` for regional admins
- `/super-admin/buyers` for super admins
- Proper route protection and authentication

## Data Export

### **CSV Export Features**
- Filename with timestamp: `buyers_YYYY-MM-DD_HH-MM-SS.csv`
- Comprehensive data fields:
  - name, email, phone, location
  - default_mode, registration_date, last_active
  - city, state, country, zipcode
- Proper date formatting for Excel compatibility
- Loading states and success feedback

## Error Handling

### **Loading States**
- Spinner with "Loading buyers..." message
- Disabled buttons during operations
- Progress indicators for exports

### **Error States**
- Clear error messages
- Retry functionality
- Graceful degradation

### **Empty States**
- "No buyers found" message
- Contextual help text
- Search guidance

## Mobile Optimization

### **Card Layout**
- Compact information display
- Touch-friendly buttons
- Proper spacing and typography
- Essential information prioritized

### **Responsive Breakpoints**
- Mobile: `block sm:hidden`
- Desktop: `hidden sm:block`
- Seamless transitions

## Integration Points

### **Authentication**
- Uses `useAuthStore` for user context
- Role-based access control
- Automatic location assignment

### **Data Services**
- `fetchUsersWithAddresses()` for user data
- `getAdminAssignedLocation()` for location filtering
- `exportWithLoading()` for CSV exports

### **UI Components**
- Lucide React icons
- Tailwind CSS styling
- Consistent with existing design system

## Future Enhancements

### **Potential Improvements**
- Advanced filtering options (registration date, activity status)
- Bulk operations (export selected, bulk actions)
- Buyer analytics and statistics
- Integration with order history
- Communication tools (email, notifications)

### **Performance Optimizations**
- Pagination for large datasets
- Virtual scrolling for mobile
- Caching strategies
- Optimistic updates

## Usage Examples

### **Super Admin Workflow**
1. Navigate to "Buyers" from sidebar
2. View all buyers globally
3. Search for specific buyers
4. View detailed profiles
5. Export data as needed

### **Regional Admin Workflow**
1. Navigate to "Buyers" from sidebar
2. See location-filtered buyers only
3. Notice location indicator in header
4. Search within assigned region
5. Export regional data

This implementation provides a comprehensive, location-aware buyer management system that scales from individual regional admins to global super admin oversight.
