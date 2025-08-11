import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';

export interface CoverImage {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Get the currently active cover image
 */
export async function getActiveCoverImage(): Promise<CoverImage | null> {
  try {
    const { data, error } = await supabase
      .from('cover_images')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching active cover image:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getActiveCoverImage:', error);
    return null;
  }
}

/**
 * Get all cover images
 */
export async function getAllCoverImages(): Promise<CoverImage[]> {
  try {
    const { data, error } = await supabase
      .from('cover_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cover images:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllCoverImages:', error);
    return [];
  }
}

/**
 * Upload image to Supabase Storage - No validation, accepts any image
 */
export async function uploadCoverImage(file: File, fileName: string): Promise<UploadResult> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const uniqueFileName = `cover-images/${timestamp}-${fileName}`;

    // Upload to Supabase Storage - accepts any image
    const { data, error } = await supabase.storage
      .from('cover-images')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('cover-images')
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Error in uploadCoverImage:', error);
    return { success: false, error: 'Failed to upload image' };
  }
}

/**
 * Save new cover image to database and set as active (super admin only)
 */
export async function saveCoverImage(name: string, imageUrl: string, userId?: string): Promise<boolean> {
  try {
    // Security check: Only super admin can save cover images
    const user = useAuthStore.getState().user;
    if (user?.role !== 'super_admin') {
      console.error('Access denied: Only super admin can save cover images');
      return false;
    }
    // Start a transaction to ensure consistency
    const { error: deactivateError } = await supabase
      .from('cover_images')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating current cover image:', deactivateError);
      return false;
    }

    // Insert new cover image as active
    const { error: insertError } = await supabase
      .from('cover_images')
      .insert({
        name,
        image_url: imageUrl,
        is_active: true,
        created_by: userId
      });

    if (insertError) {
      console.error('Error inserting new cover image:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveCoverImage:', error);
    return false;
  }
}

/**
 * Set an existing cover image as active (super admin only)
 */
export async function setActiveCoverImage(imageId: string): Promise<boolean> {
  try {
    // Security check: Only super admin can set active cover images
    const user = useAuthStore.getState().user;
    if (user?.role !== 'super_admin') {
      console.error('Access denied: Only super admin can set active cover images');
      return false;
    }
    // Deactivate all cover images
    const { error: deactivateError } = await supabase
      .from('cover_images')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating cover images:', deactivateError);
      return false;
    }

    // Activate the selected image
    const { error: activateError } = await supabase
      .from('cover_images')
      .update({ is_active: true })
      .eq('id', imageId);

    if (activateError) {
      console.error('Error activating cover image:', activateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setActiveCoverImage:', error);
    return false;
  }
}

/**
 * Delete a cover image (super admin only)
 */
export async function deleteCoverImage(imageId: string, imageUrl: string): Promise<boolean> {
  try {
    // Security check: Only super admin can delete cover images
    const user = useAuthStore.getState().user;
    if (user?.role !== 'super_admin') {
      console.error('Access denied: Only super admin can delete cover images');
      return false;
    }
    // Extract file path from URL for storage deletion
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `cover-images/${fileName}`;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('cover-images')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('cover_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Error deleting from database:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteCoverImage:', error);
    return false;
  }
}

/**
 * Cover image recommendations - No validation, just guidance
 */
export const COVER_IMAGE_REQUIREMENTS = {
  // Recommended dimensions for optimal display
  RECOMMENDED_WIDTH: 1920,
  RECOMMENDED_HEIGHT: 600,

  // File size recommendations
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
  RECOMMENDED_FILE_SIZE: 5 * 1024 * 1024, // 5MB for optimal loading

  // Supported formats
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  // Display text for users (recommendations only)
  DISPLAY_TEXT: {
    RECOMMENDED: 'Recommended: 1920px width × any height you prefer',
    FLEXIBILITY: 'Upload any image size - all dimensions are accepted!',
    FILE_SIZE: 'File size: Up to 15MB (5MB recommended for faster loading)',
    FORMATS: 'Formats: JPEG, PNG, WebP',
    NOTE: 'No restrictions - upload any image and it will work perfectly!'
  }
};

/**
 * Get image dimensions from file (for display purposes only)
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// No validation functions - all images are accepted
