import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f7f4ed' };

export const metadata: Metadata = {
  metadataBase: new URL('https://celda-chelem-even.pabloydavid.chatgpt.site'),
  title: 'Celda Chelem — Una nueva forma de leer la costa',
  description: 'Explora el territorio de Chelem con datos oficiales de INEGI y CONABIO. Prototipo de EVEN para el Colectivo por la Costa. Área preliminar de estudio.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
