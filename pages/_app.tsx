import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import { ThemeProvider } from "../context/ThemeContext";
import { apiClient } from "../lib/axios";
import { clientStorage } from "../lib/client-storage";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

function GlobalSyncWatcher() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) return;

    let isMounted = true;
    const sync = async () => {
      try {
        const res = await apiClient.get("/sync");
        if (res.data && isMounted) {
          const prevProjCount = clientStorage.getDeletedProjectIds().length;
          const prevUserCount = clientStorage.getDeletedUserIds().length;
          const prevTaskCount = clientStorage.getDeletedTaskIds().length;

          clientStorage.syncDeleted(res.data);

          const newProjCount = clientStorage.getDeletedProjectIds().length;
          const newUserCount = clientStorage.getDeletedUserIds().length;
          const newTaskCount = clientStorage.getDeletedTaskIds().length;

          if (
            newProjCount !== prevProjCount ||
            newUserCount !== prevUserCount ||
            newTaskCount !== prevTaskCount
          ) {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
          }
        }
      } catch (_) {}
    };

    sync();
    const interval = setInterval(sync, 5000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, queryClient]);

  return null;
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <div className={`${inter.variable} font-sans min-h-screen bg-background text-foreground`}>
      <ThemeProvider>
        <SessionProvider session={session}>
          <QueryClientProvider client={queryClient}>
            <GlobalSyncWatcher />
            <Component {...pageProps} />
            <Toaster position="top-center" />
          </QueryClientProvider>
        </SessionProvider>
      </ThemeProvider>
    </div>
  );
}
