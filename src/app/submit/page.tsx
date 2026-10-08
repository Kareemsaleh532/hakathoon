'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Challenge, Submission, Team } from '@/types';

function SubmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChallengeId = searchParams.get('challengeId') || '';
  const { user } = useAuth();

  const [isSubmissionOpen, setIsSubmissionOpen] = useState<boolean | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  // Form fields
  const [challengeId, setChallengeId] = useState(preselectedChallengeId);
  const [projectTitle, setProjectTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [environmentalImpact, setEnvironmentalImpact] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');

  // Status & messages
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, challengesRes, teamsRes, subsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/challenges'),
        fetch('/api/teams'),
        fetch('/api/submissions')
      ]);

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setIsSubmissionOpen(settings.isSubmissionOpen);
      }

      if (challengesRes.ok) {
        const chList = await challengesRes.json();
        setChallenges(chList);
        if (!challengeId && chList.length > 0) {
          setChallengeId(chList[0].id);
        }
      }

      if (teamsRes.ok && user && user.teamId) {
        const tList: Team[] = await teamsRes.json();
        const userTeam = tList.find(t => t.id === user.teamId);
        if (userTeam) {
          setMyTeam(userTeam);
        }
      }

      if (subsRes.ok && user && user.teamId) {
        const subs: Submission[] = await subsRes.json();
        const found = subs.find(s => s.teamId === user.teamId);
        if (found) {
          setExistingSubmission(found);
          setProjectTitle(found.projectTitle);
          setChallengeId(found.challengeId);
          setSummary(found.summary);
          setEnvironmentalImpact(found.environmentalImpact);
          setDemoUrl(found.demoUrl || '');
          setRepoUrl(found.repoUrl || '');
          setPresentationUrl(found.presentationUrl || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!user || user.role !== 'participant') {
      setNotification({ text: 'التسليم متاح فقط للمتسابقين المسجلين', type: 'error' });
      return;
    }

    if (!user.teamId) {
      setNotification({ text: 'يجب أن تكون منضماً إلى فريق لتسليم المشروع', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          challengeId,
          projectTitle,
          summary,
          environmentalImpact,
          demoUrl,
          repoUrl,
          presentationUrl,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ text: data.error || 'فشل تسليم المشروع', type: 'error' });
      } else {
        setExistingSubmission(data);
        setNotification({ text: 'تم تسليم المشروع بنجاح باسم فريقك!', type: 'success' });
      }
    } catch {
      setNotification({ text: 'تعذر الاتصال بالخادم', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-dim)' }}>
        جار التحقق من بيانات التسليم...
      </div>
    );
  }

  // 1. If not logged in as a participant
  if (!user || user.role !== 'participant') {
    return (
      <div className="container" style={{ maxWidth: '600px', paddingTop: '60px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>
            صفحة التسليم مخصصة للمتسابقين فقط
          </h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>
            يرجى تسجيل الدخول بحساب متسابق منضم لفريق لتتمكن من تسليم مشروع فريقك.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link href="/" className="btn btn-primary">
              تسجيل الدخول كمتسابق
            </Link>
            <Link href="/challenges" className="btn btn-outline">
              صفحة التحديات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. If submission is closed by admin
  if (!isSubmissionOpen) {
    return (
      <div className="container" style={{ maxWidth: '700px', paddingTop: '60px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span className="badge badge-amber" style={{ padding: '6px 14px' }}>
              بوابة التسليم مغلقة حالياً من قبل الادمن
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '14px', color: '#f8fafc' }}>
            التسليم غير متاح حالياً
          </h1>

          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '24px', maxWidth: '540px', margin: '0 auto 24px' }}>
            صفحة التسليم لا تفتح إلا عند تفعيلها رسمياً من قِبل إدارة الهاكاثون. يمكنك استكمال تجهيز روابط المشروع والكود مع فريقك حتى يتم فتح البوابة.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/challenges" className="btn btn-secondary">
              صفحة التحديات
            </Link>
            <Link href="/participants" className="btn btn-outline">
              صفحة فريقي
            </Link>
            <button onClick={fetchData} className="btn btn-primary">
              إعادة التحقق من الحالة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Open and participant logged in
  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '30px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>
          بوابة التسليم مفتوحة
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
          تسليم المشروع النهائي للفريق
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          سيتم ربط هذا التسليم تلقائياً بفريقك المسجل وسيظهر للجنة التحكيم وصفحة الادمن
        </p>
      </div>

      {notification && (
        <div className={`alert ${notification.type === 'success' ? 'alert-info' : 'alert-danger'}`}>
          <span>{notification.text}</span>
        </div>
      )}

      <div className="card">
        {/* Team auto-association banner */}
        <div style={{
          padding: '14px 18px',
          background: 'var(--bg-input)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>فريقك المسجل تلقائياً:</div>
            <strong style={{ fontSize: '1.1rem', color: '#22c55e' }}>
              {myTeam ? myTeam.name : 'فريقك المعتمد'}
            </strong>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>المتسابق المسلِّم:</div>
            <strong style={{ color: '#f8fafc' }}>{user.name}</strong>
          </div>
        </div>

        {existingSubmission && (
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            <span>يوجد تسليم سابق محفوظ لفريقك. يمكنك تحديث البيانات وحفظ التعديلات أدناه.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Challenge Selection */}
          <div className="form-group">
            <label className="form-label">التحدي البيئي المرتبط بالمشروع *</label>
            <select 
              className="form-select"
              value={challengeId}
              onChange={e => setChallengeId(e.target.value)}
              required
            >
              {challenges.map(ch => (
                <option key={ch.id} value={ch.id}>
                  [{ch.track}] {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Project Title */}
          <div className="form-group">
            <label className="form-label">اسم المشروع *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="مثال: نظام الري الذكي بالاستشعار"
              value={projectTitle} 
              onChange={e => setProjectTitle(e.target.value)} 
              required 
            />
          </div>

          {/* Summary */}
          <div className="form-group">
            <label className="form-label">ملخص الحل التقني والبرمجي *</label>
            <textarea 
              className="form-textarea" 
              placeholder="اشرح فكرة الحل وكيف يعالج المشكلة البيئية والتقنيات المستخدمة..."
              value={summary} 
              onChange={e => setSummary(e.target.value)} 
              required 
            />
          </div>

          {/* Environmental Impact */}
          <div className="form-group">
            <label className="form-label">الأثر البيئي والمناخي المتوقع *</label>
            <textarea 
              className="form-textarea" 
              placeholder="نسبة تقليل الانبعاثات، كمية المياه الموفرة، الاستدامة..."
              value={environmentalImpact} 
              onChange={e => setEnvironmentalImpact(e.target.value)} 
              required 
            />
          </div>

          {/* Links */}
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">رابط النموذج (Demo URL)</label>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://..."
                value={demoUrl} 
                onChange={e => setDemoUrl(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">رابط مستودع الكود (GitHub)</label>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://github.com/..."
                value={repoUrl} 
                onChange={e => setRepoUrl(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">رابط العرض التقديمي</label>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://..."
                value={presentationUrl} 
                onChange={e => setPresentationUrl(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جار التسليم...' : existingSubmission ? 'تحديث تسليم المشروع' : 'تسليم المشروع الآن'}
            </button>
            <Link href="/participants" className="btn btn-outline">
              العودة لصفحة فريقي
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SubmissionPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>جار التحميل...</div>}>
      <SubmissionContent />
    </Suspense>
  );
}
