import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Replex — turn a URL into a demo reel",
  description: "Paste a website link, get back mobile and desktop walkthrough videos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}