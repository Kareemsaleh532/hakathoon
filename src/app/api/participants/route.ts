import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';

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
    const participants = db.users
      .filter(u => u.role === 'participant')
      .map(({ password: _, ...safe }) => {
        const team = db.teams.find(t => t.id === safe.teamId);
        return {
          ...safe,
          teamName: team ? team.name : 'بدون فريق',
        };
      });

    return NextResponse.json(participants, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المتسابق مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const index = db.users.findIndex(u => u.id === id && u.role === 'participant');

    if (index === -1) {
      return NextResponse.json({ error: 'المتسابق غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    db.users.splice(index, 1);
    saveDatabase(db);

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
