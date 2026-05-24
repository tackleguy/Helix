import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ChatProvider } from "@/lib/chat-store";

export const metadata: Metadata = {
  title: "Helix",
  description: "Local-first AI workspace.",
};

export const viewport: Viewport = {
  themeColor: "#0d0f14",
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
