import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";

export const metadata = {
  title: "Invoxa - Smart Invoice & Sales Tracker",
  description: "Offline-first intelligent billing and sales analysis application for small shops.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
