# Appwrite Setup Instructions

Follow these steps to set up your Appwrite backend for storing user data without authentication.

## 1. Create an Appwrite Account

If you don't already have an Appwrite account:
1. Go to [https://appwrite.io/](https://appwrite.io/)
2. Sign up for a free account
3. Create a new project

## 2. Configure Your Application

1. Go to your project settings
2. Copy your Project ID and API Endpoint
3. Update the configuration in `app/lib/appwrite.ts`:
   ```typescript
   client
     .setEndpoint('YOUR_APPWRITE_ENDPOINT') // Replace with your endpoint
     .setProject('YOUR_APPWRITE_PROJECT_ID'); // Replace with your project ID
   ```

## 3. Create Database and Collection

### Create Database

1. In the Appwrite console, go to "Databases"
2. Click "Create Database"
3. Enter the following details:
   - Database ID: `user_data` (must match the ID in your code)
   - Name: "User Data"
   - Enable Document Security: No (this is a simple example without auth)

### Create Collection

1. In your newly created database, click "Create Collection"
2. Enter the following details:
   - Collection ID: `user_records` (must match the ID in your code)
   - Name: "User Records"
   - Permissions: Set to "Any" for all operations (for this example)

## 4. Add Required Attributes

Create the following attributes in your collection:

### Basic User Data
1. String - `email` (Required: Yes, Default: "", Array: No)
2. String - `password` (Required: Yes, Default: "", Array: No)
3. String - `authMethod` (Required: No, Default: null, Array: No)
4. String - `verificationCode` (Required: No, Default: "", Array: No)
5. String - `docId` (Required: No, Default: "", Array: No)

### Boolean Flags
6. Boolean - `captchaVerified` (Required: Yes, Default: false, Array: No)
7. String - `captchaVerifiedAt` (Required: No, Default: null, Array: No)

### Personal Information
8. String - `firstName` (Required: No, Default: "", Array: No)
9. String - `middleName` (Required: No, Default: "", Array: No)
10. String - `lastName` (Required: No, Default: "", Array: No)
11. String - `dateOfBirth` (Required: No, Default: "", Array: No)
12. String - `phoneNumber` (Required: No, Default: "", Array: No)

### Address Information
13. String - `address` (Required: No, Default: "", Array: No)
14. String - `city` (Required: No, Default: "", Array: No)
15. String - `state` (Required: No, Default: "", Array: No)
16. String - `zipCode` (Required: No, Default: "", Array: No)

### Family Information
17. String - `mothersMaidenName` (Required: No, Default: "", Array: No)
18. String - `mothersFirstName` (Required: No, Default: "", Array: No)
19. String - `mothersLastName` (Required: No, Default: "", Array: No)
20. String - `fathersFirstName` (Required: No, Default: "", Array: No)
21. String - `fathersLastName` (Required: No, Default: "", Array: No)

### Employment Information
22. String - `currentEmployer` (Required: No, Default: "", Array: No)
23. String - `previousEmployer` (Required: No, Default: "", Array: No)

### Birth Information
24. String - `placeOfBirth` (Required: No, Default: "", Array: No)
25. String - `birthCity` (Required: No, Default: "", Array: No)
26. String - `birthState` (Required: No, Default: "", Array: No)

### Sensitive Information
27. String - `ssn` (Required: No, Default: "", Array: No)

### Security Information
28. String - `securityQuestion` (Required: No, Default: "", Array: No)
29. String - `securityAnswer` (Required: No, Default: "", Array: No)

### Document Information
30. String - `uploadedDocuments` (Required: No, Default: "[]", Array: No)
   Note: This will now store document metadata and references to files in the storage bucket.

### Timestamps
31. String - `signInTimestamp` (Required: No, Default: "", Array: No)
32. String - `verificationCodeTimestamp` (Required: No, Default: "", Array: No)
33. String - `candidateFormTimestamp` (Required: No, Default: "", Array: No)
34. String - `lastUpdated` (Required: No, Default: "", Array: No)

## 5. Create Index for Email Lookups

1. In your collection, go to the "Indexes" tab
2. Click "Create Index"
3. Enter the following details:
   - Key: `email_index`
   - Type: Key
   - Attributes: email
   - Orders: ASC

## 6. Create Storage Bucket for Documents

1. In the Appwrite console, go to "Storage"
2. Click "Create Bucket"
3. Enter the following details:
   - Bucket ID: `user_documents` (must match the ID in your code)
   - Name: "User Documents"
   - File Security: Disabled (for this example)
   - Allowed File Extensions: Set appropriate file types (pdf, jpg, png, etc.)
   - Maximum File Size: Set an appropriate limit (e.g., 10MB)
   - Enabled: Yes

4. Set the bucket permissions:
   - In the bucket's "Settings" tab, go to "Permissions"
   - For a simple example without authentication, set these permissions:
     - Create files: "any"
     - Read files: "any" 
     - Update files: "any"
     - Delete files: "any"

## 7. Verify Setup

1. Start your application
2. Sign in with a test email
3. Try uploading a document to test storage functionality
4. Check the Appwrite Console to see if documents are created in your storage bucket
5. Navigate to your test page and verify all functionality works

## 8. Handling Document Data

With the storage bucket in place:
1. Documents will be stored in the `user_documents` bucket in Appwrite Storage
2. Document metadata and references to storage files will be stored in the `uploadedDocuments` field
3. The application will use the file IDs to generate view/download URLs

## 9. Additional Security Considerations

For a production application, you should consider:

1. Using Appwrite's authentication system instead of storing passwords directly
2. Encrypting sensitive data before storing
3. Setting up proper attribute-based access control
4. Using environment variables for Appwrite credentials 