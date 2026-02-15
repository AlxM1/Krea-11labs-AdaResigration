import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Krya - AI Creative Platform",
  description:
    "Create stunning images, videos, and 3D content with AI. Real-time generation, enhancement, and more.",
  keywords: [
    "AI",
    "image generation",
    "video generation",
    "3D generation",
    "real-time AI",
    "creative tools",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1a1a1a",
                color: "#ffffff",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                fontSize: "14px",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
