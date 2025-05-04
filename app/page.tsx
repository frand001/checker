import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gray-50 px-4 py-12 pt-8">
      <main className="max-w-4xl text-center">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold">Background Check Verification Portal</h1>
          <p className="text-xl text-gray-600">
            SECURE, RELIABLE BACKGROUND VERIFICATION FOR EMPLOYMENT AND IDENTITY VALIDATION
          </p>
        </div>

        <div className="mb-12 rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-2xl font-semibold">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">1</div>
              <h3 className="mb-2 text-lg font-medium">Sign In</h3>
              <p className="text-gray-600">Sign in to access your verification portal</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">2</div>
              <h3 className="mb-2 text-lg font-medium">Submit Information</h3>
              <p className="text-gray-600">Provide your personal details for background verification</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">3</div>
              <h3 className="mb-2 text-lg font-medium">Get Results</h3>
              <p className="text-gray-600">Receive your verified background check within 5-7 business days</p>
            </div>
          </div>
        </div>

        <div className="mb-12 space-y-4">
          <Link 
            href="/auth/signin" 
            className="inline-block rounded-md bg-blue-600 px-6 py-3 text-lg font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In To Your Account
          </Link>
          
          {/* <p className="text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p> */}
        </div>

        <div className="rounded-lg bg-gray-100 p-6 text-left">
          <h3 className="mb-2 text-lg font-medium">Privacy and Security</h3>
          <p className="text-gray-600">
            Your data is secure with us. All submissions are encrypted and processed in accordance 
            with our data security policy and applicable privacy laws. We only use your information 
            for verification purposes.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            One Montgomery Street, Suite 24066, San Francisco, CA 94104
          </p>
        </div>
      </main>
    </div>
  );
}
