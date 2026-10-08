'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Criterion, Submission, Evaluation, User } from '@/types';

export default function JudgePage() {
  const { user, login } = useAuth();

  // Judge Login states
  const [email, setEmail] = useState('judge@hackathon.com');
  const [password, setPassword] = useState('judge');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data states
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected submission for evaluation modal/form
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [critRes, subsRes, evalsRes] = await Promise.all([
        fetch('/api/criteria'),
        fetch('/api/submissions'),
        fetch('/api/evaluations')
      ]);

      if (critRes.ok) setCriteria(await critRes.json());
      if (subsRes.ok) setSubmissions(await subsRes.json());
      if (evalsRes.ok) setEvaluations(await evalsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'فشل تسجيل الدخول');
      } else {
        if (data.user.role !== 'judge' && data.user.role !== 'admin') {
          setAuthError('هذا الحساب ليس لديه صلاحيات التحكيم');
        } else {
          login(data.user);
          loadData();
        }
      }
    } catch {
      setAuthError('تعذر الاتصال بالخادم');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Open evaluation modal for a submission
  const handleOpenEvaluation = (sub: Submission) => {
    setSelectedSubmission(sub);
    const currentJudgeId = user?.id || '';
    const existing = evaluations.find(e => e.submissionId === sub.id && e.judgeId === currentJudgeId);

    if (existing) {
      setScores(existing.scores);
      setFeedback(existing.feedback);
    } else {
      const initial: Record<string, number> = {};
      criteria.forEach(c => {
        initial[c.id] = Math.round(c.maxScore * 0.8);
      });
      setScores(initial);
      setFeedback('');
    }
  };

  // Submit Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !user) return;

    setIsSubmittingEval(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          teamId: selectedSubmission.teamId,
          judgeId: user.id,
          judgeName: user.name,
          scores,
          feedback,
        })
      });

      if (res.ok) {
        setNotification({ text: `تم حفظ تقييم فريق "${selectedSubmission.teamName}" بنجاح!`, type: 'success' });
        setSelectedSubmission(null);
        loadData();
      } else {
        const err = await res.json();
        setNotification({ text: err.error || 'فشل حفظ التقييم', type: 'error' });
      }
    } catch {
      setNotification({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // Calculate current modal total
  const currentTotalScore = Object.values(scores).reduce((a, b) => a + Number(b || 0), 0);
  const maxPossibleTotal = criteria.reduce((a, b) => a + b.maxScore, 0);

  // If not logged in as Judge or Admin, show Judge Login Form
  if (!user || (user.role !== 'judge' && user.role !== 'admin')) {
    return (
      <div className="container" style={{ maxWidth: '480px', paddingTop: '50px' }}>
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 className="card-title" style={{ fontSize: '1.5rem' }}>تسجيل دخول الحكام</h1>
            <p className="card-subtitle">
              حسابات الحكام لتقييم الفرق وفق معايير الادمن
            </p>
          </div>

          {authError && (
            <div className="alert alert-danger">
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني للحكم</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
              <span className="form-hint">البريد الافتراضي: judge@hackathon.com</span>
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input 
                type="password" 
                className="form-control" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <span className="form-hint">كلمة المرور الافتراضية: judge</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'جار التحقق...' : 'دخول لوحة التحكيم'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>
            صفحة الحكام - تقييم مشاريع الفرق
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            المحكم: <strong style={{ color: '#22c55e' }}>{user.name}</strong> | التقييم وفق معايير الادمن المعتمدة
          </p>
        </div>

        <div className="badge badge-emerald" style={{ padding: '6px 12px' }}>
          معايير التحكيم: {criteria.length}
        </div>
      </div>

      {notification && (
        <div className={`alert ${notification.type === 'success' ? 'alert-info' : 'alert-danger'}`}>
          <span>{notification.text}</span>
        </div>
      )}

      {/* Criteria Info Banner */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 18px' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '8px', color: '#22c55e' }}>
          المعايير المحددة من صفحة الادمن:
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {criteria.map(c => (
            <div key={c.id} style={{
              background: 'var(--bg-input)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              border: '1px solid var(--border-color)'
            }}>
              <strong>{c.name}:</strong> <span style={{ color: '#22c55e' }}>{c.maxScore} نقطة</span>
            </div>
          ))}
          {criteria.length === 0 && (
            <div style={{ color: '#f87171', fontSize: '0.85rem' }}>
              تنبيه: لم يقم الادمن بإدخال معايير بعد.
            </div>
          )}
        </div>
      </div>

      {/* Submissions to Evaluate */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">المشاريع المتاحة للتقييم ({submissions.length})</h2>
        <p className="card-subtitle">يظهر اسم الفريق والمتسابق المسلم وروابط المشروع</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            جار تحميل المشاريع...
          </div>
        ) : submissions.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الفريق</th>
                  <th>المتسابق المسلِّم</th>
                  <th>اسم المشروع</th>
                  <th>التحدي</th>
                  <th>الروابط</th>
                  <th>تقييمك</th>
                  <th>إجراء التحكيم</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => {
                  const myEval = evaluations.find(e => e.submissionId === sub.id && e.judgeId === user.id);

                  return (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 700, color: '#22c55e' }}>{sub.teamName}</td>
                      <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {sub.submittedByUserName || 'عضو الفريق'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{sub.projectTitle}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{sub.challengeTitle}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
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
                        {myEval ? (
                          <span className="badge badge-emerald" style={{ fontWeight: 700 }}>
                            {myEval.totalScore} / {maxPossibleTotal}
                          </span>
                        ) : (
                          <span className="badge badge-amber">لم يقيّم</span>
                        )}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleOpenEvaluation(sub)} 
                          className={`btn btn-sm ${myEval ? 'btn-outline' : 'btn-primary'}`}
                        >
                          {myEval ? 'تعديل التقييم' : 'تقييم المشروع'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
            لا توجد مشاريع مسلمة حتى الآن من الفرق المشاركة.
          </div>
        )}
      </div>

      {/* Leaderboard / Overall Rankings */}
      <div className="card">
        <h2 className="card-title">لوحة الصدارة والترتيب العام</h2>
        <p className="card-subtitle">الترتيب التراكمي للفرق بناءً على تقييمات الحكام</p>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>الفريق</th>
                <th>المشروع</th>
                <th>عدد التقييمات</th>
                <th>المعدل الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {submissions
                .map(sub => {
                  const evals = evaluations.filter(e => e.submissionId === sub.id);
                  const avg = evals.length > 0 
                    ? evals.reduce((a, b) => a + b.totalScore, 0) / evals.length
                    : 0;
                  return { ...sub, evalsCount: evals.length, avg };
                })
                .sort((a, b) => b.avg - a.avg)
                .map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="num-pill">{index + 1}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#22c55e' }}>{item.teamName}</td>
                    <td>{item.projectTitle}</td>
                    <td>{item.evalsCount} تقييم</td>
                    <td style={{ fontWeight: 800, color: '#22c55e', fontSize: '1rem' }}>
                      {item.evalsCount > 0 ? `${item.avg.toFixed(1)} نقطة` : 'في الانتظار'}
                    </td>
                  </tr>
                ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                    لا توجد مشاريع لعرضها في لوحة الصدارة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVALUATION MODAL */}
      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="badge badge-emerald">تقييم مشروع</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                  {selectedSubmission.projectTitle}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#22c55e' }}>
                  الفريق: {selectedSubmission.teamName} | المسلِّم: {selectedSubmission.submittedByUserName || 'عضو الفريق'}
                </div>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="btn btn-outline btn-sm"
              >
                إغلاق
              </button>
            </div>

            {/* Project Overview */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#ffffff' }}>ملخص الحل:</strong> {selectedSubmission.summary}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#22c55e' }}>الأثر البيئي:</strong> {selectedSubmission.environmentalImpact}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {selectedSubmission.demoUrl && (
                  <a href={selectedSubmission.demoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                    رابط النموذج
                  </a>
                )}
                {selectedSubmission.repoUrl && (
                  <a href={selectedSubmission.repoUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                    مستودع الكود
                  </a>
                )}
              </div>
            </div>

            {/* Scoring Form Based on Admin Criteria */}
            <form onSubmit={handleSaveEvaluation}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: '#f8fafc' }}>
                إدخال الدرجات وفق معايير الادمن:
              </h4>

              {criteria.map(crit => {
                const currentScore = scores[crit.id] ?? 0;
                return (
                  <div key={crit.id} className="form-group" style={{
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                        {crit.name}
                      </label>
                      <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '0.9rem' }}>
                        {currentScore} / {crit.maxScore} نقطة
                      </span>
                    </div>

                    {crit.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                        {crit.description}
                      </p>
                    )}

                    <input 
                      type="range"
                      min="0"
                      max={crit.maxScore}
                      value={currentScore}
                      onChange={e => setScores({ ...scores, [crit.id]: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer' }}
                    />
                  </div>
                );
              })}

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label className="form-label">ملاحظات الحكم للفريق</label>
                <textarea 
                  className="form-textarea"
                  placeholder="ملاحظات وتوجيهات لتطوير المشروع..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>

              {/* Total Summary */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px'
              }}>
                <span style={{ fontWeight: 700 }}>المجموع الكلي للتقييم:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#22c55e' }}>
                  {currentTotalScore} / {maxPossibleTotal} نقطة
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={isSubmittingEval}
                >
                  {isSubmittingEval ? 'جار الحفظ...' : 'اعتماد وحفظ التقييم'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedSubmission(null)}
                  className="btn btn-outline"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
