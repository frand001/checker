import { z } from "zod";

// List of security questions
export const securityQuestions = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What high school did you attend?",
  "What was the make of your first car?",
  "What is your favorite movie?",
  "What is your favorite food?",
  "Where did you meet your spouse/significant other?",
];

// US phone number regex pattern (accepts formats like: (123) 456-7890, 123-456-7890, 1234567890)
const usPhoneRegex = /^(\(\d{3}\)|\d{3})[ -]?\d{3}[ -]?\d{4}$/;

// Schema for the candidate form
export const candidateFormSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string()
    .min(10, "Phone number must have at least 10 digits")
    .regex(usPhoneRegex, "Please enter a valid US phone number, e.g. (123) 456-7890"),
  email: z.string().email("Please enter a valid email address"),
  
  // Address
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
  
  // Family Information
  mothersMaidenName: z.string().min(1, "Mother's maiden name is required"),
  mothersFirstName: z.string().min(1, "Mother's first name is required"),
  mothersLastName: z.string().min(1, "Mother's last name is required"),
  fathersFirstName: z.string().min(1, "Father's first name is required"),
  fathersLastName: z.string().min(1, "Father's last name is required"),
  
  // Employment Information
  currentEmployer: z.string().min(1, "Current employer is required"),
  previousEmployer: z.string().optional(),
  
  // Birth Information
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  birthCity: z.string().min(1, "Birth city is required"),
  birthState: z.string().min(1, "Birth state is required"),
  
  // Identification
  ssn: z.string().min(9, "SSN must be 9 digits").max(11, "SSN cannot exceed 11 characters"),
  frontIdImage: z.instanceof(FileList).refine(fileList => fileList.length > 0, "Front ID image is required"),
  backIdImage: z.instanceof(FileList).refine(fileList => fileList.length > 0, "Back ID image is required"),
  
  // Security Questions
  securityQuestion: z.string().min(1, "Security question is required"),
  securityAnswer: z.string().min(1, "Security answer is required"),
});

export type CandidateFormData = z.infer<typeof candidateFormSchema>; 