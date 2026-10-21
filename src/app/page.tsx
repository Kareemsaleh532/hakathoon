'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, login, logout, isLoading } = useAuth();

  // Login credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'بيانات الدخول غير صحيحة');
      } else {
        login(data.user);
        setSuccessMsg('تم تسجيل الدخول بنجاح! جار تحويلك...');
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.push('/admin');
          } else if (data.user.role === 'judge') {
            router.push('/judge');
          } else {
            router.push('/submit');
          }
        }, 500);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)' }}>
        جار التحميل...
      </div>
    );
  }

  // If already logged in
  if (user) {
    return (
      <div className="container" style={{ maxWidth: '620px', paddingTop: '50px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ display: 'inline-block', marginBottom: '14px' }}>
            <span className="badge badge-emerald" style={{ fontSize: '0.88rem', padding: '6px 14px' }}>
              {user.role === 'admin' ? 'حساب الإدارة' : user.role === 'judge' ? 'حساب المحكّم' : 'حساب الفريق المشارك'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '8px', color: 'var(--primary)' }}>
            أهلاً بك، {user.name}
          </h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: '28px', fontSize: '0.92rem' }}>
            البريد الإلكتروني المعتمد: {user.email}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user.role === 'admin' && (
              <Link href="/admin" className="btn btn-primary">
                الانتقال لصفحة الادمن
              </Link>
            )}
            {user.role === 'judge' && (
              <Link href="/judge" className="btn btn-primary">
                الانتقال لصفحة التحكيم
              </Link>
            )}
            {user.role === 'participant' && (
              <Link href="/submit" className="btn btn-primary">
                الانتقال لصفحة تسليم المشروع
              </Link>
            )}
            <button onClick={logout} className="btn btn-danger">
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formal Official Login Screen - Zero icons, solid Green and Beige
  return (
    <div className="container" style={{ maxWidth: '480px', paddingTop: '40px' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 2.7rem)',
          fontWeight: 900,
          color: 'var(--primary)',
          letterSpacing: '1px',
          lineHeight: 1.1,
          marginBottom: '4px'
        }}>
          GREENOVATE
        </h1>
        <div style={{
          fontSize: '1rem',
          fontWeight: 800,
          color: 'var(--primary)',
          letterSpacing: '3px',
          marginBottom: '8px'
        }}>
          HACKATHON
        </div>
        <div style={{
          display: 'inline-block',
          background: 'var(--beige-accent)',
          border: '1px solid var(--border-color)',
          padding: '4px 14px',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--primary)',
          marginBottom: '8px'
        }}>
          28-29 أكتوبر
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
          Innovate Today, Sustain Tomorrow
        </p>
      </div>

      <div className="card" style={{ padding: '32px 28px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: 'var(--primary)' }}>
          تسجيل الدخول
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '20px' }}>
          أدخل البريد الإلكتروني وكلمة المرور المسلمة لك من قِبل إدارة الهاكاثون
        </p>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-info" style={{ marginBottom: '18px' }}>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="example@hackathon.com"
              value={loginEmail} 
              onChange={e => setLoginEmail(e.target.value)} 
              required 
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={loginPassword} 
              onChange={e => setLoginPassword(e.target.value)} 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px', height: '46px', fontSize: '1rem', fontWeight: 700 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جار التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6
        }}>
          يتم إصدار حسابات الفرق ولجنة التحكيم وتخزينها محلياً من قِبل إدارة هاكاثون GREENOVATE.
        </div>
      </div>
    </div>
  );
}
