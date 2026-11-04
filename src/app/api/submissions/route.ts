import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Submission } from '@/types';

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
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const formatted: Submission[] = (data || []).map(s => ({
        id: s.id,
        teamId: s.team_id || '',
        teamName: s.team_name,
        members: s.members,
        projectTitle: s.project_title,
        summary: s.summary || '',
        fileUrl: s.file_url || '',
        fileName: s.file_name || '',
        fileSize: Number(s.file_size) || 0,
        fileLink: s.file_link || '',
        challengeId: s.challenge_id || '',
        challengeTitle: s.challenge_title || '',
        environmentalImpact: s.environmental_impact || '',
        demoUrl: s.demo_url || '',
        repoUrl: s.repo_url || '',
        presentationUrl: s.presentation_url || '',
        submittedByUserId: s.submitted_by_user_id || '',
        submittedByUserName: s.submitted_by_user_name || '',
        submittedAt: s.submitted_at,
        updatedAt: s.updated_at,
      }));

      return NextResponse.json(formatted, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    return NextResponse.json(db.submissions, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const {
      userId,
      teamName,
      members,
      projectTitle,
      summary,
      fileUrl,
      fileName,
      fileSize,
      fileLink,
      demoUrl,
      repoUrl,
      presentationUrl,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً لتسليم المشروع' },
        { status: 401, headers: noCacheHeaders }
      );
    }

    if (!teamName || !members || !projectTitle) {
      return NextResponse.json(
        { error: 'اسم الفريق، أسماء الأعضاء، واسم المشروع حقول مطلوبة أساسية' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (!fileUrl && !fileLink && !repoUrl && !demoUrl) {
      return NextResponse.json(
        { error: 'يرجى إرفاق الملف المطلوب (رفع ملف أو وضع رابط الملف/المشروع)' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured && supabase) {
      // Check if submission is open
      const { data: settings } = await supabase
        .from('settings')
        .select('is_submission_open')
        .eq('id', 'app_settings')
        .maybeSingle();

      if (!settings?.is_submission_open) {
        return NextResponse.json(
          { error: 'بوابة التسليم مغلقة حالياً من قبل إدارة الهاكاثون.' },
          { status: 403, headers: noCacheHeaders }
        );
      }

      // Check user
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!user) {
        return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers: noCacheHeaders });
      }

      // Find existing submission
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .or(`submitted_by_user_id.eq.${userId},team_name.ilike.${teamName.trim()}`)
        .maybeSingle();

      const subId = existing?.id || `sub-${Date.now()}`;
      const payload = {
        id: subId,
        team_name: teamName.trim(),
        members: members.trim(),
        project_title: projectTitle.trim(),
        summary: summary?.trim() || '',
        file_url: fileUrl || '',
        file_name: fileName || '',
        file_size: fileSize || 0,
        file_link: fileLink?.trim() || '',
        demo_url: demoUrl?.trim() || '',
        repo_url: repoUrl?.trim() || '',
        presentation_url: presentationUrl?.trim() || '',
        submitted_by_user_id: user.id,
        submitted_by_user_name: user.name,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('submissions')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data, { status: existing ? 200 : 201, headers: noCacheHeaders });
    }

    const db = getDatabase();

    if (!db.settings.isSubmissionOpen) {
      return NextResponse.json(
        { error: 'بوابة التسليم مغلقة حالياً من قبل إدارة الهاكاثون.' },
        { status: 403, headers: noCacheHeaders }
      );
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const existingIndex = db.submissions.findIndex(
      s => s.submittedByUserId === userId || (s.teamName && s.teamName.trim().toLowerCase() === teamName.trim().toLowerCase())
    );

    if (existingIndex >= 0) {
      const existing = db.submissions[existingIndex];
      const updated: Submission = {
        ...existing,
        teamName: teamName.trim(),
        members: members.trim(),
        projectTitle: projectTitle.trim(),
        summary: summary?.trim() || '',
        fileUrl: fileUrl || existing.fileUrl || '',
        fileName: fileName || existing.fileName || '',
        fileSize: fileSize !== undefined ? fileSize : existing.fileSize,
        fileLink: fileLink?.trim() || '',
        demoUrl: demoUrl?.trim() || '',
        repoUrl: repoUrl?.trim() || '',
        presentationUrl: presentationUrl?.trim() || '',
        submittedByUserId: user.id,
        submittedByUserName: user.name,
        updatedAt: new Date().toISOString(),
      };

      db.submissions[existingIndex] = updated;
      saveDatabase(db);
      return NextResponse.json(updated, { headers: noCacheHeaders });
    } else {
      const newSubmission: Submission = {
        id: `sub-${Date.now()}`,
        teamName: teamName.trim(),
        members: members.trim(),
        projectTitle: projectTitle.trim(),
        summary: summary?.trim() || '',
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        fileSize: fileSize || 0,
        fileLink: fileLink?.trim() || '',
        demoUrl: demoUrl?.trim() || '',
        repoUrl: repoUrl?.trim() || '',
        presentationUrl: presentationUrl?.trim() || '',
        submittedByUserId: user.id,
        submittedByUserName: user.name,
        submittedAt: new Date().toISOString(),
      };

      db.submissions.push(newSubmission);
      saveDatabase(db);
      return NextResponse.json(newSubmission, { status: 201, headers: noCacheHeaders });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'معرف التسليم مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    db.submissions = db.submissions.filter(s => s.id !== id);
    db.evaluations = db.evaluations.filter(e => e.submissionId !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
