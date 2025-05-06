"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppwrite } from "@/app/lib/AppwriteContext";
import { client, databases, DATABASE_ID, USERS_COLLECTION_ID, documentStorageService } from "@/app/lib/appwrite";
import Image from "next/image";

// Create a wrapper component that uses the search params
function UserDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  
  const {
    userData,
    isLoading,
    error,
    loadUserDataByEmail,
    resetUserData,
    setUserData,
    setIsLoading,
    setError,
  } = useAppwrite();

  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fileExistsStatus, setFileExistsStatus] = useState<Record<string, boolean>>({});

  // Load user data on mount
  useEffect(() => {
    if (email) {
      loadData();
    }
  }, [email]);

  // Function to load data
  const loadData = async () => {
    try {
      setError(null);
      // Only show loading state on initial load or manual refresh
      if (!userData.docId) {
        setIsLoading(true);
      }
      
      if (!email) {
        setError("No email provided");
        return;
      }
      
      const data = await loadUserDataByEmail(email);
      if (!data) {
        setError("User data not found");
        return;
      }
      
      setUserData(data);
    } catch (err) {
      console.error("Error loading user data:", err);
      setError("Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  };

  // Set up realtime subscription with debounced updates
  const reloadTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!userData.docId) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${USERS_COLLECTION_ID}.documents.${userData.docId}`,
      (response) => {
        console.log('Realtime update received:', response);
        // Don't show loading state for realtime updates
        if (reloadTimeout.current) clearTimeout(reloadTimeout.current);
        reloadTimeout.current = setTimeout(() => {
          loadData();
          setRealtimeStatus('connected');
        }, 2000);
      }
    );

    return () => {
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current);
      unsubscribe();
    };
  }, [userData.docId]);

  // Handle reset
  const handleReset = async () => {
    if (confirm(`Are you sure you want to reset all data for ${email}?`)) {
      try {
        await resetUserData();
        loadData(); // Reload data after reset
      } catch (err) {
        console.error("Error resetting user data:", err);
      }
    }
  };
  
  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userData.docId) return;
    if (!email) return;
    
    if (confirm(`Are you sure you want to DELETE ${email} from the database? This action cannot be undone.`)) {
      try {
        setIsDeleting(true);
        setDeleteError(null);
        
        await databases.deleteDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          userData.docId
        );
        
        // Redirect to the test page after successful deletion
        router.push('/test?deleted=' + encodeURIComponent(email || ''));
        
      } catch (error) {
        console.error("Error deleting user:", error);
        setDeleteError(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsDeleting(false);
      }
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1048576)} MB`;
  };

  // Function to handle document download
  const handleDownloadDocument = (fileId: string | undefined, fileName: string) => {
    if (!fileId) {
      alert("This document doesn't have a download link.");
      return;
    }
    
    try {
      // Get download URL from Appwrite
      const downloadUrl = documentStorageService.getFileDownloadUrl(fileId);
      
      // Create a temporary anchor to trigger download
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName || 'document';
      anchor.target = '_blank';
      
      // Add error handling for 404s
      anchor.onerror = () => {
        alert(`File "${fileName}" could not be found. It may have been deleted from storage.`);
      };
      
      // Create a fallback if the download fails
      const timeoutId = setTimeout(() => {
        // If it takes too long, we'll assume there was an error
        alert(`File "${fileName}" could not be downloaded. It may no longer exist in the storage.`);
      }, 5000);
      
      // Add onload handler to clear the timeout
      anchor.onload = () => {
        clearTimeout(timeoutId);
      };
      
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      
      // Also open in a new tab as an alternative
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error("Error downloading document:", error);
      alert(`Failed to download file "${fileName}". The file may no longer exist in the storage.`);
    }
  };

  // Function to get view URL for file preview
  const getFilePreviewUrl = (fileId: string | undefined) => {
    if (!fileId) return null;
    return documentStorageService.getFileViewUrl(fileId);
  };

  // Function to check if file is an image
  const isImageFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  // Check if documents actually exist in storage
  useEffect(() => {
    async function checkUploadedFiles() {
      if (!userData.uploadedDocuments || userData.uploadedDocuments.length === 0) return;
      
      const fileStatuses: Record<string, boolean> = {};
      
      // Check each document with a fileId
      for (const doc of userData.uploadedDocuments) {
        if (doc.fileId) {
          try {
            const exists = await documentStorageService.checkFileExists(doc.fileId);
            fileStatuses[doc.fileId] = exists;
          } catch (err) {
            console.error(`Error checking file ${doc.fileId}:`, err);
            fileStatuses[doc.fileId] = false;
          }
        }
      }
      
      setFileExistsStatus(fileStatuses);
    }
    
    checkUploadedFiles();
  }, [userData.uploadedDocuments]);

  // Function to check if a file exists (with proper type safety)
  const fileExists = (fileId: string | undefined): boolean => {
    if (!fileId) return false;
    return fileExistsStatus[fileId] !== false;
  };
  
  // Function to check if a file is explicitly marked as not existing
  const fileDoesNotExist = (fileId: string | undefined): boolean => {
    if (!fileId) return true;
    return fileExistsStatus[fileId] === false;
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-700">No email parameter provided.</p>
          <div className="mt-8">
            <Link
              href="/test"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Back to User List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header section with loading indicator */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-blue-800">
              User Details: {email}
            </h1>
            {isLoading && (
              <div className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              <span className="mr-2">Realtime:</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  realtimeStatus === "connected"
                    ? "bg-green-100 text-green-800"
                    : realtimeStatus === "connecting"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <span
                  className={`mr-1 h-2 w-2 rounded-full ${
                    realtimeStatus === "connected"
                      ? "bg-green-500"
                      : realtimeStatus === "connecting"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                ></span>
                {realtimeStatus === "connected"
                  ? "Connected"
                  : realtimeStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
              </span>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`mr-1 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isLoading ? "Loading..." : "Refresh"}
            </button>

            <Link
              href="/test"
              className="rounded bg-gray-200 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-300"
            >
              Back to List
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        
        {deleteError && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
            {deleteError}
          </div>
        )}

        {/* Main content without loading overlay */}
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Basic Information</h2>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.email || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Auth Method</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData.authMethod === "email"
                      ? "Email & Password"
                      : userData.authMethod === "id.me"
                      ? "ID.me Verification"
                      : "Not authenticated"}
                  </dd>
                </div>
                {userData.password && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Password</dt>
                    <dd className="mt-1 text-sm text-gray-900">{userData.password}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {[userData.firstName, userData.middleName, userData.lastName].filter(Boolean).join(" ") || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.phoneNumber || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.dateOfBirth || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">SSN</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData.ssn || "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          {/* Security Questions Section */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-800">Security Questions</h2>
              {userData.securityQuestions && userData.securityQuestions.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {userData.securityQuestions.length} Questions Answered
                </span>
              )}
            </div>
            
            <div className="p-4">
              {/* Legacy Security Question Display */}
              {userData.securityQuestion && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Legacy Security Question</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Question</dt>
                      <dd className="mt-1 text-sm text-gray-900">{userData.securityQuestion || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Answer</dt>
                      <dd className="mt-1 text-sm text-gray-900">{userData.securityAnswer || "Not provided"}</dd>
                    </div>
                  </dl>
                </div>
              )}
              
              {/* New Multiple Security Questions Display */}
              {userData.securityQuestions && userData.securityQuestions.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">All Security Questions</h3>
                  <div className="border rounded-md divide-y divide-gray-200">
                    {userData.securityQuestions.map((item, index) => {
                      // Handle both string format "question: answer" and object format {question, answer}
                      let question = '';
                      let answer = '';
                      
                      if (typeof item === 'string') {
                        // Format: "What is your favorite color?: Blue"
                        const parts = item.split(': ');
                        if (parts.length > 1) {
                          question = parts[0];
                          answer = parts.slice(1).join(': '); // Rejoin in case the answer itself contains ': '
                        } else {
                          question = item;
                          answer = 'No answer provided';
                        }
                      } else if (item && typeof item === 'object') {
                        // Format: {question: "What is your favorite color?", answer: "Blue"}
                        question = item.question || '';
                        answer = item.answer || '';
                      }
                      
                      return (
                        <div key={index} className="p-4 hover:bg-gray-50">
                          <div className="mb-1 flex items-start">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800">
                              {index + 1}
                            </span>
                            <p className="ml-3 text-sm font-medium text-gray-900">{question}</p>
                          </div>
                          <p className="ml-9 text-sm text-gray-500">{answer}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No security questions answered</div>
              )}
            </div>
          </div>
          {/* Security Information */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Security Information</h2>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Security Question</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.securityQuestion || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Security Answer</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData.securityAnswer || "Not provided"}
                  </dd>
                </div>
                
                
                
                {/* Add verification code display */}
                {userData.verificationCode && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Verification Code</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-900">
                      <span className="rounded bg-yellow-100 px-2 py-1 font-medium text-yellow-800">
                        {userData.verificationCode}
                      </span>
                      {userData.verificationCodeTimestamp && (
                        <span className="ml-2 text-xs text-gray-500">
                          (Used on {new Date(userData.verificationCodeTimestamp).toLocaleString()})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Address Section */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Address Information</h2>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.address || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">City</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.city || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">State</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.state || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Zip Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.zipCode || "Not provided"}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Family Information */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Family Information</h2>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mother's First Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.mothersFirstName || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mother's Last Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.mothersLastName || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mother's Maiden Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.mothersMaidenName || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Father's First Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.fathersFirstName || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Father's Last Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.fathersLastName || "Not provided"}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Employment Information */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Employment Information</h2>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Employer</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.currentEmployer || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Previous Employer</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.previousEmployer || "Not provided"}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Birth Information */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Birth Information</h2>
            </div>
            <div className="p-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Birth City</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.birthCity || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Birth State</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.birthState || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Place of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData.placeOfBirth || "Not provided"}</dd>
                </div>
              </dl>
            </div>
          </div>

          

          {/* Documents Section */}
          {userData.uploadedDocuments && userData.uploadedDocuments.length > 0 && (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-lg font-medium text-gray-800">Uploaded Documents</h2>
              </div>
              <div className="p-4">
                <ul className="divide-y divide-gray-200">
                  {userData.uploadedDocuments.map((doc) => (
                    <li key={doc.id} className="py-4">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                              <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                {doc.type === 'front-id' 
                                  ? 'Front ID' 
                                  : doc.type === 'back-id' 
                                  ? 'Back ID' 
                                  : 'Document'}{' '}
                                • {formatFileSize(doc.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500">
                              {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Unknown date'}
                            </p>
                            <button
                              onClick={() => handleDownloadDocument(doc.fileId, doc.name)}
                              className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!doc.fileId || (doc.fileId ? fileDoesNotExist(doc.fileId) : false)}
                              title={
                                !doc.fileId 
                                  ? "Document not available for download" 
                                  : fileDoesNotExist(doc.fileId)
                                  ? "File no longer exists in storage"
                                  : `Download ${doc.name}`
                              }
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {!doc.fileId 
                                ? "Not available" 
                                : fileDoesNotExist(doc.fileId)
                                ? "File missing" 
                                : "Download"
                              }
                            </button>
                          </div>
                        </div>
                        
                        {/* Image Preview */}
                        {doc.fileId && isImageFile(doc.name) && fileExists(doc.fileId) && (
                          <div className="mt-2 overflow-hidden rounded-md border border-gray-200">
                            <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                              {/* Use an img tag instead of Image for external URLs */}
                              <img
                                src={getFilePreviewUrl(doc.fileId) || ''}
                                alt={doc.name}
                                className="object-contain w-full h-full"
                                onError={(e) => {
                                  // Handle image load errors
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAxMi4wMDJjMC0xLjExMS0uODktMi4wMDEtMi0yLjAwMWgtOC4xNzJsLTIuODI4LTIuODI3LTIuODI4IDIuODI3aC04LjE3MmMtMS4xMSAwLTIgLjg5LTIgMi4wMDF2OWMwIDEuMTExLjg5IDIuMDAxIDIgMi4wMDFoMjBjMS4xMSAwIDItLjg5IDItMi4wMDF2LTl6bS0yIDBoLTIwdjloMjB2LTl6bS0xMyA3di0zaDN2LTJoLTN2LTNoLTJ2M2gtM3YyaDN2M2gyeiIvPjwvc3ZnPg==';
                                  (e.target as HTMLImageElement).classList.add('p-8');
                                }}
                              />
                            </div>
                            <div className="p-2 text-xs text-center text-gray-500">
                              Preview of {doc.name}
                            </div>
                          </div>
                        )}
                        
                        {/* Show message for missing image files */}
                        {doc.fileId && isImageFile(doc.name) && fileDoesNotExist(doc.fileId) && (
                          <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Image file no longer exists in storage
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Timestamps Section */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-medium text-gray-800">Activity Timeline</h2>
            </div>
            <div className="p-4">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Document Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData && (userData as any).$createdAt ? new Date((userData as any).$createdAt).toLocaleString() : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData && (userData as any).$updatedAt ? new Date((userData as any).$updatedAt).toLocaleString() : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sign In</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData.signInTimestamp ? new Date(userData.signInTimestamp).toLocaleString() : "Never"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Verification Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData.verificationCodeTimestamp ? new Date(userData.verificationCodeTimestamp).toLocaleString() : "Never"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Candidate Form</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData.candidateFormTimestamp ? new Date(userData.candidateFormTimestamp).toLocaleString() : "Never"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Reset and Delete Data Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={handleReset}
              disabled={isDeleting}
              className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              Reset User Data
            </button>
            
            <button
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="flex items-center rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the content in a Suspense boundary
export default function UserDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-700">Loading user details...</p>
        </div>
      </div>
    }>
      <UserDetailsContent />
    </Suspense>
  );
} 