import React, { useState, useEffect } from 'react';
import { Edit, Settings, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { CoverImageModal } from './CoverImageModal';
import { getActiveCoverImage, CoverImage } from '../../services/coverImageService';
import { useAuthStore } from '../../store/authStore';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  showEditButton?: boolean;
  className?: string;
  children?: React.ReactNode;
  imageFit?: 'cover' | 'fill' | 'contain';
}

export function HeroSection({
  title = "Welcome to Our Platform",
  subtitle = "Discover amazing features and capabilities",
  showEditButton = true,
  className = "",
  children,
  imageFit = 'cover'
}: HeroSectionProps) {
  const user = useAuthStore((state) => state.user);
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Check if user can edit (admin or super_admin)
  const canEdit = user?.role === 'admin' || user?.role === 'super_admin';

  const loadCoverImage = async () => {
    try {
      setIsLoading(true);
      setError('');
      const activeImage = await getActiveCoverImage();
      setCoverImage(activeImage);
    } catch (error) {
      console.error('Error loading cover image:', error);
      setError('Failed to load cover image');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoverImage();
  }, []);

  const handleImageUpdated = () => {
    loadCoverImage(); // Reload the cover image
  };

  const defaultImageUrl = 'YOUR_FIREBASE_IMAGE_URL_HERE';
  const backgroundImageUrl = coverImage?.image_url || defaultImageUrl;

  if (isLoading) {
    return (
      <div className={`h-[350px] md:h-[450px] bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading cover image...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative h-[350px] md:h-[450px] overflow-hidden w-full ${className}`}
        style={{
          // Ensure full width even if parent has constraints
          width: '100%',
          maxWidth: 'none',
          marginLeft: 0,
          marginRight: 0
        }}
      >
        {/* Full-width background image - configurable fit */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url("${backgroundImageUrl}")`,
            backgroundSize: imageFit === 'fill' ? '100% 100%' : imageFit,
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll'
          }}
        />

        {/* Fallback img element for better browser support */}
        <img
          src={backgroundImageUrl}
          alt="Cover"
          className="absolute inset-0 w-full h-full opacity-0"
          style={{
            objectFit: imageFit,
            objectPosition: 'center center'
          }}
          onError={(e) => {
            // If img fails, ensure background div is visible
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Content */}
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white px-4 max-w-4xl mx-auto">
            {children ? (
              children
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  {title}
                </h1>
                <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                  {subtitle}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Edit Button */}
        {canEdit && showEditButton && (
          <div className="absolute top-4 right-4">
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              size="sm"
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 border-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Cover
            </Button>
          </div>
        )}

        {/* Error indicator */}
        {error && (
          <div className="absolute bottom-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm">
            {error}
          </div>
        )}

        {/* Image info overlay (for admins) */}
        {canEdit && coverImage && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-2 rounded text-xs">
            <div className="flex items-center space-x-2">
              <Settings className="h-3 w-3" />
              <span>{coverImage.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Cover Image Management Modal */}
      {canEdit && (
        <CoverImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onImageUpdated={handleImageUpdated}
        />
      )}
    </>
  );
}
