"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setCaptchaVerified } from "@/app/store/userSlice";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function CaptchaVerification() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const captchaVerified = useAppSelector(state => state.user.captchaVerified);

  const [verificationComplete, setVerificationComplete] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [totalWaitTime, setTotalWaitTime] = useState(0);
  const [verificationStep, setVerificationStep] = useState(1);
  const [isChecked, setIsChecked] = useState(false);

  // Initialize the verification process
  useEffect(() => {
    // Set a random wait time between 30-60 seconds
    const waitTime = Math.floor(Math.random() * 31) + 30; // 30-60 seconds
    setTotalWaitTime(waitTime);
    setSecondsRemaining(waitTime);
    
    // If user is already verified, redirect to candidate portal
    if (captchaVerified) {
      router.push("/auth/verification-code");

    }
  }, [captchaVerified, router]);
  
  // Countdown timer
  useEffect(() => {
    if (secondsRemaining > 0 && verificationStep === 2) {
      const timer = setTimeout(() => {
        setSecondsRemaining(secondsRemaining - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (secondsRemaining === 0 && verificationStep === 2) {
      setVerificationComplete(true);
      // Update Redux store
      dispatch(setCaptchaVerified(true));
    }
  }, [secondsRemaining, verificationStep, dispatch]);
  
  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Handle checkbox change
  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };
  
  // Verify the checkbox was checked
  const verifyHuman = () => {
    if (isChecked) {
      setVerificationStep(2); // Move to waiting step
    } else {
      alert("Please check the box to verify you are not a robot.");
    }
  };
  
  // Proceed to the candidate portal
  const proceedToPortal = () => {
    router.push("/auth/verification-code");
  };
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-800">Security Verification</h1>
          <p className="mt-3 text-gray-600">
            Please complete the verification process to continue
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-8 shadow-md">
          {verificationStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="rounded-full bg-blue-100 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-center text-2xl font-medium text-gray-900">Security Check</h2>
              
              <div className="border border-gray-200 rounded-md p-6 flex flex-col items-center">
                <div className="flex items-center mb-6">
                  <div className="mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-lg font-medium">reCAPTCHA</span>
                </div>
                
                <div className="border border-gray-300 rounded-md p-4 mb-4 w-full">
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-gray-700">I'm not a robot</span>
                    </label>
                    
                    <div className="ml-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 64 64">
                        <path d="M58.7 45.2l-2.5-1.4a22.8 22.8 0 0 0 1.6-8.5v-1.5l-2.8-.2c-7.2-.4-13.4-4.4-16.8-10.2l-1.3-2.3-1.5 2.1A17.1 17.1 0 0 1 23 31.1l-1.8.2.5 1.7c.9 2.6 2 5 3.3 7l-.7.6a10 10 0 0 0-1.7 2l-1.1 1.7 1.9.6a25.5 25.5 0 0 0 16.9 1L45 49a9.6 9.6 0 0 1-4.7 1.2 10 10 0 0 1-9.8-8.5 10 10 0 0 1 4.1-9.8c2.5-1.9 5.7-2.4 8.6-1.4 3 1 5 3.2 6 6.1a12.2 12.2 0 0 1 .4 5.3c0 .2 0 .4-.2.5l-.5.2h-5.5a1.7 1.7 0 0 0-1.2.5c-.3.3-.5.7-.4 1.2 0 .5.2.9.5 1.2.3.3.7.5 1.1.5h13.3c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2v-.5a16.5 16.5 0 0 0-1.2-9.1 12.7 12.7 0 0 0-7.3-7.1 13.2 13.2 0 0 0-10.6.4c-3.3 1.5-5.9 4.1-7.3 7.5a17.5 17.5 0 0 0 .8 16 14.5 14.5 0 0 0 8.5 6.8c5.8 1.6 12.2.3 16.8-3.4l2.1 1.2a3.3 3.3 0 0 0 4.5-1.2c1-1.8.3-4-1.5-5z" fill="#4689f2"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-gray-500">Privacy - Terms</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={verifyHuman}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-center font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Verify
              </button>
            </div>
          )}
          
          {verificationStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="rounded-full bg-blue-100 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-center text-2xl font-medium text-gray-900">Verification in Progress</h2>
              
              <div className="mb-4 rounded-md bg-blue-50 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      For your security, we need to verify your identity. Please wait while we process your verification.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                
                
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" color="blue" text="Verifying identity..." />
                </div>
              </div>
              
              {verificationComplete && (
                <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                  <div className="flex items-center">
                    <svg className="mr-2 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>Verification complete! You can now proceed.</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={proceedToPortal}
                disabled={!verificationComplete}
                className={`w-full rounded-md px-4 py-3 text-center font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  verificationComplete 
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                    : 'cursor-not-allowed bg-gray-400'
                }`}
              >
                {verificationComplete ? "Continue to Portal" : "Please Wait..."}
              </button>
            </div>
          )}
          
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secured with advanced verification technology</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 