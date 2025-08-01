import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '../ui/button';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  src: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropper({ src, onCropComplete, onCancel, aspectRatio }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [processing, setProcessing] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    if (aspectRatio) {
      // Use aspect ratio if provided
      setCrop(centerAspectCrop(width, height, aspectRatio));
    } else {
      // For free cropping, start with full width and let user adjust height
      setCrop({
        unit: '%',
        x: 0,
        y: 10, // Start 10% from top
        width: 100, // Full width
        height: 80, // 80% height, user can adjust
      });
    }
  }, [aspectRatio]);

  const setFullWidth = useCallback(() => {
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  }, []);

  const setFullWidthBanner = useCallback(() => {
    setCrop({
      unit: '%',
      x: 0,
      y: 25, // Start 25% from top for banner-style
      width: 100,
      height: 50, // 50% height for banner
    });
  }, []);

  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return;
    }

    setProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const crop = completedCrop;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const pixelRatio = window.devicePixelRatio;
      canvas.width = crop.width * pixelRatio * scaleX;
      canvas.height = crop.height * pixelRatio * scaleY;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;

      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();

      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
      );

      ctx.restore();

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setProcessing(false);
    }
  }, [completedCrop, scale, rotate, onCropComplete]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Crop Your Image</h3>
        <p className="text-sm text-gray-600">
          {aspectRatio
            ? `Adjust the crop area to fit your hero section. The aspect ratio is ${aspectRatio.toFixed(2)}:1.`
            : 'Adjust the crop area to your desired size. You can crop to any dimensions for full-width display.'
          }
        </p>
      </div>

      <div className="flex justify-center">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          minWidth={100}
          minHeight={50}
          className="max-w-full"
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={src}
            style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
            onLoad={onImageLoad}
            className="max-h-96 max-w-full"
          />
        </ReactCrop>
      </div>

      {/* Controls */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        {/* Quick Presets (only show when no aspect ratio is enforced) */}
        {!aspectRatio && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setFullWidth}
                className="text-xs"
              >
                Full Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setFullWidthBanner}
                className="text-xs"
              >
                Banner Style
              </Button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scale: {scale.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rotate: {rotate}°
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={rotate}
            onChange={(e) => setRotate(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Preview Canvas (hidden) */}
      <canvas
        ref={previewCanvasRef}
        style={{ display: 'none' }}
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          onClick={getCroppedImg}
          disabled={!completedCrop || processing}
          className="flex items-center"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            'Apply Crop'
          )}
        </Button>
      </div>
    </div>
  );
}
