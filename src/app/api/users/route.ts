import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { User } from '@/types';

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
    return NextResponse.json(db.users, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password, role, specialty } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (الاسم، البريد الإلكتروني، كلمة المرور، والدور)' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validRoles = ['admin', 'judge', 'participant'];
    const assignedRole = role === 'team' ? 'participant' : role;

    if (!validRoles.includes(assignedRole)) {
      return NextResponse.json({ error: 'الدور المحدد غير صالح' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();

    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً' }, { status: 409, headers: noCacheHeaders });
    }

    const newUser: User & { password?: string } = {
      id: `${assignedRole}-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(),
      role: assignedRole,
      specialty: specialty?.trim() || (assignedRole === 'judge' ? 'محكم' : assignedRole === 'participant' ? 'فريق مشارك' : 'إدارة'),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);

    return NextResponse.json(newUser, { status: 201, headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, email, password, role, specialty } = await request.json();

    if (!id || !name || !email) {
      return NextResponse.json({ error: 'معرف المستخدم والاسم والبريد حقول مطلوبة' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if new email conflicts with another user
    const emailConflict = db.users.some(u => u.id !== id && u.email.toLowerCase() === normalizedEmail);
    if (emailConflict) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم لحساب آخر' }, { status: 409, headers: noCacheHeaders });
    }

    const existingUser = db.users[userIndex];
    const assignedRole = role === 'team' ? 'participant' : (role || existingUser.role);

    // If main admin, cannot change role to non-admin
    if (id === 'admin-1' && assignedRole !== 'admin') {
      return NextResponse.json({ error: 'لا يمكن تغيير دور حساب الإدارة الرئيسي' }, { status: 403, headers: noCacheHeaders });
    }

    const updatedUser: User & { password?: string } = {
      ...existingUser,
      name: name.trim(),
      email: normalizedEmail,
      password: password !== undefined && password !== null ? String(password).trim() : existingUser.password,
      role: assignedRole,
      specialty: specialty !== undefined ? String(specialty).trim() : existingUser.specialty,
    };

    db.users[userIndex] = updatedUser;
    saveDatabase(db);

    return NextResponse.json(updatedUser, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    if (id === 'admin-1') {
      return NextResponse.json({ error: 'لا يمكن حذف حساب الإدارة الرئيسي' }, { status: 403, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const deletedUser = db.users[userIndex];
    db.users.splice(userIndex, 1);

    // If judge was deleted, remove their evaluations
    if (deletedUser.role === 'judge') {
      db.evaluations = db.evaluations.filter(e => e.judgeId !== id);
    }

    // If participant was deleted, also remove their submissions and linked evaluations
    if (deletedUser.role === 'participant') {
      const userSubs = db.submissions.filter(s => s.submittedByUserId === id);
      const subIds = new Set(userSubs.map(s => s.id));
      db.submissions = db.submissions.filter(s => s.submittedByUserId !== id);
      db.evaluations = db.evaluations.filter(e => !subIds.has(e.submissionId));
    }

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      deletedId: id,
      remainingCount: db.users.length
    }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
