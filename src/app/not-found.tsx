import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', color: 'var(--primary)' }}>
          404
        </h1>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
          GREENOVATE HACKATHON
        </div>
        <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>
          الصفحة المطلوبة غير موجودة
        </p>
        <Link href="/" className="btn btn-primary">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
