import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'هاكاثون | حلول تقنية للبيئة والتغير المناخي',
  description: 'منصة هاكاثون الابتكار البيئي والمناخي لتسجيل الفرق واستعراض التحديات وتحكيم المشاريع المستدامة.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 130px)', paddingBottom: '40px' }}>
            {children}
          </main>
          <footer style={{
            borderTop: '1px solid var(--border-color)',
            padding: '20px 0',
            textAlign: 'center',
            background: 'var(--bg-card)',
            fontSize: '0.85rem',
            color: 'var(--text-dim)'
          }}>
            <div className="container">
              <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>هاكاثون</p>
              <p>منصة الابتكار للبيئة والتغير المناخي</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
