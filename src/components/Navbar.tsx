'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isSubmissionOpen, setIsSubmissionOpen] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setIsSubmissionOpen(data.isSubmissionOpen);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  return (
    <header className="navbar">
      <div className="container nav-container">
        <div className="brand-group">
          <Link href="/" className="brand-title">
            هاكاثون
          </Link>
          <span className="brand-tag">البيئة والتغير المناخي</span>
          
          {user && isSubmissionOpen !== null && (
            <div className={`status-pill ${isSubmissionOpen ? 'open' : 'closed'}`}>
              <span className={`status-dot ${isSubmissionOpen ? 'green' : 'red'}`}></span>
              <span>{isSubmissionOpen ? 'التسليم متاح' : 'التسليم مغلق'}</span>
            </div>
          )}
        </div>

        {/* Hamburger button - visible only on mobile */}
        <button 
          className="hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label="القائمة"
          type="button"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Dynamic navigation links depending on authentication & role */}
        {user ? (
          <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link 
              href="/" 
              className={`nav-link ${pathname === '/' ? 'active' : ''}`}
            >
              الرئيسية
            </Link>
            
            <Link 
              href="/challenges" 
              className={`nav-link ${pathname === '/challenges' ? 'active' : ''}`}
            >
              صفحة التحديات
            </Link>

            {/* ONLY participant sees the submission portal */}
            {user.role === 'participant' && (
              <>
                <Link 
                  href="/participants" 
                  className={`nav-link ${pathname === '/participants' ? 'active' : ''}`}
                >
                  صفحة المشاركين وفريقي
                </Link>
                <Link 
                  href="/submit" 
                  className={`nav-link ${pathname === '/submit' ? 'active' : ''}`}
                >
                  صفحة التسليم
                </Link>
              </>
            )}

            {/* Judge portal */}
            {user.role === 'judge' && (
              <Link 
                href="/judge" 
                className={`nav-link ${pathname === '/judge' ? 'active' : ''}`}
              >
                صفحة الحكام والتقييم
              </Link>
            )}

            {/* Admin portal */}
            {user.role === 'admin' && (
              <Link 
                href="/admin" 
                className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
              >
                صفحة الادمن
              </Link>
            )}

            {/* Mobile-only logout button inside menu */}
            <button
              onClick={handleLogout}
              className="nav-link"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', fontWeight: 600, textAlign: 'right', display: 'none' }}
            >
              تسجيل الخروج
            </button>
          </nav>
        ) : (
          <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              يرجى تسجيل الدخول للوصول إلى النظام
            </span>
          </nav>
        )}

        <div className="nav-user-status">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-emerald">
                {user.role === 'admin' ? 'الادمن' : user.role === 'judge' ? 'حكم' : 'متسابق'}: {user.name}
              </span>
              <button 
                onClick={handleLogout} 
                className="btn btn-outline btn-sm"
                title="تسجيل الخروج"
              >
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <Link href="/" className="btn btn-primary btn-sm">
              تسجيل الدخول / حساب جديد
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
