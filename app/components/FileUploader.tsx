"use client";

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isBrowser, hasFileReaderAPI } from '../../utils/browserDetection';

// Define props for the FileUploader component
interface FileUploaderProps {
  onFileUpload: (fileData: {
    id: string;
    name: string;
    type: string;
    data: string;
    size: number;
  }) => void;
  onError: (errorMessage: string) => void;
  documentType: 'front-id' | 'back-id' | 'other';
  acceptedFileTypes: string;
  maxSizeMB?: number;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

// This component exists solely on the client side
export default function FileUploader({
  onFileUpload,
  onError,
  documentType,
  acceptedFileTypes,
  maxSizeMB = 10,
  label,
  sublabel,
  disabled = false
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);

  // Use effect to detect browser environment
  useEffect(() => {
    if (isBrowser && hasFileReaderAPI) {
      setBrowserReady(true);
    } else if (isBrowser && !hasFileReaderAPI) {
      console.error('FileReader API not available in this browser');
    }
  }, []);

  // Exit early if not in browser environment or APIs not available
  if (!browserReady) {
    // Return a placeholder for SSR or when browser APIs aren't available
    return (
      <div className="w-full">
        <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500">File upload loading...</p>
        </div>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    
    // Validate file size
    if (file.size > maxSize) {
      onError(`File size exceeds the ${maxSizeMB}MB limit`);
      e.target.value = '';
      return;
    }
    
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
          throw new Error('Failed to read file as base64');
        }
        
        const base64String = reader.result;
        const fileId = uuidv4();
        
        // Customize name based on document type
        let fileName = file.name;
        if (documentType === 'front-id') {
          fileName = `Front ID - ${file.name}`;
        } else if (documentType === 'back-id') {
          fileName = `Back ID - ${file.name}`;
        }
        
        // Pass the file data to the parent component
        onFileUpload({
          id: fileId,
          name: fileName,
          type: documentType,
          data: base64String,
          size: file.size
        });
        
        setIsUploading(false);
        e.target.value = '';
      };
      
      reader.onerror = () => {
        onError('Error reading file. Please try again with a different file.');
        setIsUploading(false);
        e.target.value = '';
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      onError('An unexpected error occurred during upload');
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-8 h-8 mb-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mb-1 text-sm text-gray-500">
            <span className="font-semibold">{label}</span>
          </p>
          {sublabel && (
            <p className="text-xs text-gray-500">{sublabel}</p>
          )}
        </div>
        <input 
          type="file" 
          className="hidden" 
          onChange={handleFileChange}
          accept={acceptedFileTypes}
          disabled={disabled || isUploading}
        />
      </label>
      
      {isUploading && (
        <div className="flex items-center justify-center mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
          <span className="ml-2 text-xs text-gray-600">Uploading...</span>
        </div>
      )}
    </div>
  );
} 