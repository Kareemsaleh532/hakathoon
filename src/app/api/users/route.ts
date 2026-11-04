import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        phone: u.phone || '',
        specialty: u.specialty || '',
        teamId: u.team_id || '',
        createdAt: u.created_at,
      }));

      return NextResponse.json(formatted, { headers: noCacheHeaders });
    }

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

    const newUserId = `${assignedRole}-${Date.now()}`;
    const cleanName = name.trim();
    const cleanPass = password.trim();
    const cleanSpecialty = specialty?.trim() || (assignedRole === 'judge' ? 'محكم' : assignedRole === 'participant' ? 'فريق مشارك' : 'إدارة');

    if (isSupabaseConfigured && supabase) {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً' }, { status: 409, headers: noCacheHeaders });
      }

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          name: cleanName,
          email: normalizedEmail,
          password: cleanPass,
          role: assignedRole,
          specialty: cleanSpecialty,
        })
        .select()
        .single();

      if (error) throw error;

      const created: User & { password?: string } = {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        specialty: data.specialty,
        createdAt: data.created_at,
      };

      return NextResponse.json(created, { status: 201, headers: noCacheHeaders });
    }

    const db = getDatabase();

    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً' }, { status: 409, headers: noCacheHeaders });
    }

    const newUser: User & { password?: string } = {
      id: newUserId,
      name: cleanName,
      email: normalizedEmail,
      password: cleanPass,
      role: assignedRole,
      specialty: cleanSpecialty,
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

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const assignedRole = role === 'team' ? 'participant' : role;

    if (id === 'admin-1' && assignedRole && assignedRole !== 'admin') {
      return NextResponse.json({ error: 'لا يمكن تغيير دور حساب الإدارة الرئيسي' }, { status: 403, headers: noCacheHeaders });
    }

    if (isSupabaseConfigured && supabase) {
      // Check conflict
      const { data: conflict } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .neq('id', id)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json({ error: 'البريد الإلكتروني مستخدم لحساب آخر' }, { status: 409, headers: noCacheHeaders });
      }

      const updatePayload: any = {
        name: cleanName,
        email: normalizedEmail,
      };
      if (password) updatePayload.password = String(password).trim();
      if (assignedRole) updatePayload.role = assignedRole;
      if (specialty !== undefined) updatePayload.specialty = String(specialty).trim();

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        specialty: data.specialty,
        createdAt: data.created_at,
      }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const emailConflict = db.users.some(u => u.id !== id && u.email.toLowerCase() === normalizedEmail);
    if (emailConflict) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم لحساب آخر' }, { status: 409, headers: noCacheHeaders });
    }

    const existingUser = db.users[userIndex];
    const roleToAssign = assignedRole || existingUser.role;

    const updatedUser: User & { password?: string } = {
      ...existingUser,
      name: cleanName,
      email: normalizedEmail,
      password: password !== undefined && password !== null ? String(password).trim() : existingUser.password,
      role: roleToAssign,
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
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    if (id === 'admin-1') {
      return NextResponse.json({ error: 'لا يمكن حذف حساب الإدارة الرئيسي' }, { status: 403, headers: noCacheHeaders });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const deletedUser = db.users[userIndex];
    db.users.splice(userIndex, 1);

    if (deletedUser.role === 'judge') {
      db.evaluations = db.evaluations.filter(e => e.judgeId !== id);
    }

    if (deletedUser.role === 'participant') {
      const userSubs = db.submissions.filter(s => s.submittedByUserId === id);
      const subIds = new Set(userSubs.map(s => s.id));
      db.submissions = db.submissions.filter(s => s.submittedByUserId !== id);
      db.evaluations = db.evaluations.filter(e => !subIds.has(e.submissionId));
    }

    saveDatabase(db);

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
