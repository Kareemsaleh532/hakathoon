import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Submission } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json(db.submissions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDatabase();

    // Check if submission is open
    if (!db.settings.isSubmissionOpen) {
      return NextResponse.json(
        { error: 'بوابة التسليم مغلقة حالياً من قبل إدارة الهاكاثون.' },
        { status: 403 }
      );
    }

    const {
      userId,
      challengeId,
      projectTitle,
      summary,
      environmentalImpact,
      demoUrl,
      repoUrl,
      presentationUrl,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول لتسليم المشروع' },
        { status: 401 }
      );
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    if (user.role !== 'participant') {
      return NextResponse.json(
        { error: 'التسليم متاح فقط للمتسابقين' },
        { status: 403 }
      );
    }

    if (!user.teamId) {
      return NextResponse.json(
        { error: 'حسابك غير مرتبط بفريق. يرجى الانضمام إلى فريق أولاً' },
        { status: 400 }
      );
    }

    const team = db.teams.find(t => t.id === user.teamId);
    const teamId = user.teamId;
    const teamName = team ? team.name : 'فريق غير محدد';

    if (!projectTitle || !summary || !challengeId) {
      return NextResponse.json(
        { error: 'اسم المشروع والتحدي وملخص الحل حقول مطلوبة' },
        { status: 400 }
      );
    }

    const challenge = db.challenges.find(c => c.id === challengeId);
    const challengeTitle = challenge ? challenge.title : 'تحدي عام';

    // Check if existing submission for this team
    const existingIndex = db.submissions.findIndex(s => s.teamId === teamId);

    if (existingIndex >= 0) {
      // Update submission
      const updated: Submission = {
        ...db.submissions[existingIndex],
        challengeId,
        challengeTitle,
        projectTitle: projectTitle.trim(),
        summary: summary.trim(),
        environmentalImpact: environmentalImpact?.trim() || '',
        demoUrl: demoUrl?.trim() || '',
        repoUrl: repoUrl?.trim() || '',
        presentationUrl: presentationUrl?.trim() || '',
        submittedByUserId: user.id,
        submittedByUserName: user.name,
        updatedAt: new Date().toISOString(),
      };
      db.submissions[existingIndex] = updated;
      saveDatabase(db);
      return NextResponse.json(updated);
    } else {
      // New submission
      const newSubmission: Submission = {
        id: `sub-${Date.now()}`,
        teamId,
        teamName,
        challengeId,
        challengeTitle,
        projectTitle: projectTitle.trim(),
        summary: summary.trim(),
        environmentalImpact: environmentalImpact?.trim() || '',
        demoUrl: demoUrl?.trim() || '',
        repoUrl: repoUrl?.trim() || '',
        presentationUrl: presentationUrl?.trim() || '',
        submittedByUserId: user.id,
        submittedByUserName: user.name,
        submittedAt: new Date().toISOString(),
      };
      db.submissions.push(newSubmission);
      saveDatabase(db);
      return NextResponse.json(newSubmission, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
