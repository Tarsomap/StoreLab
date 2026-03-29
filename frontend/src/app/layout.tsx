import type { Metadata } from 'next';
import { Sora, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'StoreLab',
  description: 'Simulação gamificada de gestão de varejo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${sora.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
