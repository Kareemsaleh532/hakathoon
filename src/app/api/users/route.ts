import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { User } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    // Return all users including their role and password for admin management
    return NextResponse.json(db.users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password, role, specialty } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (الاسم، البريد الإلكتروني، كلمة المرور، والدور)' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validRoles = ['admin', 'judge', 'participant'];
    const assignedRole = role === 'team' ? 'participant' : role;

    if (!validRoles.includes(assignedRole)) {
      return NextResponse.json({ error: 'الدور المحدد غير صالح' }, { status: 400 });
    }

    const db = getDatabase();

    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً' }, { status: 409 });
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

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    if (id === 'admin-1') {
      return NextResponse.json({ error: 'لا يمكن حذف حساب الإدارة الرئيسي' }, { status: 403 });
    }

    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const deletedUser = db.users[userIndex];
    db.users.splice(userIndex, 1);

    // If judge was deleted, remove their evaluations
    if (deletedUser.role === 'judge') {
      db.evaluations = db.evaluations.filter(e => e.judgeId !== id);
    }

    saveDatabase(db);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
