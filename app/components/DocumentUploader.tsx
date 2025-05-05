"use client";

import { useState, useRef, ChangeEvent } from 'react';
import { useAppwrite } from '@/app/lib/AppwriteContext';
import { documentStorageService } from '@/app/lib/appwrite';

interface DocumentUploaderProps {
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  label?: string;
  description?: string;
}

export default function DocumentUploader({
  allowedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  maxFileSizeMB = 10,
  label = "Upload Documents",
  description = "Upload your identification documents, proof of address, or other required documentation."
}: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument } = useAppwrite();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      setError(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`);
      return;
    }
    
    // Validate file size
    if (file.size > maxFileSizeBytes) {
      setError(`File is too large. Maximum size is ${maxFileSizeMB}MB.`);
      return;
    }
    
    // Upload to Appwrite Storage
    setIsUploading(true);
    setUploadProgress(10);
    setError(null);
    setSuccess(null);
    
    try {
      setUploadProgress(30);
      
      // Upload document using the Appwrite context
      setUploadProgress(50);
      await uploadDocument(file);
      setUploadProgress(100);
      
      setSuccess(`Successfully uploaded ${file.name}`);
      setIsUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
      setIsUploading(false);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={allowedFileTypes.join(',')}
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <p className="text-sm font-medium text-blue-600">Click to browse files</p>
        <p className="text-xs text-gray-500 mt-1">
          Supported files: {allowedFileTypes.join(', ')} (Max: {maxFileSizeMB}MB)
        </p>
      </div>
      
      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-700">Uploading...</span>
            <span className="text-xs font-medium text-blue-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Security Note: Your documents are encrypted during transfer and storage.</p>
      </div>
    </div>
  );
} 