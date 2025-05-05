"use client";

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isBrowser, hasFileReaderAPI } from '../../utils/browserDetection';
import { documentStorageService } from '@/app/lib/appwrite';

// Define props for the FileUploader component
interface FileUploaderProps {
  onFileUpload: (fileData: {
    id: string;
    name: string;
    type: string;
    size: number;
    fileId?: string;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedFile, setSavedFile] = useState<File | null>(null);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      setError(`Invalid file type. Allowed types: ${acceptedFileTypes.split(', ').join(', ')}`);
      return;
    }
    
    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }
    
    // Save file for potential retry
    setSavedFile(file);
    
    // Upload to Appwrite Storage
    await uploadFile(file);
  };
  
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    setError(null);
    setSuccess(null);
    
    try {
      setUploadProgress(30);
      
      // Customize name based on document type
      let fileName = file.name;
      if (documentType === 'front-id') {
        fileName = `Front ID - ${file.name}`;
      } else if (documentType === 'back-id') {
        fileName = `Back ID - ${file.name}`;
      }
      
      // ACTUALLY UPLOAD FILE TO APPWRITE STORAGE
      setUploadProgress(50);
      console.log('Uploading file to Appwrite Storage:', file);
      
      const { fileId, fileUrl } = await documentStorageService.uploadFile(file);
      
      setUploadProgress(80);
      console.log('File uploaded successfully to Appwrite Storage. FileID:', fileId);
      
      // Pass the file data to the parent component
      onFileUpload({
        id: fileId, // Use Appwrite's fileId as the document ID
        name: fileName,
        type: documentType,
        size: file.size,
        fileId // Include the Appwrite Storage fileId
      });
      
      setUploadProgress(100);
      setSuccess('File uploaded successfully');
      setIsUploading(false);
    } catch (err) {
      console.error('Upload error:', err);
      // Check if it's a network error
      if (err instanceof TypeError && 
         (err.message.includes('Failed to fetch') || 
          err.message.includes('Network') || 
          err.message.includes('network'))) {
        setError('Network error during upload. You can retry when your connection is stable.');
      } else {
        onError(`Failed to upload file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      setIsUploading(false);
    }
  };
  
  // Retry upload function
  const handleRetry = () => {
    if (savedFile) {
      uploadFile(savedFile);
    } else {
      onError('No file available to retry. Please select a file again.');
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
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">Uploading: {uploadProgress}%</p>
        </div>
      )}
      
      {success && !error && (
        <div className="mt-2 text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          {success}
        </div>
      )}
      
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          {error.includes('Network') && savedFile && (
            <button 
              onClick={handleRetry}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Upload
            </button>
          )}
        </div>
      )}
    </div>
  );
} 