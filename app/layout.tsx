import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppwriteProvider } from "./lib/AppwriteContext";
import Navbar from "./components/Navbar";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Security Verification Portal",
  description: "Verify your Social Security benefits and information with secure access.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppwriteProvider>
          <Navbar />
          {children}
        </AppwriteProvider>
      </body>
    </html>
  );
}
