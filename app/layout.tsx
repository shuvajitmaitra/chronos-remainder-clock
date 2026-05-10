import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Chronos Remainder Clock',
  description: 'Manage your tasks with elegant timers',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23121216" stroke="%238f00ff" stroke-width="10"/><circle cx="50" cy="50" r="20" fill="%232962ff"/></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="antialiased font-sans bg-[#0a0a0c] text-white selection:bg-purple-500/30" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
