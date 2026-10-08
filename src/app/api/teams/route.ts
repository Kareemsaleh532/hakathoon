import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Team } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    // Enrich teams with members
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
    return NextResponse.json(teamsWithMembers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, maxMembers, track } = await request.json();

    if (!name || !maxMembers) {
      return NextResponse.json({ error: 'اسم الفريق والحد الأقصى للمشاركين مطلوبان' }, { status: 400 });
    }

    const db = getDatabase();
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      maxMembers: Number(maxMembers) || 4,
      track: track?.trim() || 'المسار العام للبيئة',
      createdAt: new Date().toISOString(),
    };

    db.teams.push(newTeam);
    saveDatabase(db);

    return NextResponse.json(newTeam, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف الفريق مطلوب' }, { status: 400 });
    }

    const db = getDatabase();
    db.teams = db.teams.filter(t => t.id !== id);
    // Unassign users with this teamId
    db.users = db.users.map(u => u.teamId === id ? { ...u, teamId: undefined } : u);
    saveDatabase(db);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
