import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px', color: '#ffffff' }}>
          404
        </h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>
          الصفحة غير موجودة
        </p>
        <Link href="/" className="btn btn-primary">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
