import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Evaluation } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json(db.evaluations, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { submissionId, teamId, judgeId, judgeName, scores, feedback } = await request.json();

    if (!submissionId || !judgeId || !scores) {
      return NextResponse.json({ error: 'بيانات التقييم غير مكتملة' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const submission = db.submissions.find(s => s.id === submissionId);
    const resolvedTeamId = teamId || submission?.teamId || submission?.teamName || '';

    // Calculate total score based on the scores
    let totalScore = 0;
    Object.values(scores).forEach(score => {
      totalScore += Number(score) || 0;
    });

    const existingIndex = db.evaluations.findIndex(
      e => e.submissionId === submissionId && e.judgeId === judgeId
    );

    if (existingIndex >= 0) {
      const updated: Evaluation = {
        ...db.evaluations[existingIndex],
        teamId: resolvedTeamId,
        scores,
        totalScore,
        feedback: feedback?.trim() || '',
        evaluatedAt: new Date().toISOString(),
      };
      db.evaluations[existingIndex] = updated;
      saveDatabase(db);
      return NextResponse.json(updated, { headers: noCacheHeaders });
    } else {
      const newEvaluation: Evaluation = {
        id: `eval-${Date.now()}`,
        submissionId,
        teamId: resolvedTeamId,
        judgeId,
        judgeName: judgeName || 'حكم',
        scores,
        totalScore,
        feedback: feedback?.trim() || '',
        evaluatedAt: new Date().toISOString(),
      };
      db.evaluations.push(newEvaluation);
      saveDatabase(db);
      return NextResponse.json(newEvaluation, { status: 201, headers: noCacheHeaders });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
