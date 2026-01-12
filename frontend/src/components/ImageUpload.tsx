import React, { useState, useCallback } from 'react';
import axios from '../utils/axios';

interface ImageUploadProps {
  onImageUpload: (imageData: ImageUploadResult) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  buttonText?: string;
  showPreview?: boolean;
  uploadType?: 'product' | 'store-logo' | 'general';
  productId?: string;
  storeId?: string;
}

interface ImageUploadResult {
  imageUrl: string;
  thumbnailUrl: string;
  allUrls: {
    original: string;
    large: string;
    medium: string;
    thumb: string;
    keys: string[];
  };
  originalName: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  onUploadStart,
  onUploadError,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSize = 5 * 1024 * 1024, // 5MB
  className = '',
  buttonText = 'Upload Image',
  showPreview = true,
  uploadType = 'general',
  productId,
  storeId
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    if (!allowedTypes.includes(file.type)) {
      const error = 'Invalid file type. Please select a JPEG, PNG, or WebP image.';
      onUploadError?.(error);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const error = `File size too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`;
      onUploadError?.(error);
      return;
    }

    // Show preview
    if (showPreview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Start upload
    setIsUploading(true);
    onUploadStart?.();

    try {
      const formData = new FormData();
      const fieldName = uploadType === 'store-logo' ? 'logo' : 'image';
      formData.append(fieldName, file);

      if (productId) {
        formData.append('productId', productId);
      }
      if (storeId) {
        formData.append('storeId', storeId);
      }

      // Determine endpoint based on upload type
      let endpoint = '/images/upload';
      switch (uploadType) {
        case 'product':
          endpoint = '/images/product';
          break;
        case 'store-logo':
          endpoint = '/images/store-logo';
          break;
        default:
          endpoint = '/images/upload';
      }

      console.log(`Starting upload to endpoint: ${endpoint}`);
      console.log(`File size: ${file.size} bytes, type: ${file.type}`);
      console.log('Current cookies:', document.cookie);

      console.log(`Uploading to: ${endpoint}`);

      // Use axios with FormData - axios already configured with withCredentials
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0, // No timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        },
      });

      console.log('Upload response:', response.data);

      if (response.data.success) {
        onImageUpload(response.data.data);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        const authErrorMessage = 'Authentication failed. Please log out and log back in to refresh your session.';
        onUploadError?.(authErrorMessage);

        // Clear any stored authentication data
        localStorage.removeItem('afrozy-market-token');
        localStorage.removeItem('afrozy-market-user');

        // Optionally redirect to login page or show login modal
        // window.location.href = '/login';
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        onUploadError?.(errorMessage);
      }

      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [accept, maxSize, onImageUpload, onUploadStart, onUploadError, showPreview, uploadType, productId, storeId]);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className={`image-upload-container ${className}`}>
      {/* Drag and Drop Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {previewUrl && showPreview ? (
          <div className="space-y-4">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="mx-auto max-h-48 rounded-lg object-cover"
            />
            <p className="text-sm text-gray-500">
              {isUploading ? 'Uploading...' : 'Click to change image'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isUploading ? 'Uploading...' : 'Drop image here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supports JPEG, PNG, WebP up to {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
          </div>
        )}
        
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        id="file-input"
        type="file"
        accept={accept}
        onChange={handleFileInput}
        disabled={isUploading}
        className="hidden"
      />

      {/* Upload Button (Alternative to drag & drop) */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={isUploading}
          className={`
            inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium
            ${isUploading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {buttonText}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;