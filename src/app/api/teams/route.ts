import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Team } from '@/types';

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
      const [{ data: teams, error: teamsErr }, { data: users, error: usersErr }] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('users').select('id, name, email, role, team_id')
      ]);

      if (teamsErr) throw teamsErr;

      const teamsWithMembers = (teams || []).map(t => {
        const members = (users || []).filter(u => u.team_id === t.id);
        return {
          id: t.id,
          name: t.name,
          description: t.description || '',
          maxMembers: Number(t.max_members) || 4,
          track: t.track || 'المسار العام للبيئة',
          createdAt: t.created_at,
          membersCount: members.length,
          members,
        };
      });

      return NextResponse.json(teamsWithMembers, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    const teamsWithMembers = db.teams.map(team => {
      const members = db.users
        .filter(u => u.teamId === team.id)
        .map(({ password: _, ...safe }) => safe);
      return {
        ...team,
        membersCount: members.length,
        members,
      };
    });
    return NextResponse.json(teamsWithMembers, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, maxMembers, track } = await request.json();

    if (!name || !maxMembers) {
      return NextResponse.json({ error: 'اسم الفريق والحد الأقصى للمشاركين مطلوبان' }, { status: 400, headers: noCacheHeaders });
    }

    const newTeamId = `team-${Date.now()}`;
    const cleanName = name.trim();
    const cleanDesc = description?.trim() || '';
    const numMax = Number(maxMembers) || 4;
    const cleanTrack = track?.trim() || 'المسار العام للبيئة';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          id: newTeamId,
          name: cleanName,
          description: cleanDesc,
          max_members: numMax,
          track: cleanTrack,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data, { status: 201, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const newTeam: Team = {
      id: newTeamId,
      name: cleanName,
      description: cleanDesc,
      maxMembers: numMax,
      track: cleanTrack,
      createdAt: new Date().toISOString(),
    };

    db.teams.push(newTeam);
    saveDatabase(db);

    return NextResponse.json(newTeam, { status: 201, headers: noCacheHeaders });
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
      return NextResponse.json({ error: 'معرف الفريق مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').update({ team_id: '' }).eq('team_id', id);
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    db.teams = db.teams.filter(t => t.id !== id);
    db.users = db.users.map(u => u.teamId === id ? { ...u, teamId: undefined } : u);
    saveDatabase(db);

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
