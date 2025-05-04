"use client";

import { useAppSelector, useAppDispatch } from "../store/hooks";
import Link from "next/link";
import { useState, useEffect } from "react";
import DocumentsList from "../components/DocumentsList";
import { UploadedDocument, removeDataField, UserInputData, removeDocument } from "../store/userSlice";

// Interface for tracking input history
interface InputHistoryEntry {
  id: string;
  field: string;
  value: string;
  timestamp: string;
  user: string; // In a real app, this would be a user identifier
  isDocument?: boolean;
  documentData?: UploadedDocument;
}

export default function TestPage() {
  const userData = useAppSelector(state => state.user);
  const dispatch = useAppDispatch();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  
  // State for tracking input history
  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  
  // Update documents whenever userData changes
  useEffect(() => {
    if (userData.uploadedDocuments && Array.isArray(userData.uploadedDocuments)) {
      setDocuments(userData.uploadedDocuments);
    }
  }, [userData.uploadedDocuments]);
  
  // Generate input history entries from ALL userData fields, including empty ones
  useEffect(() => {
    const entries: InputHistoryEntry[] = [];
    
    // Process all userData fields for the table, including empty values
    Object.entries(userData).forEach(([key, value]) => {
      // Skip the uploadedDocuments array as it's handled separately
      if (key === 'uploadedDocuments') return;
      
      // Get appropriate timestamp from timestamps in userData or use current time
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
        value: value ? String(value) : "", // Convert to string, empty string if null
        timestamp,
        user: 'User1'
      });
    });
    
    // Add documents separately with special handling
    if (documents && documents.length > 0) {
      documents.forEach(doc => {
        entries.push({
          id: `doc-${doc.id}`,
          field: 'uploadedDocument',
          value: doc.name,
          timestamp: doc.uploadedAt,
          user: 'User1',
          isDocument: true,
          documentData: doc
        });
      });
    }
    
    setInputHistory(entries); // Replace previous entries
  }, [userData, documents]);
  
  // Handle deletion of a field
  const handleDeleteField = (fieldName: string) => {
    dispatch(removeDataField(fieldName));
    
    // Also remove from local inputHistory
    setInputHistory(prev => prev.filter(entry => entry.field !== fieldName));
  };

  // Handle document download
  const handleDownloadDocument = (doc: UploadedDocument) => {
    // If we don't have data or it's not base64, we can't download
    if (!doc.data || !doc.data.includes('base64')) {
      console.error('Invalid document data');
      return;
    }

    // Create an anchor element and trigger download
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle document deletion
  const handleDeleteDocument = (documentId: string) => {
    dispatch(removeDocument(documentId));
    // Local state will update via the useEffect that watches userData.uploadedDocuments
  };
  

  // Debug block
  const debugBlock = (
    <div className="mb-4 rounded bg-yellow-50 p-4 text-xs text-gray-800 border border-yellow-200">
      <strong>Debug: Raw Redux State</strong>
      <pre className="mt-2 overflow-x-auto">{JSON.stringify(userData, null, 2)}</pre>
    </div>
  );

  // Group fields for display
  const fieldGroups = [
    {
      title: "Authentication",
      fields: [
        { key: "authMethod", label: "Authentication Method", format: (val: string | null) => val === "email" ? "Email & Password" : val === "id.me" ? "ID.me Verification" : "Not authenticated" },
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
  const totalFields = Object.keys(userData).length;
  const completedFields = Object.values(userData).filter(Boolean).length;
  const progressPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Real-time User Input Monitoring</h1>
          <p className="mt-2 text-gray-600">
            This page displays user data as it is entered across all forms in real-time
          </p>
          
          
        </div>
        
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

            {/* Uploaded Documents Section - Using the specialized component */}
            {documents && <DocumentsList documents={documents} />}

            {/* Debug info */}
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-blue-800">Debug Information</h2>
              <div className="rounded bg-gray-100 p-3">
                <pre className="overflow-x-auto text-xs">        {debugBlock}
                </pre>
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
          // Input History Table View - Revised to show ALL fields including documents with download
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
                            {entry.isDocument && entry.documentData ? (
                              <>
                                <button
                                  onClick={() => handleDownloadDocument(entry.documentData!)}
                                  className="text-blue-600 hover:text-blue-900 focus:outline-none"
                                  title="Download document"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(entry.documentData!.id)}
                                  className="text-red-600 hover:text-red-900 focus:outline-none"
                                  title="Delete document"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleDeleteField(entry.field)}
                                className="text-red-600 hover:text-red-900 focus:outline-none"
                                title="Delete field data"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
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