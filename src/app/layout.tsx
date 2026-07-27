import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "JustPrint Storefront",
  description:
    "Application storefront multi-boutique JustPrint — configurateur de kits déco intégrable en iframe (mode mock).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
