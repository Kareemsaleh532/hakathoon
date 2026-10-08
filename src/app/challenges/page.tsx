'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Challenge } from '@/types';

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await fetch('/api/challenges');
        if (res.ok) {
          const data = await res.json();
          setChallenges(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  // Unique tracks
  const tracks = ['all', ...Array.from(new Set(challenges.map(c => c.track)))];

  // Filtered challenges
  const filtered = challenges.filter(c => {
    return selectedTrack === 'all' || c.track === selectedTrack;
  });

  return (
    <div className="container" style={{ paddingTop: '30px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: 800, marginBottom: '6px', color: '#ffffff' }}>
          صفحة التحديات البيئية والمناخية
        </h1>
        <p style={{ color: 'var(--text-dim)', maxWidth: '650px', margin: '0 auto' }}>
          تحديات واقعية معتمدة من قبل إدارة الهاكاثون لتطوير حلول برمجية مستدامة
        </p>
      </div>

      {/* Track Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-dim)' }}>
            المسار:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tracks.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTrack(t)}
                className={`btn btn-sm ${selectedTrack === t ? 'btn-primary' : 'btn-outline'}`}
              >
                {t === 'all' ? 'جميع المسارات' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Challenges List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          جار تحميل التحديات...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid-2">
          {filtered.map(ch => (
            <div key={ch.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <span className="badge badge-emerald">{ch.track}</span>
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                  {ch.title}
                </h2>

                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '14px' }}>
                  {ch.description}
                </p>

                {ch.targetImpact && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontWeight: 600, color: '#22c55e', fontSize: '0.82rem', marginBottom: '2px' }}>
                      الأثر المستهدف:
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>
                      {ch.targetImpact}
                    </div>
                  </div>
                )}

                {ch.deliverables && ch.deliverables.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                      المخرجات المتوقعة:
                    </div>
                    <ul style={{ paddingRight: '20px', fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                      {ch.deliverables.map((deliv, idx) => (
                        <li key={idx}>{deliv}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action button: only show direct link to submit for participants */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-color)', marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  إدارة الهاكاثون
                </span>
                {user?.role === 'participant' ? (
                  <Link href={`/submit?challengeId=${ch.id}`} className="btn btn-primary btn-sm">
                    تقديم حل لهذا التحدي
                  </Link>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    التسليم متاح للمتسابقين المسجلين
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: '12px' }}>
            لا توجد تحديات مطابقة للفلتر المحدد.
          </p>
          <button onClick={() => setSelectedTrack('all')} className="btn btn-secondary btn-sm">
            عرض جميع المسارات
          </button>
        </div>
      )}
    </div>
  );
}
