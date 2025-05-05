"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { client, databases, DATABASE_ID, USERS_COLLECTION_ID, documentStorageService } from './appwrite';
import { ID, Query } from 'appwrite';

// Define the shape of our user data
export interface UserData {
  docId?: string;
  authMethod?: "email" | "id.me" | null;
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
  uploadedDocuments: {
    id: string;
    name: string;
    type: string;
    data: string;
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
  uploadedDocuments: [],
  signInTimestamp: "",
  verificationCodeTimestamp: "",
  candidateFormTimestamp: "",
};

interface AppwriteContextType {
  userData: UserData;
  isLoading: boolean;
  error: string | null;
  updateField: (field: keyof UserData, value: any) => Promise<void>;
  updateMultipleFields: (updates: Partial<UserData>) => Promise<void>;
  loadUserDataByEmail: (email: string) => Promise<void>;
  uploadDocument: (file: File | { id: string; name: string; type: string; data: string; size: number; }) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
  resetUserData: () => Promise<void>;
  setAuthMethod: (method: "email" | "id.me") => Promise<void>;
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
    try {
      // Process the data before saving - convert arrays to JSON strings
      const processedData = { ...data };
      
      // If uploadedDocuments exists and is an array, stringify it
      if (processedData.uploadedDocuments && Array.isArray(processedData.uploadedDocuments)) {
        // Need to cast to any to avoid TypeScript errors with the string conversion
        (processedData as any).uploadedDocuments = JSON.stringify(processedData.uploadedDocuments);
      }

      if (userData.docId) {
        // Update existing document
        const response = await databases.updateDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          userData.docId,
          {
            ...processedData,
            lastUpdated: new Date().toISOString()
          }
        );
        return response.$id;
      } else {
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
      console.error('Error saving to Appwrite:', err);
      throw err;
    }
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
      
      // Update local state
      const updatedData = { ...userData, ...updates };
      setUserData(updatedData);
      
      // Save to Appwrite
      const docId = await saveToAppwrite(updates);
      
      // If this is a new document, update the docId
      if (!userData.docId) {
        setUserData(prev => ({ ...prev, docId }));
      }
      
    } catch (err) {
      setError('Failed to update multiple fields. Please try again.');
      console.error('Update multiple fields error:', err);
    } finally {
      setIsLoading(false);
      setActiveLock(false);
    }
  };

  // Load user data by email
  const loadUserDataByEmail = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Fetching user data for email: ${email}`);
      
      // Validate input
      if (!email || email.trim() === '') {
        setError('Email address is required to load user data');
        console.error('Attempted to load user data with empty email');
        return;
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', email)]
      );
      
      console.log(`Appwrite response for ${email}:`, response);
      
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
        
        // Update our local state with the data from Appwrite
        // Start with initialUserData to ensure all required fields, then override with doc values
        setUserData({
          ...initialUserData,  // Include all required fields from initialUserData
          ...doc,              // Override with values from the document
          docId: doc.$id,      // Set the document ID
          email: doc.email || email,  // Ensure email is always set
          uploadedDocuments: uploadedDocs  // Use the parsed documents
        });
        
        console.log('User data loaded successfully');
      } else {
        console.log(`No existing data found for email: ${email}. Creating new data.`);
        // If no data exists yet, don't set an error - just initialize with the email
        // This allows new users to start with a clean slate
        setUserData({ 
          ...initialUserData, 
          email,
          // Set current timestamp for new user
          signInTimestamp: new Date().toISOString()
        });
        
        // Optionally create a new document in Appwrite right away
        try {
          const newDoc = await saveToAppwrite({ 
            email, 
            signInTimestamp: new Date().toISOString() 
          });
          setUserData(prev => ({ ...prev, docId: newDoc }));
          console.log('Created new user document with ID:', newDoc);
        } catch (createErr) {
          console.error('Failed to create new document:', createErr);
        }
      }
    } catch (err) {
      setError('Failed to load user data. Please try again.');
      console.error('Load user data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a document
  const uploadDocument = async (file: File | { id: string; name: string; type: string; data: string; size: number; }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Handle the file based on its type
      if ('arrayBuffer' in file) {
        // It's a real File object - upload to Appwrite storage
        
        // Create a preview for local state
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = async () => {
            try {
              // Create a unique ID for the file
              const fileId = ID.unique();
              const base64data = reader.result as string;
              
              // Add to local state
              const newDocument = {
                id: fileId,
                name: file.name,
                type: file.type,
                data: base64data.substring(0, 200) + '...', // Small preview
                size: file.size,
                uploadedAt: new Date().toISOString(),
                fileId
              };
              
              const updatedDocuments = [...userData.uploadedDocuments, newDocument];
              
              // Update local state
              setUserData(prev => ({
                ...prev, 
                uploadedDocuments: updatedDocuments
              }));
              
              // Save to Appwrite
              await saveToAppwrite({ uploadedDocuments: updatedDocuments });
              
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      } else {
        // It's our custom file object, just add it to documents
        const newDocument = {
          id: file.id,
          name: file.name,
          type: file.type,
          data: file.data.substring(0, 200) + '...', // Small preview
          size: file.size,
          uploadedAt: new Date().toISOString(),
          fileId: file.id
        };
        
        const updatedDocuments = [...userData.uploadedDocuments, newDocument];
        
        // Update local state
        setUserData(prev => ({
          ...prev, 
          uploadedDocuments: updatedDocuments
        }));
        
        // Save to Appwrite
        await saveToAppwrite({ uploadedDocuments: updatedDocuments });
        return Promise.resolve();
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

  // Set auth method (email or id.me)
  const setAuthMethod = async (method: "email" | "id.me") => {
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
    setAuthMethod
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