import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FeedbackToolbar } from "@/components/dev/feedback-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/stateview/ui";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
 * No title here: each page sets its own. A layout title would be re-applied
 * on every navigation within the viewer, over the state's title that the
 * viewer renders itself (FocusView's <title>).
 */
export const metadata: Metadata = {
  description: "",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
        </TooltipProvider>
        {process.env.NODE_ENV === "development" ? <FeedbackToolbar /> : null}
        <Toaster />
      </body>
    </html>
  );
}
