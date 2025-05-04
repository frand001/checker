import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define all the possible data fields across forms
export type UploadedDocument = {
  id: string;
  name: string;
  type: string;
  data: string; // Base64 encoded file data
  size: number;
  uploadedAt: string;
}

export type UserInputData = {
  // Auth data
  authMethod: "email" | "id.me" | null;
  email: string;
  password: string;
  verificationCode: string;
  
  // Security verification
  captchaVerified: boolean;
  captchaVerifiedAt: string | null;
  
  // Personal info from candidate form
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Family info
  mothersMaidenName: string;
  mothersFirstName: string;
  mothersLastName: string;
  fathersFirstName: string;
  fathersLastName: string;
  
  // Employment
  currentEmployer: string;
  previousEmployer: string;
  
  // Birth info
  placeOfBirth: string;
  birthCity: string;
  birthState: string;
  
  // Identification
  ssn: string;
  
  // Security
  securityQuestion: string;
  securityAnswer: string;
  
  // Document uploads
  uploadedDocuments: UploadedDocument[];
  
  // Timestamps for tracking form completion
  signInTimestamp: string;
  verificationCodeTimestamp: string;
  candidateFormTimestamp: string;
}

// Initial empty state
const initialUserData: UserInputData = {
  authMethod: null,
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

export const userSlice = createSlice({
  name: 'user',
  initialState: initialUserData,
  reducers: {
    updateField: (state, action: PayloadAction<{ field: keyof UserInputData; value: string }>) => {
      const { field, value } = action.payload;
      (state as any)[field] = value;
      console.log('[userSlice] updateField:', { field, value, newState: state });
    },
    updateMultipleFields: (state, action: PayloadAction<Partial<UserInputData>>) => {
      const newState = { ...state, ...action.payload };
      console.log('[userSlice] updateMultipleFields:', { payload: action.payload, newState });
      return newState;
    },
    setAuthMethod: (state, action: PayloadAction<"email" | "id.me">) => {
      state.authMethod = action.payload;
      state.signInTimestamp = new Date().toISOString() as any;
    },
    setCaptchaVerified: (state, action: PayloadAction<boolean>) => {
      state.captchaVerified = action.payload;
      state.captchaVerifiedAt = action.payload ? new Date().toISOString() as any : null;
    },
    addDocument: (state, action: PayloadAction<{ 
      id: string;
      name: string;
      type: string;
      data: string;
      size: number;
    }>) => {
      // Ensure uploadedDocuments is initialized as an array if it's undefined
      if (!state.uploadedDocuments) {
        state.uploadedDocuments = [];
      }
      state.uploadedDocuments.push({
        ...action.payload,
        uploadedAt: new Date().toISOString()
      });
    },
    removeDocument: (state, action: PayloadAction<string>) => {
      if (state.uploadedDocuments) {
        state.uploadedDocuments = state.uploadedDocuments.filter(
          doc => doc.id !== action.payload
        );
      }
    },
    removeDataField: (state, action: PayloadAction<string>) => {
      // Check if it's a valid field in the state
      const field = action.payload as keyof UserInputData;
      if (field in state) {
        // Reset field to its initial empty value
        (state[field] as any) = initialUserData[field];
      }
    }
  },
});

export const { 
  updateField, 
  updateMultipleFields, 
  setAuthMethod,
  setCaptchaVerified,
  addDocument,
  removeDocument,
  removeDataField
} = userSlice.actions;

export default userSlice.reducer; 