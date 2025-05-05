"use client";

import { useState, useEffect } from 'react';
import DocumentUploader from '@/app/components/DocumentUploader';
import DocumentsList from '@/app/components/DocumentsList';
import { useAppwrite } from '@/app/lib/AppwriteContext';
import Link from 'next/link';

export default function DocumentUploadPage() {
  const { userData } = useAppwrite();
  
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-blue-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Document Upload Demo</h1>
            <p className="text-blue-100 mt-1">
              Demonstrates Appwrite Storage integration with Redux
            </p>
          </div>
          
          <div className="p-6">
            <div className="mb-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
              <h2 className="text-lg font-medium text-yellow-800 mb-2">How This Works</h2>
              <p className="text-sm text-yellow-700">
                When you upload a file, it is stored in Appwrite Storage and referenced in Redux state.
                The data is synchronized across devices using the same email address.
              </p>
              <ol className="mt-3 ml-4 text-sm text-yellow-700 list-decimal">
                <li>Files are uploaded to Appwrite Storage</li>
                <li>File references are stored in Redux</li>
                <li>Redux state is persisted to Appwrite Database</li>
                <li>Files can be retrieved from any device with the same account</li>
              </ol>
            </div>
            
            {/* Document Uploader Component */}
            <div className="mb-8">
              <DocumentUploader 
                label="Upload Documents to Appwrite Storage"
                description="Select files to upload to Appwrite Storage. Files will be available across devices."
                allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                maxFileSizeMB={5}
              />
            </div>
            
            {/* Document List Component */}
            {userData.uploadedDocuments && userData.uploadedDocuments.length > 0 && (
              <div className="mb-8">
                <DocumentsList documents={userData.uploadedDocuments} />
              </div>
            )}
            
            {/* Debug Information */}
            <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Debug Information</h3>
              <div className="text-xs text-gray-600 overflow-x-auto">
                <p className="mb-2"><strong>Email:</strong> {userData.email || 'Not set'}</p>
                <p className="mb-2"><strong>Documents Count:</strong> {userData.uploadedDocuments?.length || 0}</p>
                <p className="mb-2"><strong>Appwrite Doc ID:</strong> {userData.docId || 'Not saved to Appwrite yet'}</p>
                <pre className="p-2 bg-gray-100 rounded">{JSON.stringify(userData.uploadedDocuments, null, 2)}</pre>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center space-x-4">
              <Link
                href="/test"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Test Page
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 