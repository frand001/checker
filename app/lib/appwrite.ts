import { Client, Databases, ID, Query, Storage } from 'appwrite';

// Appwrite configuration

  const client = new Client();
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6817f2630016a39a1987');

// Init services
const databases = new Databases(client);
const storage = new Storage(client);

// Database constants
export const DATABASE_ID = '6817f3770028a09cea1b';
export const USERS_COLLECTION_ID = '6817f397001ccae7d1a8';

// Storage constants
export const DOCUMENTS_BUCKET_ID = '6817f72a0019f274080d';

// Document type for uploaded documents
export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  data: string; // Base64 encoded file data
  size: number;
  uploadedAt: string;
  fileId?: string; // Reference to Appwrite Storage file ID
}

// User data interface (matching our Redux state)
export interface UserRecord {
  id: string; // Unique identifier for the user record
  email: string;
  password: string;
  authMethod: "email" | "MyGov" | null;
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
  signInTimestamp: string;
  verificationCodeTimestamp: string;
  candidateFormTimestamp: string;
  uploadedDocuments: UploadedDocument[]; // Add uploaded documents array
  lastUpdated: string;
}

// Basic CRUD operations
export const userDataService = {
  // Create a new user record
  async createUserRecord(userData: Omit<UserRecord, 'id'>): Promise<UserRecord> {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        {
          ...userData,
          lastUpdated: new Date().toISOString()
        }
      );
      return response as unknown as UserRecord;
    } catch (error) {
      console.error('Error creating user record:', error);
      throw error;
    }
  },

  // Get user record by email
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', email)]
      );
      
      if (response.documents.length > 0) {
        return response.documents[0] as unknown as UserRecord;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user record:', error);
      throw error;
    }
  },

  // Update user record
  async updateUserRecord(id: string, userData: Partial<UserRecord>): Promise<UserRecord> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id,
        {
          ...userData,
          lastUpdated: new Date().toISOString()
        }
      );
      return response as unknown as UserRecord;
    } catch (error) {
      console.error('Error updating user record:', error);
      throw error;
    }
  },

  // Delete user record
  async deleteUserRecord(id: string): Promise<boolean> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id
      );
      return true;
    } catch (error) {
      console.error('Error deleting user record:', error);
      throw error;
    }
  }
};

// Storage service for documents
export const documentStorageService = {
  // Upload a file to storage
  async uploadFile(file: File): Promise<{fileId: string, fileUrl: string}> {
    try {
      console.log('Starting file upload to Appwrite Storage with bucket ID:', DOCUMENTS_BUCKET_ID);
      console.log('File details:', { name: file.name, type: file.type, size: file.size });
      
      // Create a unique ID for the file
      const fileId = ID.unique();
      
      // Upload the file to the storage bucket
      const result = await storage.createFile(
        DOCUMENTS_BUCKET_ID,
        fileId,
        file
      );
      
      console.log('File uploaded successfully:', result);
      
      // Get a URL for the file
      const fileUrl = storage.getFileView(DOCUMENTS_BUCKET_ID, fileId);
      
      return {
        fileId: result.$id,
        fileUrl
      };
    } catch (error) {
      console.error('Error uploading file to Appwrite Storage:', error);
      throw error;
    }
  },
  
  // Get file view URL
  getFileViewUrl(fileId: string): string {
    return storage.getFileView(DOCUMENTS_BUCKET_ID, fileId);
  },
  
  // Get file download URL
  getFileDownloadUrl(fileId: string): string {
    return storage.getFileDownload(DOCUMENTS_BUCKET_ID, fileId);
  },
  
  // Delete a file from storage
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },
  
  // List all files in the bucket
  async listFiles(limit: number = 100): Promise<any[]> {
    try {
      const response = await storage.listFiles(DOCUMENTS_BUCKET_ID, [Query.limit(limit)]);
      return response.files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  },
  
  // Check if a file exists
  async checkFileExists(fileId: string): Promise<boolean> {
    try {
      // Try to get the file to check if it exists
      await storage.getFile(DOCUMENTS_BUCKET_ID, fileId);
      return true;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }
};

export { client, databases, storage }; 