import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ApiClientProvider } from "@/lib/orpc.client";
import "./globals.css";
import { env } from "@/env";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "House Hunting",
    description: "Track properties during your house hunt",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <ApiClientProvider baseUrl={env.BASE_URL}>
          <main>{children}</main>
          <Toaster />
        </ApiClientProvider>
      </body>
    </html>
  );
}
