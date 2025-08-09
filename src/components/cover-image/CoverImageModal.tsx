import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';
import { ImageCropper } from './ImageCropper';
import { Upload, Image as ImageIcon, Loader2, AlertCircle, Check } from 'lucide-react';
import { uploadCoverImage, saveCoverImage, validateImageFile, validateImageDimensions, COVER_IMAGE_REQUIREMENTS } from '../../services/coverImageService';
import { useAuthStore } from '../../store/authStore';

interface CoverImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpdated: () => void;
}

type ModalStep = 'upload' | 'crop' | 'preview' | 'saving';

export function CoverImageModal({ isOpen, onClose, onImageUpdated }: CoverImageModalProps) {
  const user = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState<ModalStep>('upload');

  // Security check: Only super admin can edit cover images
  if (user?.role !== 'super_admin') {
    return null;
  }
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setImagePreviewUrl('');
    setCroppedImageBlob(null);
    setCroppedImageUrl('');
    setImageName('');
    setError('');
    setIsUploading(false);
    setWarnings([]);
    setRecommendations([]);
    setImageDimensions(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError('');
    setWarnings(validation.warnings || []);
    setSelectedFile(file);
    setImageName(file.name.split('.')[0]);

    // Create preview URL and validate dimensions
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const dimensionValidation = validateImageDimensions(img.width, img.height);

        if (!dimensionValidation.valid) {
          setError(dimensionValidation.error || 'Invalid image dimensions');
          return;
        }

        setImageDimensions({ width: img.width, height: img.height });
        setWarnings([
          ...(validation.warnings || []),
          ...(dimensionValidation.warnings || [])
        ]);
        setRecommendations(dimensionValidation.recommendations || []);

        setImagePreviewUrl(e.target?.result as string);
        setCurrentStep('crop');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setCroppedImageBlob(croppedBlob);
    
    // Create preview URL for cropped image
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setCroppedImageUrl(croppedUrl);
    setCurrentStep('preview');
  };

  const handleSave = async () => {
    if (!croppedImageBlob || !selectedFile) {
      setError('No image to save');
      return;
    }

    setCurrentStep('saving');
    setIsUploading(true);

    try {
      // Create a new file from the cropped blob
      const croppedFile = new File([croppedImageBlob], selectedFile.name, {
        type: 'image/jpeg',
      });

      // Upload the cropped image
      const uploadResult = await uploadCoverImage(croppedFile, selectedFile.name);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      // Save to database
      const saveSuccess = await saveCoverImage(imageName, uploadResult.url, user?.id);
      
      if (!saveSuccess) {
        throw new Error('Failed to save image to database');
      }

      // Success!
      onImageUpdated();
      handleClose();
    } catch (error) {
      console.error('Error saving cover image:', error);
      setError(error instanceof Error ? error.message : 'Failed to save image');
      setCurrentStep('preview');
    } finally {
      setIsUploading(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Upload Cover Image</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose a high-quality image for the website cover page
        </p>
      </div>

      {/* Image Requirements */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">📏 Image Requirements</h4>
        <div className="space-y-1 text-xs text-blue-800">
          <p><strong>✅ {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.RECOMMENDED}</strong></p>
          <p>• {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.MIN_SIZE}</p>
          <p>• {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.MAX_SIZE}</p>
          <p>• {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.FILE_SIZE}</p>
          <p>• {COVER_IMAGE_REQUIREMENTS.DISPLAY_TEXT.FORMATS}</p>
        </div>
        <div className="mt-2 text-xs text-blue-700">
          <p><strong>💡 Tip:</strong> Use landscape images with a wide aspect ratio for best results!</p>
        </div>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">Select your cover image file</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Warnings:</p>
              <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-md">
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Recommendations:</p>
              <ul className="text-xs text-green-700 mt-1 space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {imageDimensions && (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
          <p className="text-xs text-gray-600">
            <strong>Image Size:</strong> {imageDimensions.width} × {imageDimensions.height} pixels
            <span className="ml-2">
              (Ratio: {(imageDimensions.width / imageDimensions.height).toFixed(2)}:1)
            </span>
          </p>
        </div>
      )}
    </div>
  );

  const renderCropStep = () => (
    <ImageCropper
      src={imagePreviewUrl}
      onCropComplete={handleCropComplete}
      onCancel={() => setCurrentStep('upload')}
      aspectRatio={undefined} // Allow free cropping for full-width images
    />
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Preview & Save</h3>
        <p className="mt-1 text-sm text-gray-500">
          Review your cropped image and give it a name
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image Name
          </label>
          <input
            type="text"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter a name for this image"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview
          </label>
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img
              src={croppedImageUrl}
              alt="Cropped preview"
              className="w-full object-cover"
              style={{ maxHeight: '300px' }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-white text-center">
                <h4 className="text-xl font-semibold">Cover Image Preview</h4>
                <p className="text-sm opacity-90">This image will be displayed at full width</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('crop')}
          disabled={isUploading}
        >
          Back to Crop
        </Button>
        <Button
          onClick={handleSave}
          disabled={!imageName.trim() || isUploading}
          className="flex items-center"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
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
  );

  const renderSavingStep = () => (
    <div className="text-center py-8">
      <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">Saving Your Image</h3>
      <p className="mt-2 text-sm text-gray-500">
        Please wait while we upload and save your cover image...
      </p>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return renderUploadStep();
      case 'crop':
        return renderCropStep();
      case 'preview':
        return renderPreviewStep();
      case 'saving':
        return renderSavingStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <h2 className="text-xl font-semibold">Manage Cover Image</h2>
        </DialogHeader>
        
        {renderCurrentStep()}
      </DialogContent>
    </Dialog>
  );
}
