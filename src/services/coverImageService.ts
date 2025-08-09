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
 * Upload image to Supabase Storage
 */
export async function uploadCoverImage(file: File, fileName: string): Promise<UploadResult> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const uniqueFileName = `cover-images/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
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
 * Recommended cover image dimensions and requirements
 */
export const COVER_IMAGE_REQUIREMENTS = {
  // Recommended dimensions for optimal display
  RECOMMENDED_WIDTH: 1920,
  RECOMMENDED_HEIGHT: 600,

  // Minimum dimensions to ensure quality
  MIN_WIDTH: 1200,
  MIN_HEIGHT: 400,

  // Maximum dimensions to prevent performance issues
  MAX_WIDTH: 3840,
  MAX_HEIGHT: 1200,

  // Aspect ratio guidance
  ASPECT_RATIO: 16 / 5, // 3.2:1 ratio (1920x600)
  ASPECT_RATIO_TOLERANCE: 0.2,

  // File size limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  RECOMMENDED_FILE_SIZE: 2 * 1024 * 1024, // 2MB for optimal loading

  // Supported formats
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  // Display text for users
  DISPLAY_TEXT: {
    RECOMMENDED: 'Recommended: 1920 × 600 pixels (16:5 ratio)',
    MIN_SIZE: 'Minimum: 1200 × 400 pixels',
    MAX_SIZE: 'Maximum: 3840 × 1200 pixels',
    FILE_SIZE: 'File size: Up to 10MB (2MB recommended for faster loading)',
    FORMATS: 'Formats: JPEG, PNG, WebP'
  }
};

/**
 * Validate image file with detailed size and dimension checking
 */
export function validateImageFile(file: File): { valid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = [];

  // Check file type
  if (!COVER_IMAGE_REQUIREMENTS.SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Please select a valid image file. Supported formats: ${COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.FORMATS}`
    };
  }

  // Check file size
  if (file.size > COVER_IMAGE_REQUIREMENTS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Image file size must be less than ${Math.round(COVER_IMAGE_REQUIREMENTS.MAX_FILE_SIZE / (1024 * 1024))}MB`
    };
  }

  // Add warning for large files
  if (file.size > COVER_IMAGE_REQUIREMENTS.RECOMMENDED_FILE_SIZE) {
    warnings.push(`Large file size (${Math.round(file.size / (1024 * 1024))}MB). Consider compressing for faster loading.`);
  }

  return { valid: true, warnings };
}

/**
 * Validate image dimensions after loading
 */
export function validateImageDimensions(width: number, height: number): {
  valid: boolean;
  error?: string;
  warnings?: string[];
  recommendations?: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check minimum dimensions
  if (width < COVER_IMAGE_REQUIREMENTS.MIN_WIDTH || height < COVER_IMAGE_REQUIREMENTS.MIN_HEIGHT) {
    return {
      valid: false,
      error: `Image is too small. Minimum size required: ${COVER_IMAGE_REQUIREMENTS.MIN_WIDTH} × ${COVER_IMAGE_REQUIREMENTS.MIN_HEIGHT} pixels. Your image: ${width} × ${height} pixels.`
    };
  }

  // Check maximum dimensions
  if (width > COVER_IMAGE_REQUIREMENTS.MAX_WIDTH || height > COVER_IMAGE_REQUIREMENTS.MAX_HEIGHT) {
    return {
      valid: false,
      error: `Image is too large. Maximum size allowed: ${COVER_IMAGE_REQUIREMENTS.MAX_WIDTH} × ${COVER_IMAGE_REQUIREMENTS.MAX_HEIGHT} pixels. Your image: ${width} × ${height} pixels.`
    };
  }

  // Check aspect ratio
  const actualRatio = width / height;
  const expectedRatio = COVER_IMAGE_REQUIREMENTS.ASPECT_RATIO;
  const ratioDifference = Math.abs(actualRatio - expectedRatio);

  if (ratioDifference > COVER_IMAGE_REQUIREMENTS.ASPECT_RATIO_TOLERANCE) {
    warnings.push(`Aspect ratio is ${actualRatio.toFixed(2)}:1. Recommended ratio is ${expectedRatio.toFixed(1)}:1 for best appearance.`);
  }

  // Check if dimensions match recommended size
  if (width !== COVER_IMAGE_REQUIREMENTS.RECOMMENDED_WIDTH || height !== COVER_IMAGE_REQUIREMENTS.RECOMMENDED_HEIGHT) {
    recommendations.push(`For optimal display, use ${COVER_IMAGE_REQUIREMENTS.RECOMMENDED_WIDTH} × ${COVER_IMAGE_REQUIREMENTS.RECOMMENDED_HEIGHT} pixels.`);
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined
  };
}
