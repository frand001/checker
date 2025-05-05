"use client";

import React from 'react';
import { useState, useEffect } from "react";
import { documentStorageService } from "@/app/lib/appwrite";
import { useAppwrite } from "@/app/lib/AppwriteContext";

interface Document {
  id: string;
  name: string;
  type?: string;
  size: number;
  uploadedAt?: string;
  data?: string;
}

interface DocumentsListProps {
  documents: Document[];
}

const DocumentsList: React.FC<DocumentsListProps> = ({ documents }) => {
  const { removeDocument } = useAppwrite();
  
  // Format file size in a human-readable way
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes/1024)} KB`;
    return `${Math.round(bytes/1048576)} MB`;
  };

  // Handle document download
  const handleDownloadDocument = (fileDocument: Document) => {
    if (fileDocument.data && fileDocument.data.includes('base64')) {
      // Fallback for legacy documents stored as base64
      const link = document.createElement('a');
      link.href = fileDocument.data;
      link.download = fileDocument.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('Invalid document data');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (document: Document) => {
    try {
      // Call the removeDocument method from Appwrite context
      await removeDocument(document.id);
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow mb-8">
      <h2 className="mb-4 text-xl font-semibold text-blue-800">Uploaded Documents</h2>
      
      <div className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(doc.size)} • 
                  {doc.type === 'front-id' ? ' Front ID' : 
                   doc.type === 'back-id' ? ' Back ID' : 
                   ' Document'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-4">
                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Unknown date'}
              </span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsList; 