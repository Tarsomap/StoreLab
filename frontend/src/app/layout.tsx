/**
 * Layout raiz do Next.js: carrega fontes do design system (Sora, DM Sans, JetBrains Mono) e envolve toda a árvore
 * com AppProviders (toasts e animação de troca de página).
 */
import type { Metadata } from 'next';
import { Sora, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { AppProviders } from '@/components/providers';
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

/** Estrutura HTML comum (`lang=pt-BR`), classes de fonte no body e filhos dentro dos providers globais. */
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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
