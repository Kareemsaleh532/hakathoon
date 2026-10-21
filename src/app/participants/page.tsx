'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParticipantsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/submit');
  }, [router]);

  return (
    <div className="container" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)' }}>
      جار التحويل إلى صفحة التسليم...
    </div>
  );
}
