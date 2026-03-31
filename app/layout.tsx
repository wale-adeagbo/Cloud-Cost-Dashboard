import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud cost dashboard",
  description: "AWS / Azure spend and GCP idle hints",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
