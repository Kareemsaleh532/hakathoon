'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Criterion, Submission, Evaluation } from '@/types';

export default function JudgePage() {
  const { user, login } = useAuth();

  // Judge Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Scores dictionary per submission: submissionId -> { criterionId: score }
  const [scoresMap, setScoresMap] = useState<Record<string, Record<string, number>>>({});
  // Feedback dictionary: submissionId -> feedback string
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  // Saving states
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Record<string, { text: string; type: 'success' | 'error' }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [critRes, subsRes, evalsRes] = await Promise.all([
        fetch('/api/criteria'),
        fetch('/api/submissions'),
        fetch('/api/evaluations')
      ]);

      const critData: Criterion[] = critRes.ok ? await critRes.json() : [];
      const subsData: Submission[] = subsRes.ok ? await subsRes.json() : [];
      const evalsData: Evaluation[] = evalsRes.ok ? await evalsRes.json() : [];

      setCriteria(critData);
      setSubmissions(subsData);
      setEvaluations(evalsData);

      if (user) {
        const initialScores: Record<string, Record<string, number>> = {};
        const initialFeedback: Record<string, string> = {};

        subsData.forEach(sub => {
          const myEval = evalsData.find(e => e.submissionId === sub.id && e.judgeId === user.id);
          if (myEval) {
            initialScores[sub.id] = { ...myEval.scores };
            initialFeedback[sub.id] = myEval.feedback || '';
          } else {
            const emptyScores: Record<string, number> = {};
            critData.forEach(c => {
              emptyScores[c.id] = 0;
            });
            initialScores[sub.id] = emptyScores;
            initialFeedback[sub.id] = '';
          }
        });

        setScoresMap(initialScores);
        setFeedbackMap(initialFeedback);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Login
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
        setAuthError(data.error || 'بيانات الدخول غير صحيحة');
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

  // Handle Score Input Change
  const handleScoreChange = (submissionId: string, criterionId: string, value: number, maxScore: number) => {
    const clamped = Math.max(0, Math.min(maxScore, value || 0));
    setScoresMap(prev => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [criterionId]: clamped
      }
    }));
  };

  // Handle Save Evaluation
  const handleSaveEvaluation = async (submission: Submission) => {
    if (!user) return;
    setSavingId(submission.id);

    const projectScores = scoresMap[submission.id] || {};
    const projectFeedback = feedbackMap[submission.id] || '';

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          teamId: submission.teamId || submission.teamName,
          judgeId: user.id,
          judgeName: user.name,
          scores: projectScores,
          feedback: projectFeedback,
        })
      });

      if (res.ok) {
        const savedEval: Evaluation = await res.json();
        setEvaluations(prev => {
          const idx = prev.findIndex(e => e.id === savedEval.id || (e.submissionId === submission.id && e.judgeId === user.id));
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = savedEval;
            return next;
          }
          return [...prev, savedEval];
        });

        setNotifications(prev => ({
          ...prev,
          [submission.id]: { text: `تم حفظ تقييم فريق "${submission.teamName}" بنجاح`, type: 'success' }
        }));
      } else {
        const err = await res.json();
        setNotifications(prev => ({
          ...prev,
          [submission.id]: { text: err.error || 'فشل حفظ التقييم', type: 'error' }
        }));
      }
    } catch {
      setNotifications(prev => ({
        ...prev,
        [submission.id]: { text: 'تعذر الاتصال بالخادم', type: 'error' }
      }));
    } finally {
      setSavingId(null);
    }
  };

  const maxPossibleTotal = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

  // If not logged in as Judge or Admin, show Judge Login Form (Zero Icons)
  if (!user || (user.role !== 'judge' && user.role !== 'admin')) {
    return (
      <div className="container" style={{ maxWidth: '460px', paddingTop: '60px' }}>
        <div className="card" style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>دخول لجنة التحكيم</h1>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '4px' }}>
              GREENOVATE HACKATHON
            </div>
            <p className="card-subtitle">
              يرجى تسجيل الدخول بحساب الحكم المعتمد لتقييم المشاريع المسلمة
            </p>
          </div>

          {authError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني للحكم</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="judge@hackathon.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '12px', height: '46px', fontWeight: 700 }}
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
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>لجنة التحكيم</span>
          <h1 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.9rem)', fontWeight: 900, color: 'var(--primary)' }}>
            تقييم مشاريع GREENOVATE
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            المحكّم: <strong style={{ color: 'var(--primary)' }}>{user.name}</strong> | أدخل الدرجة بجانب كل معيار لكل مشروع لحفظ التقييم
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          padding: '8px 16px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>المشاريع المسلمة:</div>
            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{submissions.length}</strong>
          </div>
          <div style={{ height: '24px', width: '1.5px', background: 'var(--border-color)' }}></div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>الدرجة القصوى:</div>
            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{maxPossibleTotal} نقطة</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          جار تحميل المشاريع المسلمة...
        </div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--primary)' }}>
            لا توجد مشاريع مسلّمة للتحكيم حتى الآن
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto' }}>
            عندما تقوم الفرق بتسليم مشاريعها، ستظهر هنا فوراً لتقييمها بناءً على المعايير المعتمدة.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {submissions.map((sub, index) => {
            const projectScores = scoresMap[sub.id] || {};
            const currentTotal = Object.values(projectScores).reduce((a, b) => a + Number(b || 0), 0);
            const myExistingEval = evaluations.find(e => e.submissionId === sub.id && e.judgeId === user.id);
            const notif = notifications[sub.id];

            return (
              <div key={sub.id} className="card" style={{ padding: '24px', position: 'relative' }}>
                {/* Project Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span className="num-pill">{index + 1}</span>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {sub.projectTitle}
                      </h2>
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
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        تاريخ التسليم: {new Date(sub.submittedAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>

                  {/* Existing Status Badge */}
                  <div>
                    {myExistingEval ? (
                      <span className="badge badge-emerald" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        تم التقييم ({myExistingEval.totalScore} / {maxPossibleTotal})
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        بانتظار تقييمك
                      </span>
                    )}
                  </div>
                </div>

                {/* Submitted Files & Links - Zero Icons */}
                <div style={{
                  background: 'var(--bg-body)',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--border-color)',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>
                      الملف والروابط المسلّمة:
                    </span>
                    
                    {sub.fileUrl && (
                      <a 
                        href={sub.fileUrl} 
                        download 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        تحميل الملف المسلّم ({sub.fileName || 'ملف المشروع'})
                      </a>
                    )}

                    {sub.fileLink && (
                      <a 
                        href={sub.fileLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        رابط الملف الخارجي
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

                    {!sub.fileUrl && !sub.fileLink && !sub.demoUrl && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>لم يتم إرفاق روابط</span>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {sub.summary && (
                  <div style={{ marginBottom: '18px', fontSize: '0.88rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text-main)' }}>نبذة عن المشروع: </strong>
                    {sub.summary}
                  </div>
                )}

                {/* Notification */}
                {notif && (
                  <div className={`alert ${notif.type === 'success' ? 'alert-info' : 'alert-danger'}`} style={{ marginBottom: '16px' }}>
                    <span>{notif.text}</span>
                  </div>
                )}

                {/* Scoring Criteria: Number input right next to each criterion */}
                <div style={{ marginTop: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
                    معايير التقييم (أدخل الدرجة بجانب كل معيار):
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {criteria.map(crit => {
                      const scoreValue = projectScores[crit.id] !== undefined ? projectScores[crit.id] : 0;

                      return (
                        <div 
                          key={crit.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'var(--bg-body)',
                            borderRadius: '6px',
                            border: '1.5px solid var(--border-color)',
                            gap: '14px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ flex: '1 1 300px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                              {crit.name}
                            </div>
                            {crit.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {crit.description}
                              </div>
                            )}
                          </div>

                          {/* Number Input next to the criterion */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="number"
                              min="0"
                              max={crit.maxScore}
                              value={scoreValue}
                              onChange={e => handleScoreChange(sub.id, crit.id, Number(e.target.value), crit.maxScore)}
                              className="form-control"
                              style={{
                                width: '85px',
                                textAlign: 'center',
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                color: 'var(--primary)',
                                height: '42px',
                                background: '#FFFFFF'
                              }}
                            />
                            <span style={{ fontSize: '0.88rem', color: 'var(--text-dim)', minWidth: '70px' }}>
                              / {crit.maxScore} نقطة
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback field */}
                  <div style={{ marginTop: '14px' }}>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="ملاحظات أو تعليق مختصر على المشروع (اختياري)..."
                      value={feedbackMap[sub.id] || ''}
                      onChange={e => setFeedbackMap({ ...feedbackMap, [sub.id]: e.target.value })}
                    />
                  </div>

                  {/* Bottom Bar: Total & Submit Button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.92rem', color: 'var(--text-dim)' }}>مجموع تقييمك للمشروع:</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                        {currentTotal} / {maxPossibleTotal} نقطة
                      </strong>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveEvaluation(sub)}
                      className="btn btn-primary"
                      style={{ minWidth: '150px', height: '42px', fontWeight: 700 }}
                      disabled={savingId === sub.id}
                    >
                      {savingId === sub.id ? 'جار الحفظ...' : myExistingEval ? 'تحديث التقييم' : 'حفظ التقييم'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
