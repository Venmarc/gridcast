import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GridCast | Multi-Region Visualized Data",
  description: "Visualized API Dashboard with WebSockets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>{children}</body>
    </html>
  );
}
