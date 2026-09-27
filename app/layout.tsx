import type { Metadata } from "next";
import "./globals.css";

// JavaScript-safe tokens, not the raw ones: project purpose is free text, so a quote
// or backslash interpolated into a string literal closes it early and the
// provisioned project fails its first build.
const title = "Prep Decision Lab";
const description =
  "Restaurant prep forecasting and Jev decision simulation for ITCHATHON Challenge 4";

function siteUrl(): URL {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (!configured) return new URL("http://localhost:3000");
  try {
    return new URL(configured.includes("://") ? configured : `https://${configured}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: title,
    title,
    description,
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: `${title} — ${description}` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-design-profile="frontira-ledger-4-8" className="lg-ink">
      <body className="antialiased">{children}</body>
    </html>
  );
}
