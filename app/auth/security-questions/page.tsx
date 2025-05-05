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
  "What is your mother's maiden name?",
  "What high school did you attend?",
  "What was the make of your first car?",
  "What is your favorite movie?",
  "What is the name of your favorite childhood teacher?",
  "What was your childhood nickname?"
];

// Define schema
const securityQuestionSchema = z.object({
  securityQuestion: z.string().min(1, "Please select a security question"),
  securityAnswer: z.string().min(1, "Please provide an answer to your security question")
});

type SecurityFormData = z.infer<typeof securityQuestionSchema>;

export default function SecurityQuestionsPage() {
  const router = useRouter();
  const { updateMultipleFields } = useAppwrite();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securityQuestionSchema),
    defaultValues: {
      securityQuestion: securityQuestions[0],
      securityAnswer: ""
    }
  });

  const onSubmit = async (data: SecurityFormData) => {
    setIsSubmitting(true);
    
    try {
      // Add timestamp for when the security question was answered
      const timestamp = new Date().toISOString();
      
      // Save to Redux store using properties that exist in UserInputData type
      updateMultipleFields({
        securityQuestion: data.securityQuestion,
        securityAnswer: data.securityAnswer,
        // Use candidateFormTimestamp to track when security questions were completed
        candidateFormTimestamp: timestamp,
      });
      
      // Redirect to the next page or dashboard
      router.push("/candidate-portal");
    } catch (error) {
      console.error("Error saving security question:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#0053a0] px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Security Verification</h1>
          <p className="mt-2 text-white">
            Set up your security question to protect your account
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
          <div className="space-y-6 rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">Security Question</h2>
            <p className="text-sm text-gray-600">
              Security questions help us prevent unauthorized access to your account and protect your personal information.
            </p>
            
            <div>
  <label htmlFor="securityQuestion" className="block text-sm font-medium text-gray-700">
    Select a Security Question
  </label>
  <select
    id="securityQuestion"
    defaultValue={securityQuestions[0]} // set first question as default
    {...register("securityQuestion")}
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
  >
    {securityQuestions.map((question, index) => (
      <option key={index} value={question}>
        {question}
      </option>
    ))}
  </select>
</div>

            
            <div>
              <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
                Your Answer
              </label>
              <input
                type="text"
                id="securityAnswer"
                {...register("securityAnswer")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              {errors.securityAnswer && (
                <p className="mt-1 text-sm text-red-600">{errors.securityAnswer.message}</p>
              )}
            </div>
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
