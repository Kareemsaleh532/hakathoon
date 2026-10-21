'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Submission } from '@/types';

export default function SubmitPage() {
  const { user } = useAuth();

  const [isSubmissionOpen, setIsSubmissionOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileLink, setFileLink] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission state
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch status and existing submission
  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, subsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/submissions')
      ]);

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setIsSubmissionOpen(settings.isSubmissionOpen);
      }

      if (subsRes.ok && user) {
        const allSubs: Submission[] = await subsRes.json();
        const mySub = allSubs.find(
          s => s.submittedByUserId === user.id || 
               (user.name && s.teamName && s.teamName.trim().toLowerCase() === user.name.trim().toLowerCase())
        );

        if (mySub) {
          setExistingSubmission(mySub);
          setTeamName(mySub.teamName || '');
          setMembers(mySub.members || '');
          setProjectTitle(mySub.projectTitle || '');
          setSummary(mySub.summary || '');
          setFileUrl(mySub.fileUrl || '');
          setFileName(mySub.fileName || '');
          setFileSize(mySub.fileSize || 0);
          setFileLink(mySub.fileLink || '');
          setDemoUrl(mySub.demoUrl || '');
        } else {
          if (user.role === 'participant') {
            setTeamName(user.name || '');
          }
        }
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

  // Handle direct file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'فشل رفع الملف');
      } else {
        setFileUrl(data.url);
        setFileName(data.fileName);
        setFileSize(data.fileSize);
      }
    } catch {
      setUploadError('حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFileUrl('');
    setFileName('');
    setFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatBytes = (bytes: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Submit / Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ text: 'يجب تسجيل الدخول لتسليم المشروع', type: 'error' });
      return;
    }

    if (!teamName.trim() || !members.trim() || !projectTitle.trim()) {
      setMessage({ text: 'يرجى كتابة اسم التيم، وأسماء الأعضاء، واسم المشروع', type: 'error' });
      return;
    }

    if (!fileUrl && !fileLink.trim() && !demoUrl.trim()) {
      setMessage({ text: 'يرجى تسليم الملف المطلوب (برفع ملف أو وضع رابط الملف)', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          teamName,
          members,
          projectTitle,
          summary,
          fileUrl,
          fileName,
          fileSize,
          fileLink,
          demoUrl,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'فشل تسليم المشروع', type: 'error' });
      } else {
        setExistingSubmission(data);
        setMessage({
          text: existingSubmission ? 'تم تحديث وحفظ بيانات التسليم بنجاح' : 'تم تسليم المشروع بنجاح إلى لجنة التحكيم والإدارة',
          type: 'success'
        });
      }
    } catch {
      setMessage({ text: 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)' }}>
        جار التحميل والتحقق من حالة التسليم...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="container" style={{ maxWidth: '540px', paddingTop: '60px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--primary)' }}>
            صفحة تسليم المشاريع للفرق
          </h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '24px', fontSize: '0.92rem' }}>
            يرجى تسجيل الدخول بحساب فريقك المعتمد لتتمكن من تسليم الملف المطلوب وتعديل البيانات.
          </p>
          <Link href="/" className="btn btn-primary">
            الانتقال لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '780px', paddingTop: '36px', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', marginBottom: '8px' }}>
          <span className={`status-pill ${isSubmissionOpen ? 'open' : 'closed'}`}>
            <span className={`status-dot ${isSubmissionOpen ? 'green' : 'red'}`}></span>
            {isSubmissionOpen ? 'بوابة التسليم متاحة الآن' : 'بوابة التسليم مغلقة حالياً'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--primary)', marginBottom: '4px' }}>
          GREENOVATE HACKATHON
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', fontWeight: 600 }}>
          تسليم المشروع والمخرجات المطلوبة للفريق
        </p>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-info' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Submission Closed Alert - Zero Icons */}
      {!isSubmissionOpen && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <strong style={{ fontSize: '0.95rem' }}>
            تنبيه: بوابة التسليم مغلقة حالياً من قِبل إدارة الهاكاثون
          </strong>
          <span style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
            خانة التسليم والتعديل يتم فتحها وإغلاقها حصرياً من حساب الادمن. لا يمكنك إرسال تسليم جديد أو تعديل التسليم الحالي حتى يتم تفعيل البوابة.
          </span>
        </div>
      )}

      {/* Existing Submission Indicator - Zero Icons */}
      {existingSubmission && (
        <div style={{
          background: 'var(--beige-accent)',
          border: '1.5px solid var(--border-color)',
          borderRadius: '6px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '4px' }}>مسلَّم ومحفوظ</span>
            <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
              مشروع: {existingSubmission.projectTitle} (فريق: {existingSubmission.teamName})
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              تاريخ التسليم: {new Date(existingSubmission.updatedAt || existingSubmission.submittedAt).toLocaleString('ar-EG')}
            </div>
          </div>
          {isSubmissionOpen && (
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
              يمكنك تعديل أي بيانات بالأسفل وحفظ التغييرات
            </span>
          )}
        </div>
      )}

      {/* Focused Form */}
      <div className="card" style={{ padding: '32px 28px' }}>
        <form onSubmit={handleSubmit}>
          {/* 1. اسم التيم */}
          <div className="form-group">
            <label className="form-label">
              اسم التيم (الفريق) *
            </label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="مثال: فريق الرواد الأخضر"
              value={teamName} 
              onChange={e => setTeamName(e.target.value)} 
              disabled={!isSubmissionOpen}
              required 
            />
          </div>

          {/* 2. الاعضاء */}
          <div className="form-group">
            <label className="form-label">
              أعضاء التيم (اكتب أسماء أعضاء الفريق) *
            </label>
            <textarea 
              className="form-textarea" 
              style={{ minHeight: '75px' }}
              placeholder="مثال: أحمد خليل، سارة مصطفى، كريم صالح، عمر حسن"
              value={members} 
              onChange={e => setMembers(e.target.value)} 
              disabled={!isSubmissionOpen}
              required 
            />
            <span className="form-hint">يرجى كتابة أسماء جميع أعضاء الفريق المشاركين في المشروع</span>
          </div>

          {/* 3. اسم المشروع */}
          <div className="form-group">
            <label className="form-label">
              اسم / عنوان المشروع *
            </label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="مثال: نظام إدارة ومعالجة الانبعاثات الذكي"
              value={projectTitle} 
              onChange={e => setProjectTitle(e.target.value)} 
              disabled={!isSubmissionOpen}
              required 
            />
          </div>

          {/* 4. تسليم الملف المطلوب - Zero Icons */}
          <div className="form-group" style={{
            padding: '18px',
            background: 'var(--bg-body)',
            borderRadius: '6px',
            border: '1.5px solid var(--border-color)',
            marginTop: '8px'
          }}>
            <label className="form-label" style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--primary)', marginBottom: '4px' }}>
              تسليم الملف المطلوب للمشروع *
            </label>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
              يمكنك رفع الملف مباشرة من جهازك (PDF، عرض تقديمي، ملف مضغوط، مستند) أو وضع رابط الملف بالأسفل.
            </p>

            {/* Direct File Upload Input - Zero Icons */}
            <div style={{ marginBottom: '14px' }}>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={!isSubmissionOpen || isUploading}
                style={{ display: 'none' }}
                id="file-upload-input"
              />

              {!fileUrl ? (
                <label 
                  htmlFor="file-upload-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '22px 16px',
                    border: '2px dashed var(--primary)',
                    borderRadius: '6px',
                    cursor: isSubmissionOpen ? 'pointer' : 'not-allowed',
                    background: '#FFFFFF',
                    opacity: !isSubmissionOpen ? 0.6 : 1
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', fontSize: '0.95rem' }}>
                    {isUploading ? 'جار رفع الملف...' : 'اضغط هنا لرفع الملف المطلوب من جهازك'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    يدعم جميع أنواع الملفات (PDF, PPTX, ZIP, DOCX...)
                  </span>
                </label>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--primary-subtle)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>
                      {fileName || 'الملف المسلم'}
                    </div>
                    {fileSize > 0 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        الحجم: {formatBytes(fileSize)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <a 
                      href={fileUrl} 
                      download 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      تحميل ومعاينة الملف
                    </a>
                    {isSubmissionOpen && (
                      <button 
                        type="button" 
                        onClick={handleRemoveFile}
                        className="btn btn-danger btn-sm"
                      >
                        حذف وتغيير
                      </button>
                    )}
                  </div>
                </div>
              )}

              {uploadError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '6px', fontWeight: 600 }}>
                  {uploadError}
                </div>
              )}
            </div>

            {/* External File Link */}
            <div>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>
                أو رابط خارجي للملف / المشروع (Google Drive / GitHub / OneDrive):
              </label>
              <input 
                type="url" 
                className="form-control" 
                placeholder="https://drive.google.com/... أو https://github.com/..."
                value={fileLink} 
                onChange={e => setFileLink(e.target.value)} 
                disabled={!isSubmissionOpen}
              />
            </div>
          </div>

          {/* 5. نبذة عن المشروع */}
          <div className="form-group">
            <label className="form-label">نبذة أو ملخص عن فكرة المشروع والحل (اختياري)</label>
            <textarea 
              className="form-textarea" 
              style={{ minHeight: '80px' }}
              placeholder="اكتب شرحاً مختصراً لفكرة المشروع، ما هي المشكلة وكيف يعالجها الحل..."
              value={summary} 
              onChange={e => setSummary(e.target.value)} 
              disabled={!isSubmissionOpen}
            />
          </div>

          {/* 6. رابط التجربة / Demo */}
          <div className="form-group">
            <label className="form-label">رابط تجربة حي / Demo URL (اختياري)</label>
            <input 
              type="url" 
              className="form-control" 
              placeholder="https://my-demo-project.com"
              value={demoUrl} 
              onChange={e => setDemoUrl(e.target.value)} 
              disabled={!isSubmissionOpen}
            />
          </div>

          {/* Action Button */}
          <div style={{ marginTop: '24px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{
                width: '100%',
                height: '48px',
                fontSize: '1rem',
                fontWeight: 800,
                opacity: !isSubmissionOpen ? 0.6 : 1,
                cursor: !isSubmissionOpen ? 'not-allowed' : 'pointer'
              }}
              disabled={!isSubmissionOpen || isSubmitting || isUploading}
            >
              {isSubmitting 
                ? 'جار الحفظ والتسليم...' 
                : !isSubmissionOpen 
                  ? 'بوابة التسليم مغلقة حالياً من قبل الإدارة'
                  : existingSubmission 
                    ? 'حفظ وتحديث بيانات التسليم' 
                    : 'تسليم المشروع الآن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
