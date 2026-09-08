import "@/styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "../context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function App({
	Component,
	pageProps: { session, ...pageProps },
}: AppProps) {
	const [queryClient] = useState(() => new QueryClient());

	useEffect(() => {
		if (typeof window !== "undefined") {
			try {
				localStorage.clear();
			} catch (_) {}

			// Keep-alive heartbeat: ping /api/health every 4 minutes to prevent Render free-tier from sleeping
			const interval = setInterval(() => {
				fetch("/api/health").catch(() => {});
			}, 4 * 60 * 1000);

			return () => clearInterval(interval);
		}
	}, []);

	return (
		<div
			className={`${inter.variable} font-sans min-h-screen bg-background text-foreground`}
		>
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
