"use client";

import { useState, useEffect } from "react";
import { UploadedDocument } from "../store/userSlice";

interface DocumentsListProps {
  documents: UploadedDocument[];
}

export default function DocumentsList({ documents }: DocumentsListProps) {
  // Handle document download
  const handleDownloadDocument = (fileDocument: UploadedDocument) => {
    // If we don't have data or it's not base64, we can't download
    if (!fileDocument.data || !fileDocument.data.includes('base64')) {
      console.error('Invalid document data');
      return;
    }

    // Create an anchor element and trigger download
    const link = document.createElement('a');
    link.href = fileDocument.data;
    link.download = fileDocument.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-blue-800">
        Uploaded Documents
      </h2>
      <div className="space-y-4">
        {documents.map((doc) => (
          <div 
            key={doc.id} 
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">{doc.name}</h3>
                <p className="text-xs text-gray-500">
                  {doc.size < 1024 ? `${doc.size} B` 
                    : doc.size < 1048576 ? `${Math.round(doc.size/1024)} KB` 
                    : `${Math.round(doc.size/1048576)} MB`} • 
                  Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownloadDocument(doc)}
              className="flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100"
            >
              <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 