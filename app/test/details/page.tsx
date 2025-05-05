"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppwrite } from "@/app/lib/AppwriteContext";
import { client, databases, DATABASE_ID, USERS_COLLECTION_ID } from "@/app/lib/appwrite";

export default function UserDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  
  const {
    userData,
    isLoading,
    error,
    loadUserDataByEmail,
    resetUserData,
  } = useAppwrite();

  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load user data on mount
  useEffect(() => {
    if (email) {
      loadData();
    }
  }, [email]);

  // Function to load data
  const loadData = async () => {
    if (!email) return;
    try {
      await loadUserDataByEmail(email);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!userData.docId) return;

    // Subscribe to changes to this specific document
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${USERS_COLLECTION_ID}.documents.${userData.docId}`,
      (response) => {
        console.log('Realtime update received:', response);
        loadData();
        setRealtimeStatus('connected');
        setLastUpdate(new Date());
      }
    );

    // Set as connected after a delay
    const timer = setTimeout(() => {
      setRealtimeStatus('connected');
    }, 2000);

    return () => {
      clearTimeout(timer);
      unsubscribe();
      setRealtimeStatus('disconnected');
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">
              User Details: {email}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {userData.docId ? `Document ID: ${userData.docId}` : "Loading..."}
            </p>
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

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
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

            {/* Documents Section */}
            {userData.uploadedDocuments && userData.uploadedDocuments.length > 0 && (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <h2 className="text-lg font-medium text-gray-800">Uploaded Documents</h2>
                </div>
                <div className="p-4">
                  <ul className="divide-y divide-gray-200">
                    {userData.uploadedDocuments.map((doc) => (
                      <li key={doc.id} className="py-3">
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
                          <p className="text-xs text-gray-500">
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Unknown date'}
                          </p>
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
        )}
      </div>
    </div>
  );
} 