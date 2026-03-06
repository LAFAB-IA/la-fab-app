import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import AppLayout from "@/components/layout/AppLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LA FAB — La plateforme B2B qui orchestre vos projets d'impression",
  description:
    "Connectez vos briefs aux meilleurs fournisseurs. Impression, menuiserie, métallurgie, logistique. IA intégrée, paiement sécurisé, suivi temps réel.",
  openGraph: {
    title: "LA FAB — La plateforme B2B qui orchestre vos projets d'impression",
    description:
      "Connectez vos briefs aux meilleurs fournisseurs. Impression, menuiserie, métallurgie, logistique. IA intégrée, paiement sécurisé, suivi temps réel.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
