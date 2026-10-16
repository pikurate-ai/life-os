import type { Metadata, Viewport } from 'next';
import './globals.css';

const basePath = process.env.GITHUB_PAGES === 'true' ? '/life-os' : '';

export const metadata: Metadata = {
  title: 'Life OS — 나를 위한 일상의 공간',
  description:
    '하루의 기록이 내일의 방향이 되도록. 일기, 건강, 기억, 재정과 성장을 연결하는 나만의 Life OS.',
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Life OS',
  },
  icons: {
    icon: `${basePath}/icons/icon-192.svg`,
    apple: `${basePath}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#f6f7f5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
