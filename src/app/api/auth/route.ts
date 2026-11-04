import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }, { status: 400, headers: noCacheHeaders });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('password', password)
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        return NextResponse.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, { status: 401, headers: noCacheHeaders });
      }

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          specialty: user.specialty,
          teamId: user.team_id,
          createdAt: user.created_at,
        }
      }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);

    if (!user) {
      return NextResponse.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, { status: 401, headers: noCacheHeaders });
    }

    const { password: _, ...userSafe } = user;
    return NextResponse.json({ user: userSafe }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في الخادم' }, { status: 500, headers: noCacheHeaders });
  }
}
