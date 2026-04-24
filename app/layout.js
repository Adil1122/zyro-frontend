import "./globals.css";

export const metadata = {
  title: "Zyro — Pakistan's First AI Commerce OS",
  description: "All-in-one ecommerce operations platform. Manage orders, WhatsApp, couriers, inventory, and marketing from one dashboard.",
  icons: {
    icon: "/favicon.ico",
  },
};

import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}
