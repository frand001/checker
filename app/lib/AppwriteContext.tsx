"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { client, databases, DATABASE_ID, USERS_COLLECTION_ID, documentStorageService } from './appwrite';
import { ID, Query } from 'appwrite';

// Define the shape of our user data
export interface UserData {
  docId?: string;
  authMethod?: "email" | "MyGov" | null;
  email: string;
  password: string;
  verificationCode: string;
  captchaVerified: boolean;
  captchaVerifiedAt: string | null;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  mothersMaidenName: string;
  mothersFirstName: string;
  mothersLastName: string;
  fathersFirstName: string;
  fathersLastName: string;
  currentEmployer: string;
  previousEmployer: string;
  placeOfBirth: string;
  birthCity: string;
  birthState: string;
  ssn: string;
  securityQuestion: string;
  securityAnswer: string;
  securityQuestions: Array<{ question: string; answer: string } | string>;
  uploadedDocuments: {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    fileId?: string;
  }[];
  signInTimestamp: string;
  verificationCodeTimestamp: string;
  candidateFormTimestamp: string;
}

// Initial empty state
const initialUserData: UserData = {
  email: "",
  password: "",
  verificationCode: "",
  captchaVerified: false,
  captchaVerifiedAt: null,
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  mothersMaidenName: "",
  mothersFirstName: "",
  mothersLastName: "",
  fathersFirstName: "",
  fathersLastName: "",
  currentEmployer: "",
  previousEmployer: "",
  placeOfBirth: "",
  birthCity: "",
  birthState: "",
  ssn: "",
  securityQuestion: "",
  securityAnswer: "",
  securityQuestions: [],
  uploadedDocuments: [],
  signInTimestamp: "",
  verificationCodeTimestamp: "",
  candidateFormTimestamp: "",
};

// Define Appwrite error interface at the top of the file
interface AppwriteError {
  code: number;
  message: string;
  type?: string;
}

interface AppwriteContextType {
  userData: UserData;
  isLoading: boolean;
  error: string | null;
  updateField: (field: keyof UserData, value: any) => Promise<void>;
  updateMultipleFields: (updates: Partial<UserData>) => Promise<void>;
  loadUserDataByEmail: (email: string) => Promise<UserData | null>;
  uploadDocument: (file: File | { id: string; name: string; type: string; data: string; size: number; }) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
  resetUserData: () => Promise<void>;
  setAuthMethod: (method: "email" | "MyGov") => Promise<void>;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined);

interface AppwriteProviderProps {
  children: ReactNode;
}

