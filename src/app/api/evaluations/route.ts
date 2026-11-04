import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('evaluated_at', { ascending: false });

      if (error) throw error;

      const formatted: Evaluation[] = (data || []).map(e => ({
        id: e.id,
        submissionId: e.submission_id,
        teamId: e.team_id || '',
        judgeId: e.judge_id,
        judgeName: e.judge_name || 'حكم',
        scores: e.scores || {},
        totalScore: Number(e.total_score) || 0,
        feedback: e.feedback || '',
        evaluatedAt: e.evaluated_at,
      }));

      return NextResponse.json(formatted, { headers: noCacheHeaders });
    }

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

    let totalScore = 0;
    Object.values(scores).forEach(score => {
      totalScore += Number(score) || 0;
    });

    if (isSupabaseConfigured && supabase) {
      const { data: existing } = await supabase
        .from('evaluations')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('judge_id', judgeId)
        .maybeSingle();

      const evalId = existing?.id || `eval-${Date.now()}`;
      const payload = {
        id: evalId,
        submission_id: submissionId,
        team_id: teamId || '',
        judge_id: judgeId,
        judge_name: judgeName || 'حكم',
        scores,
        total_score: totalScore,
        feedback: feedback?.trim() || '',
        evaluated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('evaluations')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data, { status: existing ? 200 : 201, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const submission = db.submissions.find(s => s.id === submissionId);
    const resolvedTeamId = teamId || submission?.teamId || submission?.teamName || '';

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
