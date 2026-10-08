'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Team, Submission } from '@/types';

export default function ParticipantsPage() {
  const { user, login, logout } = useAuth();

  // Mode: register or login
  const [authMode, setAuthMode] = useState<'register' | 'login'>('login');

  // Form states - Registration
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // API states
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Participant's team & submission data when logged in
  const [myTeam, setMyTeam] = useState<any | null>(null);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);

  // Load available teams from Admin
  const loadTeamsAndSettings = async () => {
    setIsLoadingTeams(true);
    try {
      const [teamsRes, settingsRes, subsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/settings'),
        fetch('/api/submissions')
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
        if (teamsData.length > 0 && !selectedTeamId) {
          setSelectedTeamId(teamsData[0].id);
        }
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setIsSubmissionOpen(settingsData.isSubmissionOpen);
      }

      if (subsRes.ok && user && user.teamId) {
        const allSubs: Submission[] = await subsRes.json();
        const found = allSubs.find(s => s.teamId === user.teamId);
        if (found) setMySubmission(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  useEffect(() => {
    loadTeamsAndSettings();
  }, [user]);

  // When user is logged in, find their team
  useEffect(() => {
    if (user && user.role === 'participant' && user.teamId && teams.length > 0) {
      const team = teams.find(t => t.id === user.teamId);
      if (team) setMyTeam(team);
    }
  }, [user, teams]);

  // Handle Participant Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          specialty,
          teamId: selectedTeamId,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'فشل التسجيل');
      } else {
        login(data.user);
        setSuccessMessage('تم تسجيلك بنجاح وانضمامك إلى الفريق المختار!');
        loadTeamsAndSettings();
      }
    } catch {
      setErrorMessage('تعذر الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Participant Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
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
        setErrorMessage(data.error || 'بيانات الدخول غير صحيحة');
      } else {
        login(data.user);
        setSuccessMessage('تم تسجيل الدخول بنجاح');
        loadTeamsAndSettings();
      }
    } catch {
      setErrorMessage('تعذر الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '30px' }}>
      {/* Top Banner */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff' }}>صفحة المشاركين والفرق</h1>
        <p style={{ color: 'var(--text-dim)', maxWidth: '650px', margin: '6px auto 0' }}>
          متابعة الفريق، استعراض الزملاء، والاطلاع على حالة تسليم المشروع
        </p>
      </div>

      {/* If logged in as participant */}
      {user && user.role === 'participant' ? (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-emerald">متسابق مسجل</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '6px' }}>
                  أهلاً بك، {user.name}
                </h2>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                  التخصص: {user.specialty || 'مبتكر بيئي'} | {user.email}
                </div>
              </div>

              {/* Status pill for submission */}
              <div className={`status-pill ${isSubmissionOpen ? 'open' : 'closed'}`}>
                <span className={`status-dot ${isSubmissionOpen ? 'green' : 'red'}`}></span>
                {isSubmissionOpen ? 'بوابة التسليم متاحة الآن' : 'بوابة التسليم مغلقة من الادمن'}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <Link href="/challenges" className="btn btn-secondary btn-sm">
                صفحة التحديات
              </Link>
              <Link href="/submit" className={`btn btn-sm ${isSubmissionOpen ? 'btn-primary' : 'btn-outline'}`}>
                {isSubmissionOpen ? 'الانتقال لصفحة التسليم' : 'صفحة التسليم (مغلقة)'}
              </Link>
              <button onClick={logout} className="btn btn-outline btn-sm">
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* Team Information Card */}
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title">فريقك في الهاكاثون</h3>
              {myTeam ? (
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e', marginBottom: '6px' }}>
                    {myTeam.name}
                  </div>
                  <div className="badge badge-emerald" style={{ marginBottom: '10px' }}>
                    المسار: {myTeam.track || 'المسار العام'}
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>
                    {myTeam.description || 'فريق عمل بيئي لحل قضايا التغير المناخي.'}
                  </p>

                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
                    أعضاء الفريق ({myTeam.members?.length || 1} / {myTeam.maxMembers}):
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {myTeam.members?.map((member: any) => (
                      <li key={member.id} style={{
                        padding: '8px 12px',
                        background: 'var(--bg-input)',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        fontSize: '0.86rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        border: '1px solid var(--border-color)'
                      }}>
                        <span>{member.name} {member.id === user.id && '(أنت)'}</span>
                        <span style={{ color: '#22c55e' }}>{member.specialty || 'عضو'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ color: 'var(--text-dim)' }}>جار تحميل بيانات الفريق...</p>
              )}
            </div>

            {/* Project Submission Status Card */}
            <div className="card">
              <h3 className="card-title">حالة تسليم مشروع الفريق</h3>
              {mySubmission ? (
                <div>
                  <div className="badge badge-emerald" style={{ marginBottom: '10px' }}>
                    تم التسليم بنجاح
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                    {mySubmission.projectTitle}
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.6 }}>
                    {mySubmission.summary}
                  </p>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
                    تاريخ التسليم: {new Date(mySubmission.submittedAt).toLocaleString('ar-EG')}
                  </div>
                  <Link href="/submit" className="btn btn-secondary btn-sm">
                    تعديل أو استعراض التسليم
                  </Link>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-dim)', marginBottom: '16px', lineHeight: 1.6 }}>
                    لم يقم فريقك بتسليم مشروعه بعد. يمكنك تسليم المشروع عند تفعيل بوابة التسليم من قبل الادمن.
                  </p>
                  <Link href="/submit" className={`btn btn-sm ${isSubmissionOpen ? 'btn-primary' : 'btn-outline'}`}>
                    {isSubmissionOpen ? 'الذهاب لصفحة التسليم' : 'صفحة التسليم (مغلقة حالياً)'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Registration & Login Tabs when not logged in */
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div className="tabs-header" style={{ justifyContent: 'center' }}>
            <button 
              type="button"
              className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthMode('login'); setErrorMessage(''); }}
            >
              تسجيل الدخول للمتسابقين
            </button>
            <button 
              type="button"
              className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setErrorMessage(''); }}
            >
              إنشاء حساب متسابق جديد
            </button>
          </div>

          {errorMessage && (
            <div className="alert alert-danger">
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-info">
              <span>{successMessage}</span>
            </div>
          )}

          {authMode === 'login' ? (
            /* Login Form */
            <div className="card">
              <h2 className="card-title">تسجيل الدخول</h2>
              <p className="card-subtitle">
                أدخل بريدك الإلكتروني وكلمة المرور لمتابعة فريقك وتسليم المشاريع
              </p>

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
                  style={{ width: '100%', marginTop: '12px' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جار التحقق...' : 'تسجيل الدخول'}
                </button>
              </form>
            </div>
          ) : (
            /* Registration Form */
            <div className="card">
              <h2 className="card-title">إنشاء حساب متسابق جديد</h2>
              <p className="card-subtitle">
                أدخل بياناتك واختر الفريق من بين الفرق المعتمدة من الادمن
              </p>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: عبد الرحمن خالد"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
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
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">كلمة المرور *</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="******"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
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
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التخصص أو المهارة</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="مثال: مطور ويب، مهندس بيانات"
                      value={specialty} 
                      onChange={e => setSpecialty(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Team Selection */}
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
                      {teams.map(team => {
                        const isFull = (team.membersCount || 0) >= team.maxMembers;
                        return (
                          <option key={team.id} value={team.id} disabled={isFull}>
                            {team.name} ({team.track || 'عام'}) - {team.membersCount || 0}/{team.maxMembers} {isFull ? '[مكتمل]' : '[متاح]'}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#fbbf24' }}>
                      لم يقم الادمن بإدخال فرق بعد! يرجى الانتظار حتى يضيف الادمن الفرق.
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '14px' }}
                  disabled={isSubmitting || teams.length === 0}
                >
                  {isSubmitting ? 'جار التسجيل...' : 'تسجيل المتسابق والانضمام للفريق'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
