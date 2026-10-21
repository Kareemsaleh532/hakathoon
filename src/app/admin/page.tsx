'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Criterion, Submission, Evaluation, User, AppSettings } from '@/types';

export default function AdminPage() {
  const { user, login } = useAuth();
  
  // Admin Login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab: submissions (default!), users, criteria
  const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'criteria'>('submissions');

  // Data states
  const [settings, setSettings] = useState<AppSettings>({ isSubmissionOpen: false });
  const [usersList, setUsersList] = useState<(User & { password?: string })[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Account Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'participant' | 'judge' | 'admin'>('participant');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // New Criterion Form
  const [newCritName, setNewCritName] = useState('');
  const [newCritMaxScore, setNewCritMaxScore] = useState(25);
  const [newCritDesc, setNewCritDesc] = useState('');

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [settingsRes, usersRes, criteriaRes, subsRes, evalsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/users'),
        fetch('/api/criteria'),
        fetch('/api/submissions'),
        fetch('/api/evaluations')
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (usersRes.ok) setUsersList(await usersRes.json());
      if (criteriaRes.ok) setCriteria(await criteriaRes.json());
      if (subsRes.ok) setSubmissions(await subsRes.json());
      if (evalsRes.ok) setEvaluations(await evalsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'بيانات الدخول غير صحيحة');
      } else {
        if (data.user.role !== 'admin') {
          setAuthError('هذا الحساب ليس لديه صلاحيات الادمن');
        } else {
          login(data.user);
          loadAllData();
        }
      }
    } catch {
      setAuthError('تعذر الاتصال بالخادم');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Toggle submission portal
  const handleToggleSubmission = async () => {
    try {
      const updatedStatus = !settings.isSubmissionOpen;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSubmissionOpen: updatedStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        showNotification(
          updatedStatus ? 'تم فتح بوابة التسليم لجميع الفرق بنجاح' : 'تم إغلاق بوابة التسليم أمام الفرق بنجاح'
        );
      }
    } catch {
      showNotification('فشل تعديل حالة التسليم', 'error');
    }
  };

  // Create User Account locally
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'فشل إنشاء الحساب', 'error');
      } else {
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setUsersList(prev => [...prev, data]);
        showNotification(`تم إنشاء الحساب وحفظه محلياً بنجاح! يمكن لـ (${data.name}) تسجيل الدخول الآن.`);
      }
    } catch {
      showNotification('تعذر الاتصال بالخادم', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب "${userName}"؟`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u.id !== id));
        showNotification('تم حذف الحساب بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'فشل الحذف', 'error');
      }
    } catch {
      showNotification('خطأ في الاتصال', 'error');
    }
  };

  // Create Criterion
  const handleCreateCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCritName,
          maxScore: Number(newCritMaxScore),
          description: newCritDesc,
        })
      });
      if (res.ok) {
        setNewCritName('');
        setNewCritDesc('');
        loadAllData();
        showNotification('تمت إضافة معيار التحكيم بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في الإضافة', 'error');
      }
    } catch {
      showNotification('تعذر الاتصال', 'error');
    }
  };

  // Delete Criterion
  const handleDeleteCriterion = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المعيار؟')) return;
    try {
      const res = await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCriteria(prev => prev.filter(c => c.id !== id));
        showNotification('تم حذف المعيار بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في الحذف', 'error');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // Delete Submission
  const handleDeleteSubmission = async (id: string, teamName: string) => {
    if (!confirm(`هل أنت متأكد من حذف تسليم فريق "${teamName}"؟`)) return;
    try {
      const res = await fetch(`/api/submissions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        setEvaluations(prev => prev.filter(e => e.submissionId !== id));
        showNotification('تم حذف التسليم وتقييماته بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'فشل الحذف', 'error');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // Reset database
  const handleResetDatabase = async () => {
    if (!confirm('تحذير: هل أنت متأكد من تصفير كافة البيانات والبدء بحالة فارغة نظيفة تماماً؟')) {
      return;
    }
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await loadAllData();
        showNotification('تم تصفير البيانات بنجاح والعودة للحالة النظيفة.');
      } else {
        showNotification('فشل تصفير البيانات', 'error');
      }
    } catch {
      showNotification('تعذر الاتصال', 'error');
    }
  };

  // If not logged in as Admin, show Admin Login form (Zero Icons)
  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ maxWidth: '460px', paddingTop: '60px' }}>
        <div className="card" style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>دخول الإدارة (الادمن)</h1>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '4px' }}>
              GREENOVATE HACKATHON
            </div>
            <p className="card-subtitle">
              يرجى إدخال بيانات حساب مدير الهاكاثون للوصول إلى لوحة التحكم
            </p>
          </div>

          {authError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني للادمن</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="admin@hackathon.com"
                value={adminEmail} 
                onChange={e => setAdminEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={adminPassword} 
                onChange={e => setAdminPassword(e.target.value)} 
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '12px', height: '46px', fontWeight: 700 }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'جار التحقق...' : 'دخول لوحة الادمن'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate project rankings
  const rankedSubmissions = submissions.map(sub => {
    const subEvals = evaluations.filter(e => e.submissionId === sub.id);
    const avgScore = subEvals.length > 0
      ? Number((subEvals.reduce((sum, e) => sum + e.totalScore, 0) / subEvals.length).toFixed(1))
      : 0;
    return {
      ...sub,
      evals: subEvals,
      evalsCount: subEvals.length,
      avgScore
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  const maxTotalScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  return (
    <div className="container" style={{ paddingTop: '30px', paddingBottom: '60px' }}>
      {/* Top Banner with Submission Toggle - Solid Green and Beige, Zero Icons */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid var(--border-color)',
        borderRadius: '8px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>لوحة تحكم الادمن</span>
          <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 900, color: 'var(--primary)', marginBottom: '4px' }}>
            GREENOVATE HACKATHON
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>
            التحكم في فتح وإغلاق التسليم، إنشاء حسابات الفرق والمحكمين، ومتابعة التقييمات
          </p>
        </div>

        {/* PROMINENT SUBMISSION TOGGLE: "خانة فتح التسليم بتنفتح فقط منن عند الادمن" */}
        <div style={{
          background: 'var(--bg-body)',
          border: '1.5px solid var(--border-color)',
          borderRadius: '6px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>خانة تسليم المشاريع للفرق:</div>
            <div style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: settings.isSubmissionOpen ? 'var(--primary)' : 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span className={`status-dot ${settings.isSubmissionOpen ? 'green' : 'red'}`}></span>
              {settings.isSubmissionOpen ? 'مفتوحة الآن للفرق' : 'مغلقة أمام الفرق'}
            </div>
          </div>

          <button 
            type="button"
            onClick={handleToggleSubmission}
            className={`btn ${settings.isSubmissionOpen ? 'btn-danger' : 'btn-primary'}`}
            style={{ fontWeight: 700, padding: '9px 18px' }}
          >
            {settings.isSubmissionOpen ? 'إغلاق باب التسليم' : 'فتح باب التسليم للفرق'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-info' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs-header" style={{ marginBottom: '20px' }}>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          المشاريع المسلمة وتقييمات الحكام ({submissions.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          إنشاء وإدارة الحسابات ({usersList.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'criteria' ? 'active' : ''}`}
          onClick={() => setActiveTab('criteria')}
        >
          معايير التحكيم ({criteria.length})
        </button>
      </div>

      {/* TAB 1: Submissions & Judge Evaluations */}
      {activeTab === 'submissions' && (
        <div>
          {/* Summary Stats */}
          <div className="grid-3" style={{ marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>إجمالي المشاريع المسلمة:</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{submissions.length}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>إجمالي تقييمات الحكام:</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E3A5F' }}>{evaluations.length}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>المشاريع المقيّمة:</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#854D0E' }}>
                {rankedSubmissions.filter(s => s.evalsCount > 0).length} / {submissions.length}
              </div>
            </div>
          </div>

          {/* Submissions & Detailed Evaluations List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>
                  كل المشاريع المسلّمة وتقييماتها من الحكام
                </h2>
                <p className="card-subtitle" style={{ margin: 0, marginTop: '4px' }}>
                  يظهر هنا اسم كل فريق وأعضاؤه والملف المسلَّم وتفصيل درجات الحكام
                </p>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                جار التحميل...
              </div>
            ) : rankedSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px', color: 'var(--primary)' }}>
                  لا توجد مشاريع مسلّمة حتى الآن
                </h3>
                <p style={{ fontSize: '0.85rem' }}>
                  عندما يسلّم أي فريق مشروعه من صفحته، سيظهر هنا فوراً مع تقييمات الحكام.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {rankedSubmissions.map((sub, index) => (
                  <div 
                    key={sub.id} 
                    style={{
                      background: 'var(--bg-body)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '20px',
                    }}
                  >
                    {/* Top Row: Rank, Project Title, Team, Members */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span className="num-pill">{index + 1}</span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {sub.projectTitle}
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-dim)' }}>اسم التيم: </span>
                            <strong style={{ color: 'var(--primary)' }}>{sub.teamName}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-dim)' }}>الأعضاء: </span>
                            <strong style={{ color: 'var(--text-main)' }}>{sub.members}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Average Score Badge */}
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>معدل الحكام:</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: sub.evalsCount > 0 ? 'var(--primary)' : 'var(--text-dim)' }}>
                          {sub.evalsCount > 0 ? `${sub.avgScore} / ${maxTotalScore}` : 'لم يقيّم بعد'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          ({sub.evalsCount} تقييم)
                        </div>
                      </div>
                    </div>

                    {/* Files & Links - Zero Icons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>الملفات والروابط:</span>
                      
                      {sub.fileUrl && (
                        <a 
                          href={sub.fileUrl} 
                          download 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                        >
                          تحميل الملف ({sub.fileName || 'ملف المشروع'})
                        </a>
                      )}

                      {sub.fileLink && (
                        <a 
                          href={sub.fileLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-secondary btn-sm"
                        >
                          رابط خارجي للملف
                        </a>
                      )}

                      {sub.demoUrl && (
                        <a 
                          href={sub.demoUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-outline btn-sm"
                        >
                          رابط التجربة (Demo)
                        </a>
                      )}

                      <button 
                        type="button" 
                        onClick={() => handleDeleteSubmission(sub.id, sub.teamName)}
                        className="btn btn-danger btn-sm"
                        style={{ marginRight: 'auto' }}
                      >
                        حذف التسليم
                      </button>
                    </div>

                    {/* Summary */}
                    {sub.summary && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-main)' }}>نبذة: </strong> {sub.summary}
                      </p>
                    )}

                    {/* Judges Evaluations Breakdown */}
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '14px',
                      border: '1.5px solid var(--border-color)',
                      marginTop: '10px'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary)', marginBottom: '8px' }}>
                        تقييمات الحكام لهذا المشروع ({sub.evals.length}):
                      </div>

                      {sub.evals.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          لم يقم أي محكّم بتقييم هذا المشروع حتى الآن.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {sub.evals.map(ev => (
                            <div 
                              key={ev.id} 
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'var(--bg-body)',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                flexWrap: 'wrap',
                                gap: '8px',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <div>
                                <strong style={{ color: 'var(--primary)' }}>{ev.judgeName}: </strong>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                  {Object.entries(ev.scores).map(([critId, score]) => {
                                    const c = criteria.find(item => item.id === critId);
                                    return `${c ? c.name : critId}: ${score}ن`;
                                  }).join(' | ')}
                                </span>
                                {ev.feedback && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    ملاحظة الحكم: "{ev.feedback}"
                                  </div>
                                )}
                              </div>

                              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                                المجموع: {ev.totalScore} نقطة
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Accounts Management (Create Emails locally) */}
      {activeTab === 'users' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إنشاء حساب رسمي جديد (يُحفظ محلياً)</h2>
            <p className="card-subtitle">
              حسابات الفرق ولجنة التحكيم تصدر حصرياً من هنا وتخزن محلياً في قاعدة البيانات
            </p>

            <form onSubmit={handleCreateUser}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">الاسم الكامل / اسم الفريق أو الحكم *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: فريق الرواد / د. سامي الأحمد"
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">نوع الحساب (الدور) *</label>
                  <select 
                    className="form-select"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                  >
                    <option value="participant">فريق مشارك (يقوم بالتسليم فقط)</option>
                    <option value="judge">محكّم (يقوم بتقييم المشاريع فقط)</option>
                    <option value="admin">مسؤول إدارة (ادمن)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني المعتمد *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="team1@hackathon.com"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">كلمة المرور *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="كلمة المرور المسلمة له"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isCreatingUser}
                style={{ minWidth: '180px', height: '44px', fontWeight: 700 }}
              >
                {isCreatingUser ? 'جار الحفظ...' : 'إنشاء وحفظ الحساب محلياً'}
              </button>
            </form>
          </div>

          {/* Users Table */}
          <div className="card">
            <h2 className="card-title">قائمة الحسابات المعتمدة ({usersList.length})</h2>
            <p className="card-subtitle">
              جميع الحسابات المخزنة محلياً والتي يمكن لأصحابها الدخول للنظام
            </p>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الاسم / الفريق</th>
                    <th>البريد الإلكتروني</th>
                    <th>كلمة المرور</th>
                    <th>الدور</th>
                    <th>تاريخ الإنشاء</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.name}</td>
                      <td style={{ color: 'var(--text-main)' }}>{u.email}</td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          background: 'var(--bg-body)',
                          border: '1px solid var(--border-color)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: 'var(--primary)',
                          fontWeight: 700
                        }}>
                          {u.password || '••••••'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-emerald' : u.role === 'judge' ? 'badge-blue' : 'badge-amber'}`}>
                          {u.role === 'admin' ? 'إدارة' : u.role === 'judge' ? 'حكم' : 'فريق'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td>
                        {u.id !== 'admin-1' ? (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="btn btn-danger btn-sm"
                          >
                            حذف
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>رئيسي</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                        لا توجد حسابات مسجلة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Criteria Management */}
      {activeTab === 'criteria' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إضافة معيار تحكيم جديد</h2>
            <p className="card-subtitle">
              هذه المعايير تظهر للحكام في صفحتهم لإدخال الدرجات أمامها
            </p>

            <form onSubmit={handleCreateCriterion}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">اسم المعيار *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: أصالة الفكرة والابتكار"
                    value={newCritName} 
                    onChange={e => setNewCritName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الدرجة القصوى *</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    className="form-control" 
                    value={newCritMaxScore} 
                    onChange={e => setNewCritMaxScore(Number(e.target.value))} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">إرشادات وتوجيهات للحكم حول هذا المعيار</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="توجيهات مختصرة لتقييم المعيار..."
                  value={newCritDesc} 
                  onChange={e => setNewCritDesc(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}>
                إضافة المعيار
              </button>
            </form>
          </div>

          {/* Criteria List */}
          <div className="card">
            <h2 className="card-title">معايير التحكيم المعتمدة ({criteria.length})</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم المعيار</th>
                    <th>الوصف</th>
                    <th>الدرجة القصوى</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map(crit => (
                    <tr key={crit.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{crit.name}</td>
                      <td style={{ fontSize: '0.86rem', color: 'var(--text-dim)', maxWidth: '350px' }}>
                        {crit.description || '-'}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{crit.maxScore} نقطة</td>
                      <td>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteCriterion(crit.id)}
                          className="btn btn-danger btn-sm"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                  {criteria.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                        لا توجد معايير تحكيم حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Reset Database Button */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                تصفير البيانات يعيد النظام لحالته الأولية النظيفة مع الحفاظ على حساب الادمن
              </span>
              <button 
                type="button" 
                onClick={handleResetDatabase}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--danger)' }}
              >
                تصفير البيانات بالكامل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
