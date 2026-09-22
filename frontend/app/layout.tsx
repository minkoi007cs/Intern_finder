import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpportunityOS — Find your next step",
  description: "Discover internships, research, and student opportunities with clear, personalized guidance.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