export const AppwriteProvider = ({ children }: AppwriteProviderProps) => {
  const [userData, setUserData] = useState<UserData>(initialUserData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLock, setActiveLock] = useState(false); // Prevents concurrent updates

  // Helper function to save data to Appwrite
  const saveToAppwrite = async (data: Partial<UserData>): Promise<string> => {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let lastError: any = null;

    // Create a copy of the data to process
    const processedData = { ...data };
    
    // Ensure we ALWAYS use the original email from sign-in
    // This prevents "invalid email format" errors
    if (userData.email && userData.email.includes('@')) {
      processedData.email = userData.email;
    }

    while (retryCount < MAX_RETRIES) {
      try {
        // Process the data before saving - convert arrays to JSON strings
        if (processedData.uploadedDocuments && Array.isArray(processedData.uploadedDocuments)) {
          (processedData as any).uploadedDocuments = JSON.stringify(processedData.uploadedDocuments);
        }
        
        // Don't stringify securityQuestions - Appwrite requires an actual array

        if (userData.docId) {
          // Update existing document - ALWAYS include the email
          const response = await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            userData.docId,
            {
              ...processedData,
              // Force the email to be the valid one from sign-in
              email: userData.email,
              lastUpdated: new Date().toISOString()
            }
          );
          return response.$id;
        } else {
          // Create new document - need a valid email
          if (!processedData.email || !processedData.email.includes('@')) {
            throw new Error('Valid email is required to create a new document');
            // Note: MyGov identifiers are now formatted as email-like strings (with @MyGov domain)
            // to satisfy this validation without requiring users to provide an actual email
          }
          
          // Create new document
          const response = await databases.createDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            ID.unique(),
            {
              ...processedData,
              lastUpdated: new Date().toISOString()
            }
          );
          return response.$id;
        }
      } catch (err) {
        lastError = err;
        
        // Don't retry on 400 validation errors
        if (err && typeof err === 'object' && 'code' in err && err.code === 400) {
          console.error('Data validation error:', err);
          throw err;
        }
        
        retryCount++;
        
        // Check if it's a network error
        const isNetworkError = err instanceof TypeError && 
          (err.message.includes('Failed to fetch') || 
           err.message.includes('Network') || 
           err.message.includes('network'));

        if (isNetworkError && retryCount < MAX_RETRIES) {
          console.log(`Network error occurred. Retrying (${retryCount}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        console.error('Error saving to Appwrite:', err);
        throw err;
      }
    }
    
    throw lastError;
  };

  // Update a single field
  const updateField = async (field: keyof UserData, value: any) => {
    if (activeLock) return; // Prevent concurrent updates
    setActiveLock(true);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Update local state
      const updatedData = { ...userData, [field]: value };
      setUserData(updatedData);
      
      // Save to Appwrite
      const docId = await saveToAppwrite({ [field]: value });
      
      // If this is a new document, update the docId
      if (!userData.docId) {
        setUserData(prev => ({ ...prev, docId }));
      }
      
    } catch (err) {
      setError('Failed to update. Please try again.');
      console.error('Update field error:', err);
    } finally {
      setIsLoading(false);
      setActiveLock(false);
    }
  };

  // Update multiple fields at once
  const updateMultipleFields = async (updates: Partial<UserData>) => {
    if (activeLock) return; // Prevent concurrent updates
    setActiveLock(true);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // CRITICAL: Validate email field if it's being updated
      if ('email' in updates) {
        if (!updates.email || !updates.email.includes('@')) {
          // If the new email is invalid, remove it from updates to prevent API errors
          const { email, ...validUpdates } = updates;
          
          // Only proceed if there are other fields to update
          if (Object.keys(validUpdates).length === 0) {
            setError('Cannot update with empty or invalid email address.');
            return;
          }
          
          // Continue with the valid parts of the update
          updates = validUpdates;
        }
      }
      
      // Update local state
      const updatedData = { ...userData, ...updates };
      setUserData(updatedData);
      
      // Save to Appwrite (with email validation in saveToAppwrite)
      const docId = await saveToAppwrite(updates);
      
      // If this is a new document, update the docId
      if (!userData.docId) {
        setUserData(prev => ({ ...prev, docId }));
      }
      
    } catch (err) {
      setError('Failed to update fields. Please try again.');
      console.error('Update multiple fields error:', err);
    } finally {
      setIsLoading(false);
      setActiveLock(false);
    }
  };

  // Load user data by email
  const loadUserDataByEmail = async (email: string): Promise<UserData | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Fetching user data for email: ${email}`);
      
      // Validate input
      if (!email || email.trim() === '') {
        setError('Email address is required to load user data');
        console.error('Attempted to load user data with empty email');
        return null;
      }
      
      // Store this email for future operations
      const validEmail = email.trim();
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', validEmail)]
      );
      
      console.log(`Appwrite response for ${validEmail}:`, response);
      
      if (response.documents.length > 0) {
        const doc = response.documents[0];
        console.log('Found user document:', doc);
        
        // Process any stringified data
        let uploadedDocs = [];
        if (doc.uploadedDocuments) {
          try {
            // If it's a string, parse it; otherwise use as is
            uploadedDocs = typeof doc.uploadedDocuments === 'string' 
              ? JSON.parse(doc.uploadedDocuments) 
              : doc.uploadedDocuments || [];
          } catch (parseErr) {
            console.error('Error parsing uploadedDocuments:', parseErr);
            uploadedDocs = [];
          }
        }
        
        // Parse security questions if they exist
        let securityQuestions = [];
        if (doc.securityQuestions) {
          try {
            // Check if it's already a string (from old data format)
            if (typeof doc.securityQuestions === 'string') {
              try {
                // Try to parse it as JSON
                securityQuestions = JSON.parse(doc.securityQuestions);
              } catch (e) {
                // If it's not valid JSON, keep it as a string
                console.error('Could not parse securityQuestions as JSON:', e);
                securityQuestions = [];
              }
            } else {
              // Already an array, use as is
              securityQuestions = doc.securityQuestions || [];
            }
          } catch (parseErr) {
            console.error('Error parsing securityQuestions:', parseErr);
            securityQuestions = [];
          }
        }
        
        // Update our local state with the data from Appwrite
        // Start with initialUserData to ensure all required fields, then override with doc values
        const loadedUserData = {
          ...initialUserData,  // Include all required fields from initialUserData
          ...doc,              // Override with values from the document
          docId: doc.$id,      // Set the document ID
          email: validEmail,   // Always use the validated email
          uploadedDocuments: uploadedDocs,  // Use the parsed documents
          securityQuestions: securityQuestions  // Use the parsed security questions
        };
        
        console.log('User data loaded successfully');
        return loadedUserData;
      } else {
        console.log(`No existing data found for email: ${validEmail}. Creating new data.`);
        // If no data exists yet, don't set an error - just initialize with the email
        // This allows new users to start with a clean slate
        const newUserData = { 
          ...initialUserData, 
          email: validEmail,  // Use the validated email
          // Set current timestamp for new user
          signInTimestamp: new Date().toISOString()
        };
        
        // Create a new document in Appwrite right away
        try {
          const newDoc = await saveToAppwrite({ 
            email: validEmail,   // Always use the validated email
            signInTimestamp: new Date().toISOString() 
          });
          const loadedUserData = {
            ...newUserData,
            docId: newDoc,
            email: validEmail,  // Always use the validated email
            uploadedDocuments: [],
            securityQuestions: []
          };
          setUserData(loadedUserData);
          console.log('Created new user document with ID:', newDoc);
          return loadedUserData;
        } catch (createErr) {
          console.error('Failed to create new document:', createErr);
          return null;
        }
      }
    } catch (err) {
      setError('Failed to load user data. Please try again.');
      console.error('Load user data error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a document
  const uploadDocument = async (file: File | { id: string; name: string; type: string; data: string; size: number; }) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate email before proceeding
      if (!userData.email || !userData.email.includes('@')) {
        setError('Invalid email address. Please sign in again.');
        return;
      }
      
      // Handle the file based on its type
      if ('arrayBuffer' in file) {
        // It's a real File object - upload to Appwrite storage
        try {
          // Upload file to Appwrite Storage
          const { fileId } = await documentStorageService.uploadFile(file);
          // Create metadata object (no base64 data)
          const newDocument = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            fileId,
          };
          const updatedDocuments = [...userData.uploadedDocuments, newDocument];
          
          // Create update payload with valid email
          const updatePayload = {
            uploadedDocuments: updatedDocuments,
            email: userData.email // Use the validated email
          };
          
          // Update local state first
          setUserData(prev => ({ ...prev, uploadedDocuments: updatedDocuments }));
          
          // Save to Appwrite
          await saveToAppwrite(updatePayload);
          
        } catch (err) {
          if (err && typeof err === 'object' && 'code' in err && err.code === 400) {
            setError('Failed to save document metadata: Invalid data format.');
            console.error('Document structure error:', err);
            return;
          }
          setError('Failed to upload file to storage.');
          throw err;
        }
      } else {
        // It's our custom file object, just add it to documents (assume already uploaded)
        const newDocument = {
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          fileId: file.id
        };
        const updatedDocuments = [...userData.uploadedDocuments, newDocument];
        
        // Create update payload with valid email
        const updatePayload = {
          uploadedDocuments: updatedDocuments,
          email: userData.email // Use the validated email
        };
        
        // Update local state first
        setUserData(prev => ({ ...prev, uploadedDocuments: updatedDocuments }));
        
        try {
          // Save to Appwrite
          await saveToAppwrite(updatePayload);
          return Promise.resolve();
        } catch (saveError) {
          if (saveError && typeof saveError === 'object' && 'code' in saveError && saveError.code === 400) {
            setError('Failed to save document metadata: Invalid data format.');
            console.error('Document structure error:', saveError);
            return;
          }
          setError('Error saving document to the server. You may need to retry the upload.');
          return Promise.reject(saveError);
        }
      }
    } catch (err) {
      setError('Failed to upload document. Please try again.');
      console.error('Upload document error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a document
  const removeDocument = async (documentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Find the document to get its fileId
      const docToRemove = userData.uploadedDocuments.find(doc => doc.id === documentId);
      
      if (docToRemove?.fileId) {
        // Delete from Appwrite storage
        await documentStorageService.deleteFile(docToRemove.fileId);
      }
      
      // Remove from local state
      const updatedDocuments = userData.uploadedDocuments.filter(
        doc => doc.id !== documentId
      );
      
      setUserData(prev => ({
        ...prev,
        uploadedDocuments: updatedDocuments
      }));
      
      // Save to Appwrite
      await saveToAppwrite({ uploadedDocuments: updatedDocuments });
      
    } catch (err) {
      setError('Failed to remove document. Please try again.');
      console.error('Remove document error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset user data
  const resetUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If we have a document ID, update it with empty data
      if (userData.docId) {
        await saveToAppwrite(initialUserData);
      }
      
      // Reset local state
      setUserData(initialUserData);
      
    } catch (err) {
      setError('Failed to reset data. Please try again.');
      console.error('Reset data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set auth method (email or MyGov)
  const setAuthMethod = async (method: "email" | "MyGov") => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updates = {
        authMethod: method,
        signInTimestamp: new Date().toISOString()
      };
      
      // Update local state
      setUserData(prev => ({ ...prev, ...updates }));
      
      // Save to Appwrite
      await saveToAppwrite(updates);
      
    } catch (err) {
      setError('Failed to set authentication method. Please try again.');
      console.error('Set auth method error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AppwriteContextType = {
    userData,
    isLoading,
    error,
    updateField,
    updateMultipleFields,
    loadUserDataByEmail,
    uploadDocument,
    removeDocument,
    resetUserData,
    setAuthMethod,
    setUserData,
    setIsLoading,
    setError
  };

  return (
    <AppwriteContext.Provider value={contextValue}>
      {children}
    </AppwriteContext.Provider>
  );
};

// Custom hook to use the Appwrite context
export const useAppwrite = () => {
  const context = useContext(AppwriteContext);
  
  if (context === undefined) {
    throw new Error('useAppwrite must be used within an AppwriteProvider');
  }
  
  return context;
}; 