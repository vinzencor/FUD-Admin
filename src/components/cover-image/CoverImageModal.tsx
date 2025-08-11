import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';

import { Upload, Image as ImageIcon, Loader2, AlertCircle, Check } from 'lucide-react';
import { uploadCoverImage, saveCoverImage } from '../../services/coverImageService';
import { useAuthStore } from '../../store/authStore';

interface CoverImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpdated: () => void;
}

export function CoverImageModal({ isOpen, onClose, onImageUpdated }: CoverImageModalProps) {
  const user = useAuthStore((state) => state.user);

  // Security check: Only super admin can edit cover images
  if (user?.role !== 'super_admin') {
    return null;
  }

  // Simplified state management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setSelectedFile(null);
    setError('');
    setIsUploading(false);
    setUploadSuccess(false);
    setPreviewUrl('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSaveImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Upload the image - no validation, accepts any image
      const uploadResult = await uploadCoverImage(selectedFile, selectedFile.name);

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      // Save to database with a simple name
      const imageName = `Cover Image ${new Date().toLocaleDateString()}`;
      const saveSuccess = await saveCoverImage(imageName, uploadResult.url, user?.id);

      if (!saveSuccess) {
        throw new Error('Failed to save image to database');
      }

      // Success!
      setUploadSuccess(true);
      onImageUpdated();

      // Close modal after 1.5 seconds
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Error uploading cover image:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Simple render - no complex steps

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <h2 className="text-lg font-semibold">Upload Cover Image</h2>
          <p className="text-sm text-gray-600">
            Upload any image - no restrictions!
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area or Preview */}
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium text-gray-900">Upload Cover Image</p>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">Any image size accepted - no cropping!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Cover image preview"
                  className="w-full h-auto"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleSaveImage}
                  disabled={isUploading}
                  className="px-8 py-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Image...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {/* Success Message */}
          {uploadSuccess && (
            <div className="flex items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-900">Upload Successful!</p>
                <p className="text-xs text-green-700 mt-1">Cover image has been updated</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Close Button */}
          {!isUploading && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={isUploading}
              >
                {uploadSuccess ? 'Done' : 'Cancel'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

