import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aamir Interview Agent",
  description: "Grounded interview answers based on curated profile documents."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
