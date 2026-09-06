import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import { ThemeProvider } from "../context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <div className={`${inter.variable} font-sans min-h-screen bg-background text-foreground`}>
      <ThemeProvider>
        <SessionProvider session={session}>
          <QueryClientProvider client={queryClient}>
            <Component {...pageProps} />
            <Toaster position="top-center" />
          </QueryClientProvider>
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}
