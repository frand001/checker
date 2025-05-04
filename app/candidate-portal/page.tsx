"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppSelector } from "../store/hooks";

// Import CandidateForm with dynamic import to prevent server-side rendering
const CandidateForm = dynamic(() => import("../components/CandidateForm"), {
  ssr: false, // Never render on the server
  loading: () => (
    <div className="animate-pulse p-8 bg-white rounded-lg shadow">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  ),
});

export default function CandidatePortal() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const captchaVerified = useAppSelector(state => state.user.captchaVerified);
  
  // Check if the user has completed CAPTCHA verification
  useEffect(() => {
    if (!captchaVerified) {
      // Redirect to CAPTCHA verification if not completed
      router.push("/auth/captcha-verification");
    } else {
      setCheckingAuth(false);
    }
  }, [captchaVerified, router]);

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome to the Candidate Portal</h1>
          <p className="mt-3 text-gray-600">
            Use this portal to check, validate, and get a copy of your background check.
            Enter your information below, ensuring it matches the details on your valid
            identity card and other information with Social Security Administration.
          </p>
        </div>

        <CandidateForm />
      </div>
    </div>
  );
} 