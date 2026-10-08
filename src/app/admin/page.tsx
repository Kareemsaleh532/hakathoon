'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Team, Challenge, Criterion, Submission, Evaluation, User, AppSettings } from '@/types';

export default function AdminPage() {
  const { user, login } = useAuth();
  
  // Auth state
  const [adminEmail, setAdminEmail] = useState('admin@hackathon.com');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'settings' | 'teams' | 'challenges' | 'criteria' | 'judges' | 'submissions' | 'participants'>('settings');

  // Data states
  const [settings, setSettings] = useState<AppSettings>({ isSubmissionOpen: false });
  const [teams, setTeams] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [judges, setJudges] = useState<User[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  // New Team form
  const [newTeam, setNewTeam] = useState({ name: '', description: '', maxMembers: 4, track: 'البيئة العامة والاستدامة' });
  // New Challenge form (No difficulty!)
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    track: 'الطاقة النظيفة وخفض الانبعاثات',
    description: '',
    targetImpact: '',
    deliverables: '',
  });
  // New Criterion form
  const [newCriterion, setNewCriterion] = useState({ name: '', description: '', maxScore: 25, weight: 25 });
  // New Judge form
  const [newJudge, setNewJudge] = useState({ name: '', email: '', password: '', specialty: 'محكم بيئي وتقني' });

  // Load data
  const loadAllData = async () => {
    try {
      const [settingsRes, teamsRes, challengesRes, criteriaRes, judgesRes, subsRes, evalsRes, partsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/teams'),
        fetch('/api/challenges'),
        fetch('/api/criteria'),
        fetch('/api/judges'),
        fetch('/api/submissions'),
        fetch('/api/evaluations'),
        fetch('/api/participants')
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (challengesRes.ok) setChallenges(await challengesRes.json());
      if (criteriaRes.ok) setCriteria(await criteriaRes.json());
      if (judgesRes.ok) setJudges(await judgesRes.json());
      if (subsRes.ok) setSubmissions(await subsRes.json());
      if (evalsRes.ok) setEvaluations(await evalsRes.json());
      if (partsRes.ok) setParticipants(await partsRes.json());
    } catch (err) {
      console.error(err);
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
        setAuthError(data.error || 'فشل تسجيل الدخول');
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
        showNotification(updatedStatus ? 'تم فتح بوابة التسليم لجميع المشاركين بنجاح' : 'تم إغلاق بوابة التسليم أمام المشاركين');
      }
    } catch {
      showNotification('فشل تعديل حالة التسليم', 'error');
    }
  };

  // Reset database ("تصفير البيانات")
  const handleResetDatabase = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في تصفير البيانات وإعادتها للحالة النظيفة الافتراضية؟')) {
      return;
    }
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await loadAllData();
        showNotification('تم تصفير البيانات بنجاح وإعادتها للوضع الافتراضي');
      } else {
        showNotification('فشل تصفير البيانات', 'error');
      }
    } catch {
      showNotification('تعذر الاتصال', 'error');
    }
  };

  // Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });
      if (res.ok) {
        setNewTeam({ name: '', description: '', maxMembers: 4, track: 'البيئة العامة والاستدامة' });
        loadAllData();
        showNotification('تمت إضافة الفريق بنجاح، وسيظهر للمتسابقين عند التسجيل');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في إضافة الفريق', 'error');
      }
    } catch {
      showNotification('تعذر الاتصال', 'error');
    }
  };

  // Delete Team
  const handleDeleteTeam = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفريق؟')) return;
    try {
      const res = await fetch(`/api/teams?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
        showNotification('تم حذف الفريق بنجاح');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // Create Challenge (No difficulty)
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChallenge)
      });
      if (res.ok) {
        setNewChallenge({
          title: '',
          track: 'الطاقة النظيفة وخفض الانبعاثات',
          description: '',
          targetImpact: '',
          deliverables: '',
        });
        loadAllData();
        showNotification('تمت إضافة التحدي البيئي بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في إضافة التحدي', 'error');
      }
    } catch {
      showNotification('تعذر الاتصال', 'error');
    }
  };

  // Delete Challenge
  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التحدي؟')) return;
    try {
      const res = await fetch(`/api/challenges?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
        showNotification('تم حذف التحدي');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // Create Criterion
  const handleCreateCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCriterion)
      });
      if (res.ok) {
        setNewCriterion({ name: '', description: '', maxScore: 25, weight: 25 });
        loadAllData();
        showNotification('تمت إضافة معيار التحكيم بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في إضافة المعيار', 'error');
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
        loadAllData();
        showNotification('تم حذف المعيار');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // Create Judge
  const handleCreateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJudge)
      });
      if (res.ok) {
        setNewJudge({ name: '', email: '', password: '', specialty: 'محكم بيئي وتقني' });
        loadAllData();
        showNotification('تم إنشاء حساب الحكم بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في إنشاء حساب الحكم', 'error');
      }
    } catch {
      showNotification('تعذر الاتصال', 'error');
    }
  };

  // Delete Judge
  const handleDeleteJudge = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحكم؟ سيتم حذف تقييماته أيضاً.')) return;
    try {
      const res = await fetch(`/api/judges?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
        showNotification('تم حذف حساب الحكم بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في حذف الحكم', 'error');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // Delete Participant
  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف حساب هذا المتسابق؟')) return;
    try {
      const res = await fetch(`/api/participants?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
        showNotification('تم حذف حساب المتسابق بنجاح');
      } else {
        const err = await res.json();
        showNotification(err.error || 'خطأ في حذف المتسابق', 'error');
      }
    } catch {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // If not logged in as Admin, show login form
  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ maxWidth: '480px', paddingTop: '60px' }}>
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 className="card-title" style={{ fontSize: '1.5rem' }}>تسجيل دخول الادمن</h1>
            <p className="card-subtitle">
              يرجى إدخال بيانات حساب مدير الهاكاثون للوصول إلى لوحة الإدارة
            </p>
          </div>

          {authError && (
            <div className="alert alert-danger">
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني للادمن</label>
              <input 
                type="email" 
                className="form-control" 
                value={adminEmail} 
                onChange={e => setAdminEmail(e.target.value)} 
                required 
              />
              <span className="form-hint">البريد الافتراضي: admin@hackathon.com</span>
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input 
                type="password" 
                className="form-control" 
                value={adminPassword} 
                onChange={e => setAdminPassword(e.target.value)} 
                required 
              />
              <span className="form-hint">كلمة المرور الافتراضية: admin</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'جار التحقق...' : 'دخول لوحة الادمن'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="container" style={{ paddingTop: '30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>
            صفحة الادمن - إدارة الهاكاثون
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            إدارة الفرق، التحديات، معايير التحكيم، وبوابة التسليم
          </p>
        </div>

        {/* Quick Portal Switch Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          padding: '10px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>بوابة تسليم المشاريع:</div>
            <div style={{ fontWeight: 700, color: settings.isSubmissionOpen ? '#22c55e' : '#f87171' }}>
              {settings.isSubmissionOpen ? 'مفتوحة الآن' : 'مغلقة'}
            </div>
          </div>
          <button 
            onClick={handleToggleSubmission} 
            className={`btn btn-sm ${settings.isSubmissionOpen ? 'btn-danger' : 'btn-primary'}`}
          >
            {settings.isSubmissionOpen ? 'إغلاق البوابة' : 'فتح البوابة للمتسابقين'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-info' : 'alert-danger'}`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-header">
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          التحكم والإحصاءات
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          إدارة الفرق ({teams.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenges')}
        >
          إدارة التحديات ({challenges.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'criteria' ? 'active' : ''}`}
          onClick={() => setActiveTab('criteria')}
        >
          معايير التحكيم ({criteria.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'judges' ? 'active' : ''}`}
          onClick={() => setActiveTab('judges')}
        >
          حسابات الحكام ({judges.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          حسابات المتسابقين ({participants.length})
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          المشاريع المسلمة والتقييمات ({submissions.length})
        </button>
      </div>

      {/* TAB 1: General Settings & Status */}
      {activeTab === 'settings' && (
        <div className="grid-2">
          <div className="card">
            <h2 className="card-title">التحكم في بوابة التسليم للمشاركين</h2>
            <p className="card-subtitle">
              صفحة التسليم لا تفتح للمتسابقين إلا بقرار من الادمن.
            </p>
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`status-dot ${settings.isSubmissionOpen ? 'green' : 'red'}`}></span>
                <span style={{ fontWeight: 700 }}>
                  الحالة: {settings.isSubmissionOpen ? 'مفتوحة (يمكن للمشاركين التسليم)' : 'مغلقة (محجوبة عن المتسابقين)'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                عند فتح البوابة، يمكن للمتسابق تسليم حل فريقه وروابط الـ Demo والكود وشرح الأثر البيئي.
              </p>
            </div>
            <button 
              onClick={handleToggleSubmission}
              className={`btn ${settings.isSubmissionOpen ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%', marginBottom: '14px' }}
            >
              {settings.isSubmissionOpen ? 'إغلاق بوابة التسليم الآن' : 'فتح بوابة التسليم الآن'}
            </button>

            {/* Reset Database Button ("تصفير البيانات") */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                onClick={handleResetDatabase}
                className="btn btn-outline btn-sm"
                style={{ width: '100%', color: '#f87171' }}
              >
                تصفير البيانات وإعادة التعيين الافتراضي
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">إحصائيات النظام</h2>
            <p className="card-subtitle">ملخص الأنشطة الحالية في الهاكاثون</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <span>إجمالي الفرق:</span>
                <strong style={{ color: '#22c55e' }}>{teams.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <span>التحديات البيئية النشطة:</span>
                <strong style={{ color: '#22c55e' }}>{challenges.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <span>معايير التحكيم:</span>
                <strong style={{ color: '#22c55e' }}>{criteria.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <span>المشاريع المسلمة:</span>
                <strong style={{ color: '#22c55e' }}>{submissions.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <span>الحكام المعتمدون:</span>
                <strong style={{ color: '#22c55e' }}>{judges.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Manage Teams */}
      {activeTab === 'teams' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إدخال فريق جديد</h2>
            <p className="card-subtitle">
              المتسابق عند تسجيله سيختار فريقه من بين الفرق التي تقوم بإضافتها هنا.
            </p>
            <form onSubmit={handleCreateTeam}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">اسم الفريق</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: فريق الاستدامة الخضراء"
                    value={newTeam.name} 
                    onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">المسار البيئي</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: خفض الانبعاثات، المياه، الطاقة النظيفة"
                    value={newTeam.track} 
                    onChange={e => setNewTeam({ ...newTeam, track: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">الحد الأقصى للأعضاء</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    className="form-control" 
                    value={newTeam.maxMembers} 
                    onChange={e => setNewTeam({ ...newTeam, maxMembers: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">وصف الفريق</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="وصف مجال عمل الفريق"
                    value={newTeam.description} 
                    onChange={e => setNewTeam({ ...newTeam, description: e.target.value })} 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                إضافة الفريق
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">الفرق المعتمدة ({teams.length})</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم الفريق</th>
                    <th>المسار</th>
                    <th>الوصف</th>
                    <th>الأعضاء المسجلون</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(team => (
                    <tr key={team.id}>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>{team.name}</td>
                      <td><span className="badge badge-emerald">{team.track || 'عام'}</span></td>
                      <td style={{ fontSize: '0.86rem', color: 'var(--text-dim)', maxWidth: '280px' }}>
                        {team.description || '-'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {team.membersCount || 0} / {team.maxMembers}
                        </span>
                        {team.members && team.members.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {team.members.map((m: any) => m.name).join('، ')}
                          </div>
                        )}
                      </td>
                      <td>
                        {(team.membersCount || 0) >= team.maxMembers ? (
                          <span className="badge badge-amber">مكتمل</span>
                        ) : (
                          <span className="badge badge-emerald">متاح</span>
                        )}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleDeleteTeam(team.id)}
                          className="btn btn-danger btn-sm"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                        لا توجد فرق مدخلة بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Manage Challenges (No difficulty field!) */}
      {activeTab === 'challenges' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إدخال تحدٍ بيئي جديد</h2>
            <p className="card-subtitle">
              جميع التحديات تكون بمستوى موحد ومتاحة لجميع الفرق
            </p>
            <form onSubmit={handleCreateChallenge}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">عنوان التحدي البيئي</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: رصد انبعاثات الكربون في المنشآت"
                    value={newChallenge.title} 
                    onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">المسار البيئي</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: الطاقة النظيفة، إدارة المياه، حماية البيئة"
                    value={newChallenge.track} 
                    onChange={e => setNewChallenge({ ...newChallenge, track: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">وصف المشكلة والتحدي</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="شرح المشكلة والمطلوب معالجته برمجياً..."
                  value={newChallenge.description} 
                  onChange={e => setNewChallenge({ ...newChallenge, description: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">الأثر البيئي المستهدف</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="مثال: خفض الانبعاثات بنسبة 20%، توفير المياه..."
                  value={newChallenge.targetImpact} 
                  onChange={e => setNewChallenge({ ...newChallenge, targetImpact: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">المخرجات المتوقعة (اكتب كل مخرج في سطر)</label>
                <textarea 
                  className="form-textarea" 
                  style={{ minHeight: '70px' }}
                  placeholder="نموذج أولي عامل
واجهة مستخدم تفاعلية
تقرير أثر بيئي"
                  value={newChallenge.deliverables} 
                  onChange={e => setNewChallenge({ ...newChallenge, deliverables: e.target.value })} 
                />
              </div>

              <button type="submit" className="btn btn-primary">
                حفظ ونشر التحدي
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">التحديات البيئية المدخلة ({challenges.length})</h2>
            <div className="grid-2">
              {challenges.map(ch => (
                <div key={ch.id} style={{
                  padding: '16px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span className="badge badge-emerald">{ch.track}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#f8fafc' }}>
                    {ch.title}
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', marginBottom: '10px', lineHeight: 1.6 }}>
                    {ch.description}
                  </p>
                  {ch.targetImpact && (
                    <div style={{ fontSize: '0.8rem', color: '#22c55e', marginBottom: '8px' }}>
                      الأثر: {ch.targetImpact}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button 
                      onClick={() => handleDeleteChallenge(ch.id)}
                      className="btn btn-danger btn-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Manage Criteria */}
      {activeTab === 'criteria' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إضافة معيار تحكيم</h2>
            <p className="card-subtitle">
              الحكام سيقومون بتقييم الفرق من خلال هذه المعايير
            </p>
            <form onSubmit={handleCreateCriterion}>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">اسم المعيار</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: الأثر البيئي والمناخي"
                    value={newCriterion.name} 
                    onChange={e => setNewCriterion({ ...newCriterion, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الدرجة القصوى</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    className="form-control" 
                    value={newCriterion.maxScore} 
                    onChange={e => setNewCriterion({ ...newCriterion, maxScore: Number(e.target.value), weight: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الوزن (%)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    className="form-control" 
                    value={newCriterion.weight} 
                    onChange={e => setNewCriterion({ ...newCriterion, weight: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">وصف المعيار وتوجيهات الحكم</label>
                <textarea 
                  className="form-textarea" 
                  style={{ minHeight: '60px' }}
                  placeholder="إرشادات التحكيم..."
                  value={newCriterion.description} 
                  onChange={e => setNewCriterion({ ...newCriterion, description: e.target.value })} 
                />
              </div>

              <button type="submit" className="btn btn-primary">
                إضافة المعيار
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">معايير التحكيم المعتمدة ({criteria.length})</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم المعيار</th>
                    <th>الوصف</th>
                    <th>الدرجة القصوى</th>
                    <th>الوزن</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map(crit => (
                    <tr key={crit.id}>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>{crit.name}</td>
                      <td style={{ fontSize: '0.86rem', color: 'var(--text-dim)', maxWidth: '350px' }}>
                        {crit.description || '-'}
                      </td>
                      <td style={{ fontWeight: 700 }}>{crit.maxScore} نقطة</td>
                      <td>{crit.weight}%</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteCriterion(crit.id)}
                          className="btn btn-danger btn-sm"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Manage Judges */}
      {activeTab === 'judges' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">إضافة حساب حكم جديد</h2>
            <p className="card-subtitle">
              حسابات الحكام لتقييم المشاريع وفق المعايير
            </p>
            <form onSubmit={handleCreateJudge}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">اسم الحكم</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: د. سامي الأحمد"
                    value={newJudge.name} 
                    onChange={e => setNewJudge({ ...newJudge, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">التخصص</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="مثال: خبير طاقة متجددة"
                    value={newJudge.specialty} 
                    onChange={e => setNewJudge({ ...newJudge, specialty: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="judge@hackathon.com"
                    value={newJudge.email} 
                    onChange={e => setNewJudge({ ...newJudge, email: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">كلمة المرور</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="كلمة مرور الدخول"
                    value={newJudge.password} 
                    onChange={e => setNewJudge({ ...newJudge, password: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                إنشاء حساب الحكم
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">قائمة الحكام المعتمدين ({judges.length})</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم الحكم</th>
                    <th>البريد الإلكتروني</th>
                    <th>التخصص</th>
                    <th>تاريخ التسجيل</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {judges.map(j => (
                    <tr key={j.id}>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>{j.name}</td>
                      <td>{j.email}</td>
                      <td><span className="badge badge-emerald">{j.specialty || 'محكم'}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {new Date(j.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleDeleteJudge(j.id)}
                          className="btn btn-danger btn-sm"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Submissions & Rankings */}
      {activeTab === 'submissions' && (
        <div className="card">
          <h2 className="card-title">المشاريع المسلمة وتقييمات الحكام</h2>
          <p className="card-subtitle">
            يظهر هنا اسم الفريق والمتسابق الذي قام بالتسليم مع تقييمات الحكام
          </p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الفريق</th>
                  <th>المتسابق المسلِّم</th>
                  <th>اسم المشروع</th>
                  <th>التحدي</th>
                  <th>الروابط</th>
                  <th>تقييمات الحكام</th>
                  <th>المتوسط</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => {
                  const teamEvals = evaluations.filter(e => e.submissionId === sub.id);
                  const avgScore = teamEvals.length > 0 
                    ? (teamEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / teamEvals.length).toFixed(1)
                    : 'لم يقيّم بعد';

                  return (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 700, color: '#22c55e' }}>{sub.teamName}</td>
                      <td style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                        {sub.submittedByUserName || 'عضو الفريق'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{sub.projectTitle}</td>
                      <td style={{ fontSize: '0.84rem' }}>{sub.challengeTitle}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {sub.demoUrl && (
                            <a href={sub.demoUrl} target="_blank" rel="noreferrer" className="badge badge-emerald">
                              النموذج
                            </a>
                          )}
                          {sub.repoUrl && (
                            <a href={sub.repoUrl} target="_blank" rel="noreferrer" className="badge badge-blue">
                              الكود
                            </a>
                          )}
                          {sub.presentationUrl && (
                            <a href={sub.presentationUrl} target="_blank" rel="noreferrer" className="badge badge-amber">
                              العرض
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        {teamEvals.length > 0 ? (
                          <div>
                            {teamEvals.map(ev => (
                              <div key={ev.id} style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                {ev.judgeName}: <strong style={{ color: '#22c55e' }}>{ev.totalScore} نقطة</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="badge badge-amber">بانتظار التحكيم</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 800, color: '#22c55e', fontSize: '1rem' }}>
                        {avgScore}
                      </td>
                    </tr>
                  );
                })}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                      لم يقم أي فريق بتسليم مشروعه حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: Manage Participants */}
      {activeTab === 'participants' && (
        <div className="card">
          <h2 className="card-title">قائمة المتسابقين المسجلين ({participants.length})</h2>
          <p className="card-subtitle">
            عرض وتعديل حسابات المتسابقين والفرق المنضمين إليها
          </p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم المتسابق</th>
                  <th>البريد الإلكتروني</th>
                  <th>الفريق</th>
                  <th>التخصص / الدور</th>
                  <th>رقم الهاتف</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>{p.name}</td>
                    <td>{p.email}</td>
                    <td>
                      <span className="badge badge-emerald">{p.teamName || 'بدون فريق'}</span>
                    </td>
                    <td style={{ color: 'var(--text-dim)' }}>{p.specialty || '-'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{p.phone || '-'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDeleteParticipant(p.id)}
                        className="btn btn-danger btn-sm"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                      لا يوجد متسابقون مسجلون حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
