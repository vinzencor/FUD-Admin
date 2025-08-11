import React, { useState } from 'react';
import { Upload, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadCoverImage, getImageDimensions, COVER_IMAGE_REQUIREMENTS } from '../../services/coverImageService';

interface SimpleCoverImageUploadProps {
  onImageUploaded?: (url: string) => void;
  currentImageUrl?: string;
}

export function SimpleCoverImageUpload({ onImageUploaded, currentImageUrl }: SimpleCoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Optional: Get image dimensions for display
      try {
        const dimensions = await getImageDimensions(file);
        setImageInfo(dimensions);
        console.log(`Uploading image: ${dimensions.width} × ${dimensions.height}px`);
      } catch (error) {
        console.log('Could not read image dimensions, but uploading anyway');
        setImageInfo(null);
      }

      // Upload the image - no validation, accepts any image
      const result = await uploadCoverImage(file, file.name);

      if (result.success) {
        setUploadSuccess(true);
        onImageUploaded?.(result.url);
        
        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Current Image Preview */}
      {currentImageUrl && (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="Current cover image"
            className="w-full h-auto object-contain rounded-lg border border-gray-200"
            style={{ minHeight: '200px', maxHeight: '400px' }}
          />
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            Current Cover
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600 mt-2">Uploading image...</p>
              {imageInfo && (
                <p className="text-xs text-gray-500">
                  {imageInfo.width} × {imageInfo.height}px
                </p>
              )}
            </div>
          ) : uploadSuccess ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm text-green-600 mt-2">Upload successful!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">Upload Cover Image</p>
              <p className="text-sm text-gray-600">
                Drag and drop an image here, or click to select
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Image Requirements (Recommendations Only) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Image className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-blue-900">
              Image Recommendations (All images accepted!)
            </h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• <strong>Recommended:</strong> {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.RECOMMENDED}</p>
              <p>• <strong>File Size:</strong> {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.FILE_SIZE}</p>
              <p>• <strong>Formats:</strong> {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.FORMATS}</p>
              <p>• <strong>Freedom:</strong> {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.NOTE}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Info Display */}
      {imageInfo && !uploading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-gray-600" />
            <div className="text-sm text-gray-700">
              <span className="font-medium">Last uploaded:</span> {imageInfo.width} × {imageInfo.height}px
              <span className="text-gray-500 ml-2">
                (Ratio: {(imageInfo.width / imageInfo.height).toFixed(2)}:1)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Example usage component
export function CoverImageManagementExample() {
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');

  const handleImageUploaded = (url: string) => {
    setCoverImageUrl(url);
    console.log('New cover image uploaded:', url);
    // Here you would typically save the URL to your database
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Cover Image Management
      </h2>
      
      <SimpleCoverImageUpload
        onImageUploaded={handleImageUploaded}
        currentImageUrl={coverImageUrl}
      />

      {coverImageUrl && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">
            Cover Image URL:
          </h3>
          <code className="text-xs text-green-800 break-all">
            {coverImageUrl}
          </code>
        </div>
      )}
    </div>
  );
}
