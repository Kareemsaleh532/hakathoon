'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Team } from '@/types';

export default function RootPage() {
  const router = useRouter();
  const { user, login, logout, isLoading } = useAuth();

  // Mode: login or register
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load teams for registration
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
          if (data.length > 0 && !selectedTeamId) {
            setSelectedTeamId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTeams();
  }, [authMode]);

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
        setErrorMsg(data.error || 'فشل تسجيل الدخول');
      } else {
        login(data.user);
        setSuccessMsg('تم تسجيل الدخول بنجاح! جار تحويلك...');
        // Redirect according to role
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.push('/admin');
          } else if (data.user.role === 'judge') {
            router.push('/judge');
          } else {
            router.push('/participants');
          }
        }, 500);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          specialty: regSpecialty,
          teamId: selectedTeamId,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'فشل إنشاء الحساب');
      } else {
        login(data.user);
        setSuccessMsg('تم إنشاء الحساب بنجاح وانضمامك للفريق!');
        setTimeout(() => {
          router.push('/participants');
        }, 600);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill preset credentials
  const fillCredentials = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setAuthMode('login');
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-dim)' }}>
        جار التحميل...
      </div>
    );
  }

  // CASE 1: USER IS ALREADY LOGGED IN
  if (user) {
    return (
      <div className="container" style={{ maxWidth: '850px', paddingTop: '40px' }}>
        <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ display: 'inline-block', marginBottom: '10px' }}>
            <span className="badge badge-emerald">
              {user.role === 'admin' ? 'حساب الادمن' : user.role === 'judge' ? 'حساب المحكم' : 'حساب المتسابق'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, marginBottom: '8px' }}>
            مرحباً بك في هاكاثون، {user.name}
          </h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>
            البريد الإلكتروني: {user.email}
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
              <>
                <Link href="/participants" className="btn btn-primary">
                  صفحة فريقي وبياناتي
                </Link>
                <Link href="/submit" className="btn btn-secondary">
                  صفحة تسليم المشروع
                </Link>
              </>
            )}
            <Link href="/challenges" className="btn btn-outline">
              استعراض التحديات
            </Link>
            <button onClick={logout} className="btn btn-danger">
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: NOT LOGGED IN -> SHOW CLEAN LOGIN & REGISTER SCREEN FIRST
  return (
    <div className="container" style={{ maxWidth: '540px', paddingTop: '40px' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: 800, marginBottom: '4px', color: '#ffffff' }}>
          هاكاثون
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.92rem' }}>
          البيئة والتغير المناخي - بوابة الدخول والتسجيل
        </p>
      </div>

      <div className="card">
        {/* Auth Tabs */}
        <div className="tabs-header" style={{ justifyContent: 'center', marginBottom: '20px' }}>
          <button 
            type="button"
            className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            تسجيل الدخول
          </button>
          <button 
            type="button"
            className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {errorMsg && (
          <div className="alert alert-danger">
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-info">
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="name@example.com"
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="******"
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جار التحقق...' : 'تسجيل الدخول'}
            </button>

            {/* Quick Helper Credentials */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                حسابات سريعة للتجربة:
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => fillCredentials('admin@hackathon.com', 'admin')}
                  className="btn btn-outline btn-sm"
                >
                  الادمن
                </button>
                <button 
                  type="button" 
                  onClick={() => fillCredentials('judge@hackathon.com', 'judge')}
                  className="btn btn-outline btn-sm"
                >
                  الحكم
                </button>
                <button 
                  type="button" 
                  onClick={() => fillCredentials('ahmed@hackathon.com', '123')}
                  className="btn btn-outline btn-sm"
                >
                  المتسابق
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">الاسم الكامل *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="مثال: محمد سعيد"
                value={regName} 
                onChange={e => setRegName(e.target.value)} 
                required 
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="name@example.com"
                  value={regEmail} 
                  onChange={e => setRegEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور *</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="******"
                  value={regPassword} 
                  onChange={e => setRegPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="05xxxxxxxx"
                  value={regPhone} 
                  onChange={e => setRegPhone(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">التخصص / الدور</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="مثال: مطور ويب، مهندس بيانات"
                  value={regSpecialty} 
                  onChange={e => setRegSpecialty(e.target.value)} 
                />
              </div>
            </div>

            {/* Team selection from Admin teams */}
            <div className="form-group" style={{
              padding: '12px 14px',
              background: 'var(--bg-input)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginTop: '6px'
            }}>
              <label className="form-label" style={{ color: '#22c55e', fontWeight: 600 }}>
                اختيار الفريق (الفرق المدخلة من قبل الادمن) *
              </label>
              {teams.length > 0 ? (
                <select 
                  className="form-select"
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  required
                >
                  {teams.map(t => {
                    const isFull = (t.membersCount || 0) >= t.maxMembers;
                    return (
                      <option key={t.id} value={t.id} disabled={isFull}>
                        {t.name} ({t.track || 'عام'}) - {t.membersCount || 0}/{t.maxMembers} {isFull ? '[مكتمل]' : '[متاح]'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#fbbf24' }}>
                  لا توجد فرق مدخلة حالياً، يرجى قيام الادمن بإضافة فريق أولاً.
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '12px' }}
              disabled={isSubmitting || teams.length === 0}
            >
              {isSubmitting ? 'جار إنشاء الحساب...' : 'إنشاء الحساب والانضمام'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
