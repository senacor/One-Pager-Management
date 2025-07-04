import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageCropper } from './ImageCropper';
import type { PhotoData } from '../types/onepager';

interface FileUploadProps {
    value?: PhotoData;
    onChange: (data: PhotoData | null) => void;
    accept?: string;
    label?: string;
    className?: string;
    showPreview?: boolean;
    error?: string;
    enableCropping?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    value,
    onChange,
    accept = 'image/*',
    label,
    className = '',
    showPreview = true,
    error,
    enableCropping = true
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null);

    // Get the preview URL from PhotoData object
    const getPreviewUrl = (): string | null => {
        if (!value) return null;

        // Prefer cropped image, fallback to original
        if (value.croppedImageUrl) {
            return value.croppedImageUrl;
        }

        if (value.originalFile) {
            if (typeof value.originalFile === 'string') {
                return value.originalFile;
            }

            if (value.originalFile instanceof File) {
                return URL.createObjectURL(value.originalFile);
            }
        }

        return null;
    };

    const previewUrl = getPreviewUrl();

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (value instanceof File && previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            // Also cleanup temp URLs
            if (tempImageUrl) {
                URL.revokeObjectURL(tempImageUrl);
            }
        };
    }, [value, previewUrl, tempImageUrl]);

    const validateFile = (file: File): string | null => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            return t('fileUpload.invalidFileType');
        }

        if (file.size > maxSize) {
            return t('fileUpload.fileTooLarge');
        }

        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                setValidationError(validationError);
                // Clear the input to allow selecting the same file again
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            // Clear any previous validation error
            setValidationError(null);
            setCurrentFile(file);

            if (enableCropping) {
                // Show cropper with the selected file
                const tempUrl = URL.createObjectURL(file);
                setTempImageUrl(tempUrl);
                setShowCropper(true);
            } else {
                // Direct upload without cropping
                const photoData: PhotoData = {
                    originalFile: file,
                    croppedImageUrl: URL.createObjectURL(file)
                };
                onChange(photoData);
            }

            setImageLoading(true);
            setImageError(null);
        } else {
            onChange(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                setValidationError(validationError);
                return;
            }

            // Clear any previous validation error
            setValidationError(null);
            setCurrentFile(file);

            if (enableCropping) {
                // Show cropper with the dropped file
                const tempUrl = URL.createObjectURL(file);
                setTempImageUrl(tempUrl);
                setShowCropper(true);
            } else {
                // Direct upload without cropping
                const photoData: PhotoData = {
                    originalFile: file,
                    croppedImageUrl: URL.createObjectURL(file)
                };
                onChange(photoData);
            }

            setImageLoading(true);
            setImageError(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleClick = () => {
        setValidationError(null);
        fileInputRef.current?.click();
    };

    const handleEditCrop = () => {
        if (!value || !value.originalFile) return;

        let imageUrl: string;

        if (typeof value.originalFile === 'string') {
            // For default images, use the string path directly
            imageUrl = value.originalFile;
        } else if (value.originalFile instanceof File) {
            // For uploaded files, create a URL
            imageUrl = URL.createObjectURL(value.originalFile);
        } else {
            return;
        }

        setTempImageUrl(imageUrl);
        setShowCropper(true);
    };

    const handleCrop = (croppedImageUrl: string, cropData: Croppie.CropData) => {
        // Use the stored file or the existing original file
        const originalFile = currentFile || value?.originalFile;

        const photoData: PhotoData = {
            originalFile: originalFile || undefined,
            croppedImageUrl,
            // Store crop coordinates relative to the original image dimensions
            // Croppie.get().points gives us [x1, y1, x2, y2] in original image coordinates
            cropMetadata: cropData.points ? {
                x: cropData.points[0],                              // Top-left X in original image
                y: cropData.points[1],                              // Top-left Y in original image
                width: cropData.points[2] - cropData.points[0],     // Width in original image
                height: cropData.points[3] - cropData.points[1]     // Height in original image
            } : undefined
        };

        onChange(photoData);
        setShowCropper(false);
        setImageLoading(false);
        setCurrentFile(null);

        // Clean up temp URL - but only if it's not a default image path
        if (tempImageUrl && !tempImageUrl.startsWith('./') && !tempImageUrl.startsWith('/')) {
            try {
                URL.revokeObjectURL(tempImageUrl);
            } catch (error) {
                // Ignore errors when trying to revoke non-object URLs
                console.debug('Could not revoke object URL:', error);
            }
            setTempImageUrl(null);
        } else {
            setTempImageUrl(null);
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setImageLoading(false);
        setCurrentFile(null);

        // Clean up temp URL - but only if it's not a default image path
        if (tempImageUrl && !tempImageUrl.startsWith('./') && !tempImageUrl.startsWith('/')) {
            try {
                URL.revokeObjectURL(tempImageUrl);
            } catch (error) {
                // Ignore errors when trying to revoke non-object URLs
                console.debug('Could not revoke object URL:', error);
            }
            setTempImageUrl(null);
        } else {
            setTempImageUrl(null);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        setValidationError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getFileSize = (): string | null => {
        if (!value || !value.originalFile) return null;

        if (value.originalFile instanceof File) {
            return `${(value.originalFile.size / 1024 / 1024).toFixed(2)} MB`;
        }

        return null;
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            {/* Preview Section */}
            {showPreview && previewUrl && (
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex flex-col items-center space-y-4">
                        {/* Large Square Preview Image */}
                        <div className="relative w-48 h-48 rounded-lg overflow-hidden border-4 border-gray-100 bg-white shadow-lg">
                            <img
                                src={previewUrl}
                                alt="Profile preview"
                                className="w-full h-full object-cover"
                                onLoad={() => {
                                    setImageLoading(false);
                                    setImageError(null);
                                }}
                                onError={(e) => {
                                    setImageLoading(false);
                                    setImageError(t('fileUpload.failedToLoad'));
                                    console.error('Error loading image:', previewUrl);
                                    // Hide the broken image
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            {imageLoading && (
                                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                                    <div className="text-sm text-gray-500">{t('fileUpload.loading')}</div>
                                </div>
                            )}
                            {imageError && (
                                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                                    <div className="text-sm text-red-500 text-center px-2">{imageError}</div>
                                </div>
                            )}
                        </div>

                        {/* File Size Info */}
                        {getFileSize() && (
                            <p className="text-sm text-gray-500">
                                {getFileSize()}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={handleClick}
                                className="flex items-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors font-medium shadow-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('fileUpload.changePhoto')}
                            </button>

                            {enableCropping && value?.originalFile && (
                                <button
                                    onClick={handleEditCrop}
                                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    {t('fileUpload.editCrop')}
                                </button>
                            )}

                            <button
                                onClick={handleRemove}
                                className="flex items-center px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium shadow-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {t('common.remove')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Area */}
            {!previewUrl && (
                <div
                    onClick={handleClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300
            ${dragOver
                            ? 'border-brand-blue bg-blue-50'
                            : error
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white hover:border-brand-blue hover:bg-gray-50'
                        }
          `}
                >
                    <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 text-gray-400">
                            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">
                                <span className="text-brand-blue font-medium">{t('fileUpload.clickToUpload')}</span> {t('fileUpload.dragAndDrop')}
                            </p>
                            <p className="text-xs text-gray-500">
                                {t('fileUpload.fileTypes')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Error messages */}
            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}

            {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm font-medium">{validationError}</p>
                </div>
            )}

            {/* Image Cropper Modal */}
            {showCropper && tempImageUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <ImageCropper
                            imageUrl={tempImageUrl}
                            onCrop={handleCrop}
                            onCancel={handleCropCancel}
                            size={280}
                            initialCropMetadata={value?.cropMetadata}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
