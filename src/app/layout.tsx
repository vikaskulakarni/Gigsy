import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gigsy — Make your next move matter",
  description: "Discover exceptional freelance talent and meaningful work with Gigsy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Browser extensions such as Dark Reader may inject attributes into <html>
  // before React hydrates. Suppress only extension-induced root attribute diffs.
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
