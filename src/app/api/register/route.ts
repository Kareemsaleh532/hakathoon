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

export async function POST(request: Request) {
  try {
    const { name, email, password, phone, specialty, teamId } = await request.json();

    if (!name || !email || !password || !teamId) {
      return NextResponse.json(
        { error: 'يرجى استكمال جميع الحقول المطلوبة بما في ذلك اختيار الفريق' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const db = getDatabase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل' }, { status: 409, headers: noCacheHeaders });
    }

    // Check if team exists
    const team = db.teams.find(t => t.id === teamId);
    if (!team) {
      return NextResponse.json({ error: 'الفريق المحدد غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const maxLimit = team.maxMembers ?? 10;
    // Check team capacity
    const currentTeamMembers = db.users.filter(u => u.teamId === teamId);
    if (currentTeamMembers.length >= maxLimit) {
      return NextResponse.json({ error: `الفريق مكتمل! الحد الأقصى للأعضاء هو ${maxLimit}` }, { status: 400, headers: noCacheHeaders });
    }

    const newUser: User & { password?: string } = {
      id: `part-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: 'participant',
      phone: phone?.trim() || '',
      specialty: specialty?.trim() || 'مشارك',
      teamId: team.id,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);

    const { password: _, ...userSafe } = newUser;
    return NextResponse.json({ user: userSafe, team }, { status: 201, headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ أثناء التسجيل' }, { status: 500, headers: noCacheHeaders });
  }
}
