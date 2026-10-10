import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.GITHUB_PAGES === "true" ? "/life-os" : "";

export const metadata: Metadata = {
  title: "Life-OS | 인생 Super App",
  description: "단 하나의 개인 전용 1인 라이프 운영체제 (Life Operating System)",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Life-OS",
  },
  icons: {
    icon: `${basePath}/icons/icon-192.svg`,
    apple: `${basePath}/icons/icon-192.svg`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#090a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-[#090a0f] text-zinc-100 min-h-screen antialiased flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
