import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "Humsafar Events",
  description: "Together in Every Journey — event decoration booking, coming soon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
