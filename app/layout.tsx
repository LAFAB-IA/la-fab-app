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
  keywords: [
    "impression B2B",
    "plateforme industrielle",
    "fournisseurs vérifiés",
    "brief impression",
    "packaging",
    "menuiserie",
    "métallurgie",
    "devis en ligne",
    "LA FAB",
  ],
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://lafab-360.fr",
  },
  openGraph: {
    title: "LA FAB — La plateforme B2B qui orchestre vos projets d'impression",
    description:
      "Connectez vos briefs aux meilleurs fournisseurs. Impression, menuiserie, métallurgie, logistique. IA intégrée, paiement sécurisé, suivi temps réel.",
    type: "website",
    url: "https://lafab-360.fr",
    siteName: "LA FAB",
  },
  twitter: {
    card: "summary_large_image",
    title: "LA FAB — Orchestrez vos projets industriels",
    description:
      "La plateforme B2B qui connecte vos briefs aux meilleurs fournisseurs. IA intégrée, paiement sécurisé, suivi temps réel.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LA FAB",
  url: "https://lafab-360.fr",
  description:
    "Plateforme B2B d'orchestration de projets industriels : impression, menuiserie, métallurgie, packaging.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "contact@lafab-360.fr",
    contactType: "customer service",
    availableLanguage: "French",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
