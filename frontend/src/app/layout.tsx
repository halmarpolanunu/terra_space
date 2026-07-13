import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Space",
  description: "A local-first intelligence workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
