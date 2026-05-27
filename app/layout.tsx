import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ChatProvider } from "@/lib/chat-store";

export const metadata: Metadata = {
  title: "Helix",
  description: "Local-first AI operating system.",
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-dvh overflow-hidden font-sans antialiased">
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
