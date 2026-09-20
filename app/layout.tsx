import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dumbdown — Code, explained clearly",
  description:
    "Turn code and technical documentation into plain-language explanations, examples, and step-by-step walkthroughs. Open source, with MCP and WebMCP support.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
