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
        { status: 401 }
      );
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (!teamName || !members || !projectTitle) {
      return NextResponse.json(
        { error: 'اسم الفريق، أسماء الأعضاء، واسم المشروع حقول مطلوبة أساسية' },
        { status: 400 }
      );
    }

    // Require either an uploaded file or a file link
    if (!fileUrl && !fileLink && !repoUrl && !demoUrl) {
      return NextResponse.json(
        { error: 'يرجى إرفاق الملف المطلوب (رفع ملف أو وضع رابط الملف/المشروع)' },
        { status: 400 }
      );
    }

    // Check if existing submission for this user or team
    const existingIndex = db.submissions.findIndex(
      s => s.submittedByUserId === userId || (s.teamName && s.teamName.trim().toLowerCase() === teamName.trim().toLowerCase())
    );

    if (existingIndex >= 0) {
      // Update existing submission
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
      return NextResponse.json(updated);
    } else {
      // Create new submission
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
      return NextResponse.json(newSubmission, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف التسليم مطلوب' }, { status: 400 });
    }

    const db = getDatabase();
    const index = db.submissions.findIndex(s => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'التسليم غير موجود' }, { status: 404 });
    }

    db.submissions.splice(index, 1);
    // Also remove related evaluations
    db.evaluations = db.evaluations.filter(e => e.submissionId !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
