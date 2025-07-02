# Dynamic Cover Image Management System

## Overview

This system provides a complete solution for managing dynamic cover images in your React application. It includes image upload, cropping, storage, and real-time preview capabilities with a user-friendly interface for non-technical users.

## Features

✅ **Admin Edit Button** - Allows administrators to change cover images
✅ **Image Upload** - File selection dialog with drag-and-drop support
✅ **Image Cropping** - Interactive cropping with react-image-crop
✅ **Real-time Preview** - Shows cropped image before saving
✅ **Persistent Storage** - Images stored in Supabase Storage
✅ **Database Management** - Cover image metadata stored in PostgreSQL
✅ **Error Handling** - Comprehensive validation and error messages
✅ **Loading States** - Visual feedback during operations
✅ **Responsive Design** - Works on all device sizes

## Components

### 1. HeroSection
Main component that displays the cover image with optional edit functionality.

```tsx
import { HeroSection } from '../components/cover-image/HeroSection';

// Basic usage
<HeroSection 
  title="Welcome to Our Platform"
  subtitle="Discover amazing features"
/>

// Custom content
<HeroSection showEditButton={true}>
  <div className="text-center text-white">
    <h1>Custom Hero Content</h1>
    <p>Your custom content here</p>
  </div>
</HeroSection>
```

### 2. CoverImageModal
Modal component for uploading and cropping images.

### 3. ImageCropper
Interactive image cropping component with scale and rotation controls.

## Database Schema

```sql
CREATE TABLE cover_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

## Storage Setup

The system uses Supabase Storage with a `cover-images` bucket for storing uploaded images.

## Usage Examples

### 1. Basic Hero Section
```tsx
// pages/HomePage.tsx
import { HeroSection } from '../components/cover-image/HeroSection';

export function HomePage() {
  return (
    <div>
      <HeroSection 
        title="Welcome to FarmConnect"
        subtitle="Fresh produce from local farmers"
        showEditButton={true}
      />
      {/* Rest of your page content */}
    </div>
  );
}
```

### 2. Custom Hero Content
```tsx
<HeroSection showEditButton={true}>
  <div className="text-center text-white px-4 max-w-4xl mx-auto">
    <h1 className="text-4xl md:text-6xl font-bold mb-6">
      Custom Title
    </h1>
    <p className="text-lg md:text-xl opacity-90 mb-8">
      Custom description text
    </p>
    <Button>Call to Action</Button>
  </div>
</HeroSection>
```

### 3. Dashboard Integration
```tsx
// Add to any page where you want a hero section
import { HeroSection } from '../components/cover-image/HeroSection';

export function LandingPage() {
  return (
    <div>
      <HeroSection 
        title="Admin Dashboard"
        subtitle="Manage your platform efficiently"
        showEditButton={true}
      />
      {/* Dashboard content */}
    </div>
  );
}
```

## API Functions

### Cover Image Service
```tsx
import { 
  getActiveCoverImage,
  uploadCoverImage,
  saveCoverImage,
  validateImageFile 
} from '../services/coverImageService';

// Get current active cover image
const coverImage = await getActiveCoverImage();

// Upload and save new cover image
const file = // File from input
const validation = validateImageFile(file);
if (validation.valid) {
  const uploadResult = await uploadCoverImage(file, file.name);
  if (uploadResult.success) {
    await saveCoverImage('My Image', uploadResult.url, userId);
  }
}
```

## Permissions

- **View**: All users can see the cover image
- **Edit**: Only users with `admin` or `super_admin` roles can edit cover images
- **Upload**: Admins can upload new images up to 5MB
- **Manage**: Admins can set active images and delete old ones

## File Validation

- **Supported formats**: JPEG, PNG, WebP
- **Maximum size**: 5MB
- **Aspect ratio**: Recommended 16:9 for hero sections
- **Minimum dimensions**: 100x50 pixels

## Error Handling

The system includes comprehensive error handling for:
- Invalid file types
- File size limits
- Upload failures
- Database errors
- Network issues

## Responsive Design

The hero section is fully responsive:
- **Mobile**: 350px height, stacked content
- **Desktop**: 450px height, optimized layout
- **Touch-friendly**: Large buttons and touch targets

## Routes

Add the HomePage route to see the hero section in action:

```tsx
// App.tsx
import { HomePage } from './pages/HomePage';

<Routes>
  <Route path="/home" element={<HomePage />} />
  {/* Other routes */}
</Routes>
```

## Testing

1. **Navigate to `/home`** to see the hero section
2. **Login as admin/super_admin** to see the edit button
3. **Click "Edit Cover"** to open the management modal
4. **Upload an image** and test the cropping functionality
5. **Save the image** and verify it updates in real-time

## Customization

### Styling
The components use Tailwind CSS classes and can be customized by:
- Modifying the className props
- Updating the default styles in the components
- Adding custom CSS classes

### Aspect Ratios
Change the default aspect ratio in ImageCropper:
```tsx
<ImageCropper aspectRatio={4/3} /> // 4:3 instead of 16:9
```

### Storage Configuration
Update storage settings in coverImageService.ts:
- Change bucket name
- Modify file size limits
- Update allowed MIME types

## Troubleshooting

### Common Issues

1. **Images not loading**: Check Supabase storage bucket permissions
2. **Upload fails**: Verify file size and format
3. **Edit button not visible**: Ensure user has admin role
4. **Cropping not working**: Check react-image-crop CSS import

### Debug Mode
Enable console logging in the service functions to debug issues.

## Dependencies

- `react-image-crop`: Image cropping functionality
- `@supabase/supabase-js`: Database and storage
- `lucide-react`: Icons
- `tailwindcss`: Styling

## Security

- File validation prevents malicious uploads
- Role-based access control for editing
- Secure storage with Supabase
- Input sanitization for image names
