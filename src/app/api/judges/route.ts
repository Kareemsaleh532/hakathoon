import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { User } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    const judges = db.users
      .filter(u => u.role === 'judge')
      .map(({ password: _, ...safe }) => safe);
    return NextResponse.json(judges);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password, specialty } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' }, { status: 400 });
    }

    const db = getDatabase();
    const normalizedEmail = email.trim().toLowerCase();

    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل' }, { status: 409 });
    }

    const newJudge: User & { password?: string } = {
      id: `judge-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: 'judge',
      specialty: specialty?.trim() || 'محكم بيئي وتقني',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newJudge);
    saveDatabase(db);

    const { password: _, ...safe } = newJudge;
    return NextResponse.json(safe, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الحكم مطلوب' }, { status: 400 });
    }

    const db = getDatabase();
    const index = db.users.findIndex(u => u.id === id && u.role === 'judge');

    if (index === -1) {
      return NextResponse.json({ error: 'الحكم غير موجود' }, { status: 404 });
    }

    db.users.splice(index, 1);
    // Also remove evaluations by this judge
    db.evaluations = db.evaluations.filter(e => e.judgeId !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
