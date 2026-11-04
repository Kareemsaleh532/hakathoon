'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Criterion, Submission, Evaluation, User, AppSettings } from '@/types';

// Client-side persistent deletion filters (guarantees deleted items never resurrect on Vercel/serverless)
const getDeletedCritIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('hackathon_deleted_crit_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const saveDeletedCritId = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedCritIds();
    set.add(id);
    localStorage.setItem('hackathon_deleted_crit_ids', JSON.stringify(Array.from(set)));
  } catch (_) {}
};

const getDeletedUserIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('hackathon_deleted_user_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const saveDeletedUserId = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedUserIds();
    set.add(id);
    localStorage.setItem('hackathon_deleted_user_ids', JSON.stringify(Array.from(set)));
  } catch (_) {}
};

const getDeletedSubIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('hackathon_deleted_sub_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const saveDeletedSubId = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedSubIds();
    set.add(id);
    localStorage.setItem('hackathon_deleted_sub_ids', JSON.stringify(Array.from(set)));
  } catch (_) {}
};

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Account Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'participant' | 'judge' | 'admin'>('participant');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit User Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<'participant' | 'judge' | 'admin'>('participant');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // New Criterion Form
  const [newCritName, setNewCritName] = useState('');
  const [newCritMaxScore, setNewCritMaxScore] = useState(25);
  const [newCritDesc, setNewCritDesc] = useState('');
  const [isCreatingCrit, setIsCreatingCrit] = useState(false);

  // Edit Criterion Form State
  const [editingCritId, setEditingCritId] = useState<string | null>(null);
  const [editCritName, setEditCritName] = useState('');
  const [editCritMaxScore, setEditCritMaxScore] = useState(25);
  const [editCritDesc, setEditCritDesc] = useState('');
  const [isUpdatingCrit, setIsUpdatingCrit] = useState(false);

  // Load all data with strict no-cache + persistent local filter
  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const ts = Date.now();
      const fetchOpts: RequestInit = {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      };

      const [settingsRes, usersRes, criteriaRes, subsRes, evalsRes] = await Promise.all([
        fetch(`/api/settings?_t=${ts}`, fetchOpts),
        fetch(`/api/users?_t=${ts}`, fetchOpts),
        fetch(`/api/criteria?_t=${ts}`, fetchOpts),
        fetch(`/api/submissions?_t=${ts}`, fetchOpts),
        fetch(`/api/evaluations?_t=${ts}`, fetchOpts)
      ]);

      const deletedUsers = getDeletedUserIds();
      const deletedCrit = getDeletedCritIds();
      const deletedSubs = getDeletedSubIds();

      if (settingsRes.ok) setSettings(await settingsRes.json());
      
      if (usersRes.ok) {
        const rawUsers: (User & { password?: string })[] = await usersRes.json();
        setUsersList(rawUsers.filter(u => !deletedUsers.has(u.id)));
      }

      if (criteriaRes.ok) {
        const rawCrit: Criterion[] = await criteriaRes.json();
        setCriteria(rawCrit.filter(c => !deletedCrit.has(c.id)));
      }

      if (subsRes.ok) {
        const rawSubs: Submission[] = await subsRes.json();
        setSubmissions(rawSubs.filter(s => !deletedSubs.has(s.id)));
      }

      if (evalsRes.ok) setEvaluations(await evalsRes.json());

      if (isManualRefresh) {
        showNotification('تم تحديث البيانات من الخادم بنجاح');
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      showNotification('تعذر جلب البيانات من الخادم', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
          await loadAllData();
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

  // Create User Account
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
        // Clear from deleted set if newly created
        try {
          const set = getDeletedUserIds();
          if (set.has(data.id)) {
            set.delete(data.id);
            localStorage.setItem('hackathon_deleted_user_ids', JSON.stringify(Array.from(set)));
          }
        } catch (_) {}

        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setUsersList(prev => [...prev.filter(u => u.id !== data.id), data]);
        showNotification(`تم إنشاء الحساب وحفظه بنجاح! يمكن لـ (${data.name}) تسجيل الدخول الآن.`);
      }
    } catch {
      showNotification('تعذر الاتصال بالخادم', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Start Editing User
  const handleStartEditUser = (u: User & { password?: string }) => {
    setEditingUserId(u.id);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserPassword(u.password || '');
    setEditUserRole(u.role as any);
  };

  // Cancel Editing User
  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setEditUserName('');
    setEditUserEmail('');
    setEditUserPassword('');
  };

  // Save Edited User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setIsUpdatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUserId,
          name: editUserName,
          email: editUserEmail,
          password: editUserPassword,
          role: editUserRole,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'فشل تعديل بيانات الحساب', 'error');
      } else {
        setUsersList(prev => prev.map(u => u.id === data.id ? { ...u, ...data } : u));
        setEditingUserId(null);
        showNotification(`تم حفظ التعديلات على حساب (${data.name}) بنجاح.`);
      }
    } catch {
      showNotification('تعذر الاتصال بالخادم', 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Delete User Account Permanently
  const handleDeleteUser = async (id: string, userName: string) => {
    const confirmMsg = `هل أنت متأكد من حذف حساب "${userName}" نهائياً؟`;
    const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
    if (!confirmed) return;

    // 1. Save to persistent deleted storage
    saveDeletedUserId(id);

    // 2. Optimistically remove from state immediately
    setUsersList(prev => prev.filter(u => u.id !== id));
    showNotification('تم حذف الحساب نهائياً بنجاح.');

    // 3. Send DELETE to server
    try {
      await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.error('Delete user server call error:', err);
    }
  };

  // Create Criterion
  const handleCreateCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCrit(true);
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

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'خطأ في إضافة المعيار', 'error');
      } else {
        // Clear from deleted set if newly created
        try {
          const set = getDeletedCritIds();
          if (set.has(data.id)) {
            set.delete(data.id);
            localStorage.setItem('hackathon_deleted_crit_ids', JSON.stringify(Array.from(set)));
          }
        } catch (_) {}

        setNewCritName('');
        setNewCritDesc('');
        setCriteria(prev => [...prev.filter(c => c.id !== data.id), data]);
        showNotification('تمت إضافة معيار التحكيم وحفظه بنجاح');
      }
    } catch {
      showNotification('تعذر الاتصال بالخادم', 'error');
    } finally {
      setIsCreatingCrit(false);
    }
  };

  // Start Editing Criterion
  const handleStartEditCrit = (crit: Criterion) => {
    setEditingCritId(crit.id);
    setEditCritName(crit.name);
    setEditCritMaxScore(crit.maxScore);
    setEditCritDesc(crit.description || '');
  };

  // Cancel Editing Criterion
  const handleCancelEditCrit = () => {
    setEditingCritId(null);
    setEditCritName('');
    setEditCritMaxScore(25);
    setEditCritDesc('');
  };

  // Save Edited Criterion
  const handleSaveEditCrit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCritId) return;
    setIsUpdatingCrit(true);
    try {
      const res = await fetch('/api/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCritId,
          name: editCritName,
          maxScore: Number(editCritMaxScore),
          description: editCritDesc,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'فشل تعديل المعيار', 'error');
      } else {
        setCriteria(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
        setEditingCritId(null);
        showNotification('تم حفظ تعديلات المعيار بنجاح.');
      }
    } catch {
      showNotification('تعذر الاتصال بالخادم', 'error');
    } finally {
      setIsUpdatingCrit(false);
    }
  };

  // Delete Criterion Permanently
  const handleDeleteCriterion = async (id: string, critName: string) => {
    const confirmMsg = `هل أنت متأكد من حذف معيار "${critName}" نهائياً؟`;
    const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
    if (!confirmed) return;

    // 1. Save to persistent deleted storage
    saveDeletedCritId(id);

    // 2. Optimistically remove from state immediately
    setCriteria(prev => prev.filter(c => c.id !== id));
    showNotification('تم حذف المعيار نهائياً بنجاح.');

    // 3. Send DELETE to server
    try {
      await fetch(`/api/criteria?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.error('Delete criterion server call error:', err);
    }
  };

  // Delete Submission Permanently
  const handleDeleteSubmission = async (id: string, teamName: string) => {
    const confirmMsg = `هل أنت متأكد من حذف تسليم فريق "${teamName}" نهائياً؟`;
    const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
    if (!confirmed) return;

    saveDeletedSubId(id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
    setEvaluations(prev => prev.filter(e => e.submissionId !== id));
    showNotification('تم حذف التسليم وتقييماته بنجاح');

    try {
      await fetch(`/api/submissions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.error('Delete submission server call error:', err);
    }
  };

  // Reset database
  const handleResetDatabase = async () => {
    if (!confirm('تحذير: هل أنت متأكد من تصفير كافة البيانات والبدء بحالة فارغة نظيفة تماماً؟')) {
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hackathon_deleted_crit_ids');
        localStorage.removeItem('hackathon_deleted_user_ids');
        localStorage.removeItem('hackathon_deleted_sub_ids');
      }
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
      {/* Top Banner with Submission Toggle and Sync button */}
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <span className="badge badge-emerald">لوحة تحكم الادمن</span>
            <span className="badge" style={{ background: '#E2E8F0', color: '#1E293B', fontSize: '0.75rem' }}>
              تخزين دائم وفوري
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 900, color: 'var(--primary)', marginBottom: '4px' }}>
            GREENOVATE HACKATHON
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>
            إدارة الحسابات والمعايير، التحكم بفتح وإغلاق التسليم، ومتابعة التقييمات
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={() => loadAllData(true)}
            className="btn btn-outline"
            disabled={isRefreshing || loading}
            style={{ fontWeight: 700, padding: '9px 16px' }}
            title="إعادة جلب ومطابقة أحدث البيانات المحفوظة في السيرفر"
          >
            {isRefreshing ? 'جار التحديث...' : 'تحديث البيانات الآن'}
          </button>

          {/* Submission Toggle */}
          <div style={{
            background: 'var(--bg-body)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>بوابة التسليم:</div>
              <div style={{
                fontWeight: 800,
                fontSize: '0.92rem',
                color: settings.isSubmissionOpen ? 'var(--primary)' : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className={`status-dot ${settings.isSubmissionOpen ? 'green' : 'red'}`}></span>
                {settings.isSubmissionOpen ? 'مفتوحة للفرق' : 'مغلقة'}
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleToggleSubmission}
              className={`btn btn-sm ${settings.isSubmissionOpen ? 'btn-danger' : 'btn-primary'}`}
              style={{ fontWeight: 700 }}
            >
              {settings.isSubmissionOpen ? 'إغلاق التسليم' : 'فتح التسليم'}
            </button>
          </div>
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
          المشاريع المسلمة والتقييمات ({submissions.length})
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          الحسابات والمستخدمين ({usersList.length})
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

          {/* Submissions List */}
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
                        حذف التسليم نهائياً
                      </button>
                    </div>

                    {sub.summary && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-main)' }}>نبذة: </strong> {sub.summary}
                      </p>
                    )}

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

      {/* TAB 2: Accounts Management */}
      {activeTab === 'users' && (
        <div>
          {/* Edit User Form (when active) */}
          {editingUserId && (
            <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="card-title" style={{ margin: 0, color: 'var(--primary)' }}>
                  تعديل بيانات الحساب
                </h2>
                <button type="button" onClick={handleCancelEditUser} className="btn btn-outline btn-sm">
                  إلغاء التعديل
                </button>
              </div>

              <form onSubmit={handleSaveEditUser}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">الاسم الكامل / اسم الفريق أو الحكم *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editUserName} 
                      onChange={e => setEditUserName(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع الحساب (الدور) *</label>
                    <select 
                      className="form-select"
                      value={editUserRole}
                      onChange={e => setEditUserRole(e.target.value as any)}
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
                      value={editUserEmail} 
                      onChange={e => setEditUserEmail(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">كلمة المرور *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editUserPassword} 
                      onChange={e => setEditUserPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isUpdatingUser}
                    style={{ minWidth: '160px', height: '42px', fontWeight: 700 }}
                  >
                    {isUpdatingUser ? 'جار الحفظ...' : 'حفظ التعديلات نهائياً'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelEditUser}
                    className="btn btn-outline"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create User Form */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إنشاء حساب رسمي جديد (يُحفظ دائماً)</h2>
            <p className="card-subtitle">
              حسابات الفرق ولجنة التحكيم تصدر حصرياً من هنا وتخزن دائماً وبشكل نهائي في قاعدة البيانات
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
                {isCreatingUser ? 'جار الحفظ...' : 'إنشاء وحفظ الحساب نهائياً'}
              </button>
            </form>
          </div>

          {/* Users Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>
                  قائمة الحسابات المعتمدة ({usersList.length})
                </h2>
                <p className="card-subtitle" style={{ margin: 0, marginTop: '4px' }}>
                  جميع الحسابات المخزنة بشكل دائم، يمكن تعديلها أو حذفها نهائياً
                </p>
              </div>

              <button 
                type="button" 
                onClick={() => loadAllData(true)} 
                className="btn btn-outline btn-sm"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'جار التحديث...' : 'تحديث القائمة'}
              </button>
            </div>

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
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            type="button" 
                            onClick={() => handleStartEditUser(u)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 12px', fontWeight: 700 }}
                          >
                            تعديل
                          </button>

                          {u.id !== 'admin-1' ? (
                            <button 
                              type="button" 
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '5px 12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              حذف نهائي
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', alignSelf: 'center' }}>رئيسي</span>
                          )}
                        </div>
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
          {/* Edit Criterion Form (when active) */}
          {editingCritId && (
            <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="card-title" style={{ margin: 0, color: 'var(--primary)' }}>
                  تعديل معيار التحكيم
                </h2>
                <button type="button" onClick={handleCancelEditCrit} className="btn btn-outline btn-sm">
                  إلغاء التعديل
                </button>
              </div>

              <form onSubmit={handleSaveEditCrit}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">اسم المعيار *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editCritName} 
                      onChange={e => setEditCritName(e.target.value)} 
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
                      value={editCritMaxScore} 
                      onChange={e => setEditCritMaxScore(Number(e.target.value))} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">إرشادات وتوجيهات للحكم حول هذا المعيار</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editCritDesc} 
                    onChange={e => setEditCritDesc(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isUpdatingCrit}
                    style={{ minWidth: '160px', height: '42px', fontWeight: 700 }}
                  >
                    {isUpdatingCrit ? 'جار الحفظ...' : 'حفظ تعديلات المعيار'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelEditCrit}
                    className="btn btn-outline"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create Criterion Form */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إضافة معيار تحكيم جديد (يُحفظ دائماً)</h2>
            <p className="card-subtitle">
              هذه المعايير تظهر للحكام في صفحتهم لتقييم المشاريع وتُحفظ دائماً وبشكل نهائي في قاعدة البيانات
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

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isCreatingCrit}
                style={{ minWidth: '160px', height: '44px', fontWeight: 700 }}
              >
                {isCreatingCrit ? 'جار الإضافة...' : 'إضافة وحفظ المعيار'}
              </button>
            </form>
          </div>

          {/* Criteria List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>
                  معايير التحكيم المعتمدة ({criteria.length})
                </h2>
                <p className="card-subtitle" style={{ margin: 0, marginTop: '4px' }}>
                  إجمالي درجات التقييم القصوى: <strong>{maxTotalScore} نقطة</strong>
                </p>
              </div>

              <button 
                type="button" 
                onClick={() => loadAllData(true)} 
                className="btn btn-outline btn-sm"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'جار التحديث...' : 'تحديث القائمة'}
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم المعيار</th>
                    <th>الوصف والإرشادات</th>
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            type="button" 
                            onClick={() => handleStartEditCrit(crit)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 12px', fontWeight: 700 }}
                          >
                            تعديل
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteCriterion(crit.id, crit.name)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '5px 12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            حذف نهائي
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {criteria.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                        لا توجد معايير تحكيم حالياً. أضف معياراً من النموذج أعلاه.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Reset Database Button */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                تصفير البيانات يعيد النظام لحالة نظيفة خالية تماماً مع الحفاظ على حساب الادمن
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
