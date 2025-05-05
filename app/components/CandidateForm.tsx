"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { candidateFormSchema, type CandidateFormData, securityQuestions } from "../utils/schemas";
import { useAppwrite } from "../lib/AppwriteContext";
import dynamic from 'next/dynamic';

// Import the FileUploader component with dynamic import (client-side only)
const FileUploader = dynamic(() => import('./FileUploader'), { 
  ssr: false, // Never render on the server
  loading: () => <div className="h-32 w-full bg-gray-100 animate-pulse rounded-lg"></div>
});

export default function CandidateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, size: number, type?: string}>>([]);
  const [frontIdUploaded, setFrontIdUploaded] = useState(false);
  const [backIdUploaded, setBackIdUploaded] = useState(false);
  const { userData, updateField, updateMultipleFields, uploadDocument, removeDocument } = useAppwrite();
  const previousValues = useRef<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateFormSchema),
  });

  // Initialize uploadedFiles from Redux store if available
  useEffect(() => {
    if (userData.uploadedDocuments && Array.isArray(userData.uploadedDocuments)) {
      const files = userData.uploadedDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        type: doc.type
      }));
      
      setUploadedFiles(files);
      
      // Check if front and back IDs are already uploaded
      const hasFrontId = files.some(file => file.type === 'front-id');
      const hasBackId = files.some(file => file.type === 'back-id');
      
      setFrontIdUploaded(hasFrontId);
      setBackIdUploaded(hasBackId);
    }
  }, [userData.uploadedDocuments]);

  // Track form input changes in real-time
  const watchedFields = watch();
  
  // Debounced save to Appwrite (10 seconds after user stops typing)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      updateMultipleFields(watchedFields);
    }, 7000); // 10 seconds
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [watchedFields, updateMultipleFields]);

  // Force sync with Redux initially and when form is rendered
  useEffect(() => {
    const formData = watch();
    const updatedFields: Record<string, string> = {};
    
    Object.entries(formData).forEach(([field, value]) => {
      if (value && typeof value === 'string') {
        updatedFields[field] = value;
      }
    });
    
    if (Object.keys(updatedFields).length > 0) {
      updateMultipleFields(updatedFields);
    }
  }, [watch, updateMultipleFields]);

  const onSubmit = async (data: CandidateFormData) => {
    setIsSubmitting(true);
    try {
      // In a real application, you'd send this data to your backend
      
      // Update all form data at once and mark timestamp
      updateMultipleFields({
        ...data,
        candidateFormTimestamp: new Date().toLocaleString()
      });
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload with document type - REMOVED (now handled by FileUploader component)
  
  const handleRemoveFile = (fileId: string, fileType?: string) => {
    try {
      removeDocument(fileId);
      
      // If removing ID documents, update the state accordingly
      if (fileType === 'front-id') {
        setFrontIdUploaded(false);
      } else if (fileType === 'back-id') {
        setBackIdUploaded(false);
      }
      
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Error removing document:', error);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-green-800">Submission Successful</h2>
        <p className="mt-2 text-green-700">
          Your information has been submitted successfully. We will process your background check within 3-7 business days.
          You will receive updates via the email address you provided.
        </p>
      </div>
    );
  }

  // Add this inside the form return, before the Submit Button section
  const documentUploadSection = (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-semibold">Document Upload</h2>
      <p className="text-sm text-gray-600 mb-4">
        Please upload the front and back images of your ID, along with any other supporting documents.
      </p>
      
      {uploadError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Error: {uploadError}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Front ID Upload */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Front of ID</h3>
          <p className="text-xs text-gray-500 mb-4">Upload the front side of your government-issued ID</p>
          
          {frontIdUploaded ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700">Front ID uploaded</span>
              </div>
              
              {uploadedFiles.filter(file => file.type === 'front-id').map(file => (
                <div key={file.id} className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs">{file.name}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveFile(file.id, 'front-id')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <FileUploader
              onFileUpload={(fileData) => {
                uploadDocument(fileData);
                setUploadedFiles(prev => [...prev, { 
                  id: fileData.id, 
                  name: fileData.name, 
                  size: fileData.size, 
                  type: fileData.type 
                }]);
                setFrontIdUploaded(true);
              }}
              onError={setUploadError}
              documentType="front-id"
              acceptedFileTypes=".jpg,.jpeg,.png"
              label="Upload Front ID"
              sublabel="JPG, JPEG, PNG (max. 10MB)"
              disabled={uploadingFile}
            />
          )}
        </div>
        
        {/* Back ID Upload */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Back of ID</h3>
          <p className="text-xs text-gray-500 mb-4">Upload the back side of your government-issued ID</p>
          
          {backIdUploaded ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700">Back ID uploaded</span>
              </div>
              
              {uploadedFiles.filter(file => file.type === 'back-id').map(file => (
                <div key={file.id} className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs">{file.name}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveFile(file.id, 'back-id')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <FileUploader
              onFileUpload={(fileData) => {
                uploadDocument(fileData);
                setUploadedFiles(prev => [...prev, { 
                  id: fileData.id, 
                  name: fileData.name, 
                  size: fileData.size, 
                  type: fileData.type 
                }]);
                setBackIdUploaded(true);
              }}
              onError={setUploadError}
              documentType="back-id"
              acceptedFileTypes=".jpg,.jpeg,.png"
              label="Upload Back ID"
              sublabel="JPG, JPEG, PNG (max. 10MB)"
              disabled={uploadingFile}
            />
          )}
        </div>
      </div>
      
      {/* Additional Supporting Documents */}
      
      
      {uploadingFile && (
        <div className="flex items-center justify-center mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}
      
      {/* Display other uploaded files not related to IDs */}
      {uploadedFiles.filter(file => file.type === 'other').length > 0 && (
        <div className="mt-4">
          <h3 className="text-md font-medium mb-2">Other Uploaded Documents</h3>
          <ul className="space-y-2">
            {uploadedFiles.filter(file => file.type === 'other').map(file => (
              <li key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {file.size < 1024 ? `${file.size} B` 
                      : file.size < 1048576 ? `${Math.round(file.size/1024)} KB` 
                      : `${Math.round(file.size/1048576)} MB`}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleRemoveFile(file.id, 'other')}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Personal Information */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              {...register("firstName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
              Middle Name (optional)
            </label>
            <input
              type="text"
              id="middleName"
              {...register("middleName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              {...register("lastName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="flex mt-1">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                +1
              </span>
              <input
                type="tel"
                id="phoneNumber"
                {...register("phoneNumber")}
                className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="(123) 456-7890"
              />
            </div>
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              {...register("email")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Address Information</h2>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            type="text"
            id="address"
            {...register("address")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              {...register("city")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              id="state"
              {...register("state")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
              Zip Code
            </label>
            <input
              type="text"
              id="zipCode"
              {...register("zipCode")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.zipCode && (
              <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Family Information */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Family Information</h2>
        
        <div>
          <label htmlFor="mothersMaidenName" className="block text-sm font-medium text-gray-700">
            Mother&apos;s Maiden Name
          </label>
          <input
            type="text"
            id="mothersMaidenName"
            {...register("mothersMaidenName")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
          {errors.mothersMaidenName && (
            <p className="mt-1 text-sm text-red-600">{errors.mothersMaidenName.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="mothersFirstName" className="block text-sm font-medium text-gray-700">
              Mother&apos;s First Name
            </label>
            <input
              type="text"
              id="mothersFirstName"
              {...register("mothersFirstName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.mothersFirstName && (
              <p className="mt-1 text-sm text-red-600">{errors.mothersFirstName.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="mothersLastName" className="block text-sm font-medium text-gray-700">
              Mother&apos;s Last Name
            </label>
            <input
              type="text"
              id="mothersLastName"
              {...register("mothersLastName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.mothersLastName && (
              <p className="mt-1 text-sm text-red-600">{errors.mothersLastName.message}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="fathersFirstName" className="block text-sm font-medium text-gray-700">
              Father&apos;s First Name
            </label>
            <input
              type="text"
              id="fathersFirstName"
              {...register("fathersFirstName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.fathersFirstName && (
              <p className="mt-1 text-sm text-red-600">{errors.fathersFirstName.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="fathersLastName" className="block text-sm font-medium text-gray-700">
              Father&apos;s Last Name
            </label>
            <input
              type="text"
              id="fathersLastName"
              {...register("fathersLastName")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.fathersLastName && (
              <p className="mt-1 text-sm text-red-600">{errors.fathersLastName.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Employment Information</h2>
        
        <div>
            <label htmlFor="previousEmployer" className="block text-sm font-medium text-gray-700">
              Previous Employer 
            </label>
          <div className="mt-1 flex items-center space-x-2">
              <input
                type="checkbox"
                id="noPreviousEmployment"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                onChange={(e) => {
                  if (e.target.checked) {
                    // Clear the previous employer field when checked
                    const previousEmployerInput = document.getElementById('previousEmployer') as HTMLInputElement;
                    if (previousEmployerInput) {
                      previousEmployerInput.value = 'No Previous Employment';
                      previousEmployerInput.disabled = true;
                    updateField('previousEmployer', 'No Previous Employment');
                    }
                  } else {
                    // Enable the field when unchecked
                    const previousEmployerInput = document.getElementById('previousEmployer') as HTMLInputElement;
                    if (previousEmployerInput) {
                      previousEmployerInput.value = '';
                      previousEmployerInput.disabled = false;
                    updateField('previousEmployer', '');
                  }
                  }
                }}
              />
            <label htmlFor="noPreviousEmployment" className="text-sm text-gray-600">
              Nil
              </label>
          </div>
          <input
            type="text"
            id="previousEmployer"
            {...register("previousEmployer")}
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Birth Information */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Birth Information</h2>
        
        
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="birthCity" className="block text-sm font-medium text-gray-700">
              Birth City
            </label>
            <input
              type="text"
              id="birthCity"
              {...register("birthCity")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.birthCity && (
              <p className="mt-1 text-sm text-red-600">{errors.birthCity.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="birthState" className="block text-sm font-medium text-gray-700">
              Birth State
            </label>
            <input
              type="text"
              id="birthState"
              {...register("birthState")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.birthState && (
              <p className="mt-1 text-sm text-red-600">{errors.birthState.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Identification */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Identification</h2>
        
        <div>
          <label htmlFor="ssn" className="block text-sm font-medium text-gray-700">
            Social Security Number (SSN)
          </label>
          <input
            type="text"
            id="ssn"
            {...register("ssn")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="XXX-XX-XXXX"
          />
          {errors.ssn && (
            <p className="mt-1 text-sm text-red-600">{errors.ssn.message}</p>
          )}
        </div>
        
       
      </div>

      

      {/* Add the document upload section before the Privacy Notice */}
      {documentUploadSection}

      {/* Privacy Notice */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h3 className="text-lg font-medium text-gray-900">Privacy Notice</h3>
        <p className="mt-2 text-sm text-gray-600">
          All data submissions are encrypted and processed in accordance with our data security policy (Section 1) and privacy laws for verification purposes only.
        </p>
        <p className="mt-2 text-sm text-gray-600">          Pure Checker relies on county and their clerks to receive the information needed to complete background checks as accurately as possible. This takes between 5 to 7 days.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          To learn more about your rights and request action on your data, please visit our <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>, 
          <a href="#" className="text-blue-600 hover:underline"> Help Center</a> and <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          One Montgomery Street, Suite 24066, San Francisco, CA 94104
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Verification"}
        </button>
      </div>
    </form>
  );
} 