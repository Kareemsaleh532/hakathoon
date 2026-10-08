import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Evaluation } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json(db.evaluations);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { submissionId, teamId, judgeId, judgeName, scores, feedback } = await request.json();

    if (!submissionId || !teamId || !judgeId || !scores) {
      return NextResponse.json({ error: 'بيانات التقييم غير مكتملة' }, { status: 400 });
    }

    const db = getDatabase();

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
        scores,
        totalScore,
        feedback: feedback?.trim() || '',
        evaluatedAt: new Date().toISOString(),
      };
      db.evaluations[existingIndex] = updated;
      saveDatabase(db);
      return NextResponse.json(updated);
    } else {
      const newEvaluation: Evaluation = {
        id: `eval-${Date.now()}`,
        submissionId,
        teamId,
        judgeId,
        judgeName: judgeName || 'حكم',
        scores,
        totalScore,
        feedback: feedback?.trim() || '',
        evaluatedAt: new Date().toISOString(),
      };
      db.evaluations.push(newEvaluation);
      saveDatabase(db);
      return NextResponse.json(newEvaluation, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
