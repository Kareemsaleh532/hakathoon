import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'GREENOVATE HACKATHON | Innovate Today, Sustain Tomorrow',
  description: 'هاكاثون GREENOVATE - بوابة تحكيم وتسليم مشاريع الابتكار البيئي والاستدامة.',
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
        <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 140px)', paddingBottom: '40px' }}>
            {children}
          </main>
          <footer style={{
            borderTop: '2px solid var(--border-color)',
            padding: '24px 0',
            textAlign: 'center',
            background: '#FFFFFF',
            fontSize: '0.88rem',
            color: 'var(--text-dim)'
          }}>
            <div className="container">
              <p style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '4px', letterSpacing: '0.5px' }}>
                GREENOVATE HACKATHON
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Innovate Today, Sustain Tomorrow - 28-29 أكتوبر
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
