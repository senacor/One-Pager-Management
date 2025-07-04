import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Croppie from 'croppie';
import 'croppie/croppie.css';
import type { PhotoData } from '../types/onepager';

interface ImageCropperProps {
    imageUrl: string;
    onCrop: (croppedImageUrl: string, cropData: Croppie.CropData) => void;
    onCancel: () => void;
    size?: number;
    className?: string;
    initialCropMetadata?: PhotoData['cropMetadata'];
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
    imageUrl,
    onCrop,
    onCancel,
    size = 300,
    className = '',
    initialCropMetadata
}) => {
    const { t } = useTranslation();
    const cropperRef = useRef<HTMLDivElement>(null);
    const croppieInstanceRef = useRef<Croppie | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    useEffect(() => {
        if (cropperRef.current && imageUrl) {
            setIsImageLoaded(false);

            // Clean up any previous instance
            if (croppieInstanceRef.current) {
                croppieInstanceRef.current.destroy();
                croppieInstanceRef.current = null;
            }

            // Initialize Croppie
            const croppieInstance = new Croppie(cropperRef.current, {
                viewport: {
                    width: size,
                    height: size,
                    type: 'square'
                },
                boundary: {
                    width: size + 50,
                    height: size + 50
                },
                showZoomer: true,
                enableOrientation: true,
                enableResize: false,
                enableExif: true
            });

            croppieInstanceRef.current = croppieInstance;

            // Bind the image with proper error handling
            const bindOptions: {
                url: string;
                points?: number[];
                zoom?: number;
            } = {
                url: imageUrl,
                zoom: 0.1 // Start with slight zoom to ensure image is visible
            };

            // If we have initial crop metadata, set the points to restore the previous crop
            if (initialCropMetadata) {
                bindOptions.points = [
                    initialCropMetadata.x,
                    initialCropMetadata.y,
                    initialCropMetadata.x + initialCropMetadata.width,
                    initialCropMetadata.y + initialCropMetadata.height
                ];
                // Use a bit more zoom when restoring crop to ensure visibility
                bindOptions.zoom = 0.2;
            }

            croppieInstance.bind(bindOptions)
                .then(() => {
                    setIsImageLoaded(true);
                    console.log('Image successfully bound to Croppie');
                })
                .catch((error) => {
                    console.error('Error binding image to Croppie:', error);
                    setIsImageLoaded(false);
                });

            return () => {
                if (croppieInstanceRef.current) {
                    croppieInstanceRef.current.destroy();
                    croppieInstanceRef.current = null;
                }
            };
        }
    }, [imageUrl, size, initialCropMetadata]);

    const handleCrop = async () => {
        if (!croppieInstanceRef.current) return;

        setIsLoading(true);

        try {
            // Get the cropped result as base64
            const croppedImage = await croppieInstanceRef.current.result({
                type: 'base64',
                size: { width: size, height: size },
                format: 'jpeg',
                quality: 0.9
            });

            // Get crop data - this contains points relative to the original image
            const cropData = croppieInstanceRef.current.get();

            // The points array from Croppie.get() gives us coordinates relative to the original image
            // points: [x1, y1, x2, y2] where (x1,y1) is top-left and (x2,y2) is bottom-right
            // in the coordinate system of the original image

            // Log for debugging - can be removed in production
            console.log('Crop data (original image coordinates):', {
                topLeft: [cropData.points?.[0], cropData.points?.[1]],
                bottomRight: [cropData.points?.[2], cropData.points?.[3]],
                zoom: cropData.zoom
            });

            onCrop(croppedImage, cropData);
        } catch (error) {
            console.error('Error cropping image:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRotateLeft = () => {
        if (croppieInstanceRef.current && isImageLoaded) {
            try {
                croppieInstanceRef.current.rotate(-90);
            } catch (error) {
                console.error('Error rotating image left:', error);
            }
        }
    };

    const handleRotateRight = () => {
        if (croppieInstanceRef.current && isImageLoaded) {
            try {
                croppieInstanceRef.current.rotate(90);
            } catch (error) {
                console.error('Error rotating image right:', error);
            }
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('imageCropper.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    {t('imageCropper.description')}
                </p>
            </div>

            {/* Controls - positioned above the cropper */}
            <div className="flex justify-center space-x-3 mb-4">
                <button
                    onClick={handleRotateLeft}
                    disabled={!isImageLoaded}
                    className="flex items-center justify-center w-10 h-10 text-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 rounded-full transition-colors border border-gray-300 shadow-sm"
                    title={t('imageCropper.rotateLeft')}
                >
                    ↶
                </button>
                <button
                    onClick={handleRotateRight}
                    disabled={!isImageLoaded}
                    className="flex items-center justify-center w-10 h-10 text-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 rounded-full transition-colors border border-gray-300 shadow-sm"
                    title={t('imageCropper.rotateRight')}
                >
                    ↷
                </button>
            </div>

            {/* Cropper container */}
            <div className="flex justify-center mb-6">
                <div
                    ref={cropperRef}
                    className="bg-gray-100 rounded-lg"
                    style={{ width: size + 50, height: size + 80 }}
                />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    disabled={isLoading}
                >
                    {t('imageCropper.cancel')}
                </button>
                <button
                    onClick={handleCrop}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-blue border border-transparent rounded-md hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t('imageCropper.cropping') : t('imageCropper.applyCrop')}
                </button>
            </div>
        </div>
    );
};
