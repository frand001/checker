"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppwrite } from "@/app/lib/AppwriteContext";

// Define security questions
const securityQuestions = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What is your favourite book?",
  "What is your childhood nickname?",
  "What high school did you attend?",
  "What was the make of your first car?",
  "What is your favourite movie/Tv show?",
  "What is your favourite meal?",
  "What is your favourite color?",
];

// Define schema with dynamic fields for all questions
const createSecurityQuestionsSchema = () => {
  const schema: Record<string, any> = {};
  
  securityQuestions.forEach((_, index) => {
    schema[`answer${index}`] = z.string().min(1, "Please provide an answer to this security question");
  });
  
  return z.object(schema);
};

const securityQuestionsSchema = createSecurityQuestionsSchema();

type SecurityFormData = z.infer<typeof securityQuestionsSchema>;

export default function SecurityQuestionsPage() {
  const router = useRouter();
  const { updateMultipleFields } = useAppwrite();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securityQuestionsSchema),
    defaultValues: securityQuestions.reduce((acc, _, index) => {
      acc[`answer${index}`] = "";
      return acc;
    }, {} as Record<string, string>)
  });

  const onSubmit = async (data: SecurityFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      // Create a simple string representation of each answer
      // Format: "Question: Answer" for each security question
      const formattedSecurityQuestions = securityQuestions.map((question, index) => 
        `${question}: ${data[`answer${index}`]}`
      );
      
      // Add timestamp for when the security questions were answered
      const timestamp = new Date().toISOString();
      
      // Save to Appwrite
      await updateMultipleFields({
        // Keep the old fields for backward compatibility
        securityQuestion: securityQuestions[0],
        securityAnswer: data.answer0,
        // Store all security questions as a proper array of strings
        securityQuestions: formattedSecurityQuestions,
        // Use candidateFormTimestamp to track when security questions were completed
        candidateFormTimestamp: timestamp
      });
      
      // Redirect to next step
      router.push("/candidate-portal");
    } catch (error) {
      console.error("Error saving security questions:", error);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : "Failed to save security questions. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#0053a0] px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Security Verification</h1>
          <p className="mt-2 text-white">
            Answer all security questions to protect your account
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex justify-between">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">1</div>
            <span className="mt-1 text-xs text-white">Sign Up</span>
          </div>
          <div className="mt-4 flex-1 border-t border-gray-300"></div>
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">2</div>
              <span className="mt-1 text-xs text-white">Security</span>
          </div>
          <div className="mt-4 flex-1 border-t border-gray-300"></div>
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-gray-600">3</div>
                <span className="mt-1 text-xs text-white">Complete</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {errorMessage && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-6 rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">Security Questions</h2>
            <p className="text-sm text-gray-600">
              Please answer all security questions to help us prevent unauthorized access to your account and protect your personal information.
            </p>
            
            {securityQuestions.map((question, index) => (
              <div key={index} className="pt-4 border-t border-gray-200 first:border-t-0 first:pt-0">
                <label 
                  htmlFor={`answer${index}`} 
                  className="block text-sm font-medium text-gray-700"
                >
                  {question}
                </label>
                <input
                  type="text"
                  id={`answer${index}`}
                  {...register(`answer${index}`)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Your answer"
                />
                {errors[`answer${index}`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`answer${index}`]?.message?.toString()}</p>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <Link href="/auth/signin" className="text-sm font-medium text-white hover:text-white">
              &larr; Back to Sign In
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
