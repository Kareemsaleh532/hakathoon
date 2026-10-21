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
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

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
            GREENOVATE
          </Link>
          <span className="brand-tag">HACKATHON</span>
          
          {isSubmissionOpen !== null && (
            <div className={`status-pill ${isSubmissionOpen ? 'open' : 'closed'}`}>
              <span className={`status-dot ${isSubmissionOpen ? 'green' : 'red'}`}></span>
              <span>{isSubmissionOpen ? 'التسليم متاح' : 'التسليم مغلق'}</span>
            </div>
          )}
        </div>

        {/* Mobile menu trigger - pure text, zero icons */}
        <button 
          className="hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label="القائمة"
          type="button"
        >
          {mobileMenuOpen ? 'إغلاق القائمة' : 'القائمة'}
        </button>

        {/* Navigation links based on role */}
        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link 
            href="/" 
            className={`nav-link ${pathname === '/' ? 'active' : ''}`}
          >
            الرئيسية
          </Link>

          {user && user.role === 'participant' && (
            <Link 
              href="/submit" 
              className={`nav-link ${pathname === '/submit' ? 'active' : ''}`}
            >
              صفحة تسليم المشروع
            </Link>
          )}

          {user && user.role === 'judge' && (
            <Link 
              href="/judge" 
              className={`nav-link ${pathname === '/judge' ? 'active' : ''}`}
            >
              صفحة تحكيم المشاريع
            </Link>
          )}

          {user && user.role === 'admin' && (
            <Link 
              href="/admin" 
              className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
            >
              صفحة الادمن
            </Link>
          )}
        </nav>

        <div className="nav-user-status">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-emerald">
                {user.role === 'admin' ? 'الإدارة' : user.role === 'judge' ? 'المحكّم' : 'فريق'}: {user.name}
              </span>
              <button 
                onClick={handleLogout} 
                className="btn btn-outline btn-sm"
              >
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <Link href="/" className="btn btn-primary btn-sm">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
