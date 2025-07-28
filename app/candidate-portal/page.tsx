"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppwrite } from "../lib/AppwriteContext";

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
  const { userData } = useAppwrite();
  const captchaVerified = userData.captchaVerified;
  
  

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0053a0] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to the Candidate Portal</h1>
          <p className="mt-3 text-white">
            Use this portal to check, validate, and get a copy of your background check.
            Enter your information below, ensuring it matches the details on your valid
            identity card and other information with MyGov.
          </p>
        </div>

        <CandidateForm />
      </div>
    </div>
  );
} 